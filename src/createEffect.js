import {tryGetPropValue} from './mock';
import {
  unset,
  createLatest,
  createObservable,
  isIteratorLike,
  noop,
  loadableStates,
  isPromiseLike,
  isPlainObject,
  createDebounce,
  createThrottle,
  isCancellable,
  objectTypes,
  isStateOrEffect,
  mockingScope,
} from './utils';
import createLoadable from './createLoadable';

export default function createEffect(
  body = noop,
  {displayName, debounce = unset, throttle = unset, latest} = {},
) {
  const loadable = createLoadable();
  const wrappedInstance = latest
    ? createLatest(instance)
    : debounce !== unset && debounce !== null && debounce !== false
    ? createDebounce(instance, debounce)
    : throttle !== unset && throttle !== null && throttle !== false
    ? createThrottle(instance, throttle)
    : instance;
  const onCall = createObservable();
  const onLoadingChange = createObservable();
  let currentContext;

  function instance(payload) {
    const context = (currentContext = createContext());
    let isAsync = false;
    let hasError = false;
    let mockBody = body;
    if (process.env.NODE_ENV !== 'production') {
      const mockingContext = mockingScope();
      if (mockingContext) {
        const mockInstance = mockingContext.get(wrappedInstance);
        if (mockInstance && 'body' in mockInstance.props) {
          mockBody = mockInstance.props.body;
        }
      }
    }
    let result = mockBody(...arguments);
    let isResolvedPromise = false;

    if (typeof result === 'function') {
      result = result(context);
    }

    if (isIteratorLike(result)) {
      result = handleIterator(context, result);
    }

    try {
      if (isPromiseLike(result)) {
        isAsync = true;
        const originalCancel = result.cancel;
        if (originalCancel) {
          context.onCancel(originalCancel);
        }
        const wrappedPromise = Object.assign(
          result.then(
            (asyncResult) => {
              isResolvedPromise = true;
              if (loadable.promise !== wrappedPromise) {
                return asyncResult;
              }
              try {
                onCall.dispatch(payload);
              } finally {
                context.dispose();
              }

              loadable.set(loadableStates.hasValue, asyncResult);
              return asyncResult;
            },
            (e) => {
              if (loadable.promise !== wrappedPromise) {
                return e;
              }
              loadable.set(loadableStates.hasError, e);
              return e;
            },
          ),
          {
            cancel: context.cancel,
          },
        );
        loadable.promise = wrappedPromise;
        return wrappedPromise;
      }
      return result;
    } catch (e) {
      hasError = true;
      loadable.set(loadableStates.hasError, e);
    } finally {
      try {
        if (!isAsync) {
          onCall.dispatch(payload);
          if (!hasError) {
            loadable.set(loadableStates.hasValue, result);
          }
        } else if (!isResolvedPromise) {
          loadable.set(loadableStates.loading);
        }
      } finally {
        !isAsync && context.dispose();
      }
    }
  }

  function cancel() {
    if (currentContext) {
      currentContext.cancel();
    }
  }

  Object.defineProperties(wrappedInstance, {
    loading: {
      get() {
        // noinspection DuplicatedCode
        if (process.env.NODE_ENV !== 'production') {
          const mockResult = tryGetPropValue(wrappedInstance, 'loading');
          if (mockResult.success) {
            return mockResult.value;
          }
        }

        return loadable.get().state === loadableStates.loading;
      },
    },
    result: {
      get() {
        return loadable.get().value;
      },
    },
    called: {
      get() {
        let removeListener;
        return Object.assign(
          new Promise((resolve) => {
            removeListener = onCall.subscribeOnce(resolve);
          }),
          {
            cancel() {
              removeListener && removeListener();
            },
          },
        );
      },
    },
  });

  loadable.onChange(onLoadingChange.dispatch);

  if (process.env.NODE_ENV !== 'production') {
    wrappedInstance.mockApi = {
      onCall: onCall.dispatch,
      onLoadingChange: onLoadingChange.dispatch,
    };
  }

  return Object.assign(wrappedInstance, {
    type: objectTypes.effect,
    displayName,
    onCall: onCall.subscribe,
    onLoadingChange: onLoadingChange.subscribe,
    cancel,
    onDone(callback) {
      return onCall.subscribe(callback);
    },
  });
}

