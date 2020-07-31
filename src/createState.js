import createArrayKeyedMap from './createArrayKeyedMap';
import {
  createObservable,
  ErrorWrapper,
  isPromiseLike,
  loadableStates,
  unset,
  evaluationScope,
  noop,
  createDebounce,
  createThrottle,
} from './utils';
import createLoadable from './createLoadable';
import StateBase from './StateBase';

export default function createState(
  initial,
  {displayName, default: defaultValue, args, debounce, throttle} = {},
) {
  let currentValue = unset;
  let currentError;
  let promiseWorker;
  let workerToken;
  let loading = false;
  let isDirty = false;
  let isNotifying = false;
  const dependencies = new Set();
  const loadable = createLoadable();
  const onLoadingChange = createObservable();
  const onChange = createObservable();
  const reducers = [];
  const wrappedSetValue =
    debounce !== unset && debounce !== null && debounce !== false
      ? createDebounce(setValue, debounce)
      : throttle !== unset && throttle !== null && throttle !== false
      ? createThrottle(setValue, throttle)
      : setValue;
  // notify loading change can be async, so we make debounced wrapper for it to avoid multiple call at time
  const wrappedNotifyLoadingChange = createDebounce(notifyLoadingChange, 0);
  const instance = new StateBase({
    displayName,
    onChange: onChange.subscribe,
    onLoadingChange: onLoadingChange.subscribe,
    onReady,
    mutate: setValue,
    reset,
    eval: getValue,
  });

  function getValue() {
    if (currentValue !== unset) {
      return currentValue;
    }

    if (typeof initial === 'function') {
      currentValue = defaultValue;
      evaluationScope({setParent}, () => {
        let resolvedArgs = typeof args === 'function' ? args() : args;
        if (!Array.isArray(resolvedArgs)) {
          resolvedArgs = [resolvedArgs];
        }
        try {
          const initialResult = initial(...resolvedArgs);
          if (isPromiseLike(initialResult)) {
            processAsyncValue(initialResult, false);
          } else {
            currentValue = initialResult;
            currentError = undefined;
          }
        } catch (e) {
          currentError = e;
        }
      });
    } else {
      currentValue = initial;
      currentError = undefined;
    }

    return currentValue;
  }

  function onReady(listener) {
    if (loading) {
      const removeListener = onLoadingChange.subscribe(() => {
        removeListener();
        listener();
      });
      return removeListener;
    }
    listener();
    return noop;
  }

  function setValue(value, markAsDirty = true) {
    if (isPromiseLike(value)) {
      // cleanup previously reducers because it does not fit for new async value
      reducers.length = 0;
      return processAsyncValue(value, markAsDirty);
    }

    if (typeof value === 'function') {
      reducers.push(value);
      if (currentValue === unset) {
        // should evaluate original value before applying reducer
        getValue();
      }

      if (promiseWorker) {
        return promiseWorker;
      }

      return applyReducers(currentValue, reducers.shift(), true);
    }

    const initializing = currentValue === unset;
    if (currentValue !== value) {
      if (value instanceof ErrorWrapper) {
        currentError = value.error;
      } else if (value instanceof Error) {
        currentError = value;
      } else {
        currentValue = value;
        currentError = undefined;
      }

      if (markAsDirty) {
        isDirty = true;
      }
      if (!initializing) {
        evaluationScope(null, () => {
          onChange.dispatch();
        });
      }
      if (currentError) {
        loadable.set(loadableStates.hasError, currentError);
      } else {
        loadable.set(loadableStates.hasValue, currentValue);
      }
    }
  }

  function registerDependency() {
    if (isNotifying) {
      return;
    }
    const childState = evaluationScope();
    if (childState) {
      childState.setParent(instance);
    }
  }

  function setParent(parent) {
    if (parent === instance) {
      throw new Error('Circular reference');
    }
    if (dependencies.has(parent)) {
      return;
    }
    if (process.env.NODE_ENV !== 'production') {
      if (parent.displayName && displayName) {
        console.log(
          '[state-binding] child:',
          displayName,
          'parent:',
          parent.displayName,
        );
      }
    }

    dependencies.add(parent);
    parent.onChange(handleDependencyChange);
    parent.onLoadingChange(handleLoadingState);
    handleLoadingState();
  }

  function handleLoadingState() {
    const nextLoading =
      loadable.get().state === loadableStates.loading ||
      Array.from(dependencies).some((state) => state.loading);
    if (nextLoading === loading) {
      return;
    }
    loading = nextLoading;
    wrappedNotifyLoadingChange();
  }

  function notifyLoadingChange() {
    onLoadingChange.dispatch();
  }

  function reset() {
    isDirty = false;
    reEvaluate();
  }

  function handleDependencyChange() {
    if (isDirty || currentValue === unset) {
      return;
    }
    reEvaluate();
  }

  function reEvaluate() {
    const prevValue = currentValue;
    currentValue = unset;
    getValue();
    if (prevValue !== currentValue) {
      onChange.dispatch();
    }
    // if (loadable.get().state === loadableStates.loading) {
    //   handleLoadingState();
    // }
  }

  function processAsyncValue(promise, markAsDirty) {
    if (!promiseWorker) {
      let currentPromise;
      let cancelled = false;
      let resolve;
      const currentToken = (workerToken = {});

      promiseWorker = new Promise((r) => {
        resolve = r;
      });

      Object.assign(promiseWorker, {
        cancel() {
          if (cancelled) {
            return;
          }
          cancelled = true;
        },
        change(promise) {
          currentPromise = promise;
          loadable.set(loadableStates.loading, currentValue);
          currentPromise
            .then(
              (asyncValue) => {
                // something changed since last time
                if (
                  promise !== currentPromise ||
                  cancelled ||
                  currentToken !== workerToken
                ) {
                  return;
                }
                promiseWorker = undefined;
                if (reducers.length) {
                  return applyReducers(asyncValue, reducers.shift());
                }
                setValue(asyncValue, markAsDirty);
              },
              (error) => {
                // something changed since last time
                if (
                  promise !== currentPromise ||
                  cancelled ||
                  currentToken !== workerToken
                ) {
                  return;
                }
                promiseWorker = undefined;
                reducers.length = 0;
                setValue(new ErrorWrapper(error), markAsDirty);
              },
            )
            .finally(() => {
              if (
                promise !== currentPromise ||
                cancelled ||
                currentToken !== workerToken
              ) {
                return;
              }
              loadable.set(loadableStates.hasValue, currentValue);
              resolve();
            });
        },
      });
    }

    promiseWorker.change(promise);

    return promiseWorker;
  }

  function applyReducers(value, reducer, markAsDirty) {
    const nextValue = reducer(value);
    if (isPromiseLike(nextValue)) {
      return processAsyncValue(nextValue, markAsDirty);
    }
    if (reducers.length) {
      return applyReducers(nextValue, reducers.shift(), markAsDirty);
    }
    return setValue(nextValue, markAsDirty);
  }

  Object.defineProperties(instance, {
    error: {
      get() {
        return currentError;
      },
    },
    value: {
      get() {
        const result = getValue();
        registerDependency();
        return result;
      },
      set: wrappedSetValue,
    },
    loading: {
      get() {
        getValue();
        return loading;
      },
    },
    loadable: {
      get() {
        getValue();
        return loadable.get();
      },
    },
    ready: {
      get() {
        return new Promise((resolve) => onReady(resolve));
      },
    },
    changed: {
      get() {
        return new Promise((resolve) => onChange.subscribe(resolve));
      },
    },
  });

  loadable.onChange(handleLoadingState);

  return instance;
}

