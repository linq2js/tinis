import iscope from 'iscope';

export const loadableStates = {
  hasError: 'hasError',
  hasValue: 'hasValue',
  loading: 'loading',
};
export const unset = {};
export const noop = () => {};
export const evaluationScope = iscope(() => undefined);

export function isIteratorLike(obj) {
  return obj && typeof obj.next === 'function';
}

export function isPromiseLike(obj) {
  return obj && typeof obj.then === 'function';
}

export function isCancellable(obj) {
  return obj && typeof obj.cancel === 'function';
}

export function createObservable() {
  const subscriptions = [];

  function subscribe(subscription) {
    subscriptions.push(subscription);
    return function () {
      const index = subscriptions.indexOf(subscription);
      if (index !== -1) {
        subscriptions.splice(index, 1);
      }
    };
  }

  function clear() {
    subscriptions.length = 0;
  }

  function dispatch(...args) {
    const copyOfSubscriptions = subscriptions.slice();
    for (let index = 0; index < copyOfSubscriptions.length; index++) {
      copyOfSubscriptions[index].apply(null, args);
    }
  }

  function subscribeOnce(subscription) {
    const unsubscribe = subscribe(function () {
      try {
        return subscription(...arguments);
      } finally {
        unsubscribe();
      }
    });

    return unsubscribe;
  }

  return {
    dispatch,
    subscribe,
    subscribeOnce,
    clear,
    subscriptions,
  };
}

/*!
 * Check if an item is a plain object or not
 * (c) 2017 Chris Ferdinandi, MIT License, https://gomakethings.com
 * @param  {Object}  obj  The item to check
 * @return {Boolean}      Returns true if the item is a plain object
 */
export function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

export class ErrorWrapper {
  constructor(error) {
    this.error = error;
  }
}

export function createLatest(func) {
  if (!func) {
    return undefined;
  }
  let lastResult;
  return function () {
    if (lastResult && typeof lastResult.cancel === 'function') {
      lastResult.cancel();
    }
    return (lastResult = func(...arguments));
  };
}

export function createDebounce(func, ms) {
  if (!func) {
    return undefined;
  }
  if (ms === false || typeof ms === 'undefined' || ms === null) {
    return func;
  }
  if (isNaN(ms)) {
    ms = 0;
  }
  let timeoutId;
  return function () {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(func, ms, ...arguments);
  };
}

export function createThrottle(func, ms) {
  if (!func) {
    return undefined;
  }
  if (!ms) {
    return func;
  }
  let lastTime;
  let lastResult;
  return function () {
    const now = new Date().getTime();
    if (!lastTime || now - lastTime >= ms) {
      lastTime = now;
      lastResult = func(...arguments);
    }
    return lastResult;
  };
}

export function delayIn(ms = 0, value, ...args) {
  let timerId;
  let cancelled = false;

  return Object.assign(
    new Promise((resolve) => {
      timerId = setTimeout(() => {
        if (cancelled) {
          return;
        }

        if (typeof value === 'function') {
          resolve(value(...args));
        } else {
          resolve(value);
        }
      }, ms);
    }),
    {
      cancel() {
        if (cancelled) {
          return;
        }
        cancelled = true;
        clearTimeout(timerId);
      },
    },
  );
}