function createContext(props, target, parent) {
  const onDispose = createObservable();
  const onCancel = createObservable();
  let isCancelled = false;
  let isDisposed = false;

  function dispose() {
    if (isDisposed) {
      return;
    }
    isDisposed = true;
    try {
      onDispose.dispatch();
    } finally {
      onDispose.clear();
      onCancel.clear();
    }
  }

  const context = {
    ...props,
    onDispose: onDispose.subscribe,
    onCancel: onCancel.subscribe,
    isCancelled() {
      return isCancelled || (parent && parent.isCancelled());
    },
    dispose,
    cancel() {
      if (isCancelled) {
        return;
      }
      isCancelled = true;
      try {
        onCancel.dispatch(target);
      } finally {
        dispose();
      }
    },
    createChild(props) {
      const child = createContext(props, target, context);
      onDispose.subscribe(child.dispose);
      onCancel.subscribe(child.cancel);
      return child;
    },
  };

  return context;
}

function handleIterator(context, iterator) {
  function next(iterator, previous) {
    if (context.isCancelled()) {
      return;
    }
    const result = iterator.next(previous);
    // async generator
    if (isPromiseLike(result)) {
      throw new Error(
        'Async generator is not supported. If you want to use await fetch(), please use yield fetch() instead',
      );
    }

    if (result.done) {
      return;
    }

    let isDone = false;
    let doneValue = undefined;
    let doneResolve = undefined;
    let isAsync = false;

    function onDone(value) {
      isDone = true;
      doneValue = value;
      if (isAsync) {
        const result = next(iterator, value);
        if (isPromiseLike(result)) {
          result.then((value) => {
            doneResolve(value);
          });
          return;
        }
      }
      doneResolve && doneResolve(value);
    }
    let childContext = context.createChild();
    // try execute awaiter in synchronous mode
    handleYield(childContext, result.value, onDone);

    // still not done ? so it is async thread
    if (isDone) {
      return next(iterator, doneValue);
    }
    isAsync = true;
    // start async mode
    return Object.assign(
      new Promise((resolve) => {
        doneResolve = resolve;
      }),
      {
        cancel() {
          childContext.cancel();
        },
      },
    );
  }

  return next(iterator);
}

function handleYield(context, value, callback) {
  if (Array.isArray(value)) {
    // yield [[state1, state2, state3]]
    if (value.length === 1 && Array.isArray(value[0])) {
      handleAsyncChain(context, value[0], callback);
    } else {
      // yield [ state1, state2, state3 ]
      handleAsyncAll(context, value, callback);
    }
  } else if (isPlainObject(value)) {
    // yield { state1, state2, state3 }
    handleAsyncRace(context, Object.entries(value), callback);
  } else {
    handleAsyncAll(context, [value], (values) => callback(values[0]));
  }
}

function addListener(context, value, callback) {
  if (isPromiseLike(value)) {
    if (isCancellable(value)) {
      context.onCancel(value.cancel);
    }
    value.then((result) => {
      if (context.isCancelled()) {
        return;
      }
      callback(result);
    }, context.cancel);
  } else if (isStateOrEffect(value)) {
    const removeListener = value.onDone((result) => {
      if (context.isCancelled()) {
        return;
      }
      callback(result);
    });
    context.onCancel(removeListener);
  } else if (typeof value === 'function') {
    addListener(context, value(), callback);
  } else {
    // callback(value);
  }
}

function handleAsyncRace(parentContext, targetEntries, callback) {
  const context = createContext();
  parentContext.onDispose(context.cancel);
  const result = {};
  targetEntries.forEach(([key, item]) => {
    addListener(context, item, (value) => {
      try {
        result[key] = true;
        result.$target = item;
        result.$key = key;
        result.$value = value;
        callback(result);
      } finally {
        context.cancel();
      }
    });
  });
}

function handleAsyncAll(parentContext, targets, callback) {
  let doneCount = 0;
  const results = [];
  const context = createContext();

  parentContext.onDispose(context.cancel);

  targets.forEach((item, index) => {
    addListener(context, item, (value) => {
      doneCount++;
      results[index] = value;
      // everything done
      if (doneCount >= targets.length) {
        try {
          callback(results);
        } finally {
          context.cancel();
        }
      }
    });
  });
}

function handleAsyncChain(parentContext, targets, callback) {
  let chainIndex = 0;
  const results = [];
  const context = createContext();

  parentContext.onDispose(context.cancel);

  new Set(targets).forEach((item) => {
    addListener(context, item, (value) => {
      // reset chain index if it is wrong order
      if (targets[chainIndex] !== item) {
        return;
      }
      results.push(value);
      chainIndex++;
      // end of chain
      if (results.length === targets.length) {
        try {
          callback(results);
        } finally {
          context.cancel();
        }
      }
    });
  });
}