Object.assign(createState, {
  history: createHistory,
  family: createFamily,
});

function createFamily(initial, options = {}) {
  const stateMap = createArrayKeyedMap();
  return Object.assign(
    function (...args) {
      return stateMap.getOrAdd(args, () => {
        return createState(initial, {
          ...options,
          args,
        });
      });
    },
    {
      reset() {
        for (const state of stateMap.values()) {
          state.reset();
        }
      },
      clear: stateMap.clear,
    },
  );
}

function createHistory(states, {max, debounce, ...options} = {}) {
  const isSingleState = states instanceof StateBase;
  const stateMap = isSingleState ? undefined : {...states};
  const debouncedHandleChange = createDebounce(handleChange, debounce);
  let isUpdating = false;
  let stateTuples = isSingleState ? undefined : Object.entries(stateMap);
  let current = {
    entries: [],
    index: -1,
  };

  function go(step) {
    if (!step || !current.entries.length) {
      return;
    }
    const index = current.index + step;
    if (index < 0 || index > current.entries.length - 1) {
      return;
    }
    current = {
      ...current,
      index,
    };

    const values = current.entries[index];

    try {
      isUpdating = true;
      if (isSingleState) {
        states.value = values;
      } else {
        stateTuples.forEach(([key, state]) => {
          if (key in values) {
            state.mutate(values[key]);
          }
        });
      }
    } finally {
      isUpdating = false;
    }

    update();
  }

  function handleChange() {
    if (isUpdating) {
      return;
    }
    evaluate() && update();
  }

  function evaluate() {
    const currentValues = current.entries[current.index] || {};
    let nextValues = currentValues;
    if (isSingleState) {
      nextValues = states.value;
    } else {
      stateTuples.forEach(([key, state]) => {
        const value = state.value;
        if (!(key in nextValues) || nextValues[key] !== value) {
          if (nextValues === currentValues) {
            nextValues = {
              ...currentValues,
            };
          }
          nextValues[key] = value;
        }
      });
    }
    if (currentValues === nextValues) {
      return false;
    }

    current = {
      entries: current.entries.slice(0, current.index + 1).concat([nextValues]),
      index: current.index + 1,
      updatedOn: new Date(),
    };

    if (max && current.entries.length > max) {
      current.index--;
      current.entries.shift();
    }

    return true;
  }

  function forward() {
    return go(1);
  }

  function back() {
    return go(-1);
  }

  function clear() {
    current = {
      index: -1,
      entries: [],
    };
    update();
  }

  function update() {
    shadowState.value = createHistoryEntry(
      current.entries,
      current.index,
      current.updatedOn,
    );
  }

  const shadowState = createState(undefined, {
    ...options,
    readonly: true,
  });

  function listenStateChange() {
    if (isSingleState) {
      states.onChange(debouncedHandleChange);
    } else {
      stateTuples.forEach(([, state]) => {
        state.onChange(debouncedHandleChange);
      });
    }
  }

  Object.assign(shadowState, {
    go,
    forward,
    back,
    clear,
  });

  handleChange();
  listenStateChange();

  return shadowState;
}

function createHistoryEntry(values, index, updatedOn) {
  let prev;
  let next;
  const result = {
    all: values,
    updatedOn,
  };
  Object.defineProperties(result, {
    length: createHistoryEntryProp(() => values.length),
    current: createHistoryEntryProp(() => values[index]),
    forward: createHistoryEntryProp(
      () => values.length && index < values.length - 1,
    ),
    back: createHistoryEntryProp(() => values.length && !!index),
    prev: createHistoryEntryProp(() => prev || (prev = values.slice(0, index))),
    next: createHistoryEntryProp(
      () => next || (next = values.slice(index + 1)),
    ),
  });
  return result;
}

function createHistoryEntryProp(get) {
  return {
    get,
    enumerable: false,
    configurable: false,
  };
}
