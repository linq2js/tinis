import {isPlainObject} from './utils';

export default class StateOp {
  swap(sourceIndex, destinationIndex) {
    return this._mutate(
      (array, original) => {
        if (array[sourceIndex] === array[destinationIndex]) {
          return original;
        }
        const destinationValue = array[destinationIndex];
        array[destinationIndex] = array[sourceIndex];
        array[sourceIndex] = destinationValue;
      },
      {
        clone: true,
        default: [],
      },
    );
  }
  push(...values) {
    return this._mutate(
      (array) =>
        values.length ? (array.length ? array.concat(values) : values) : array,
      {
        default: [],
      },
    );
  }

  pop() {
    return this._mutate(
      (array, original) => (array.length ? array.pop() : original),
      {
        clone: true,
        default: [],
      },
    );
  }

  unshift(...values) {
    return this._mutate(
      (array) =>
        values.length ? (array.length ? values.concat(array) : values) : array,
      {
        default: [],
      },
    );
  }

  shift() {
    return this._mutate(
      (array, original) => (array.length ? array.shift() : original),
      {
        clone: true,
        default: [],
      },
    );
  }

  filter(predicate) {
    return this._mutate(
      (array) => (array.length ? array.filter(predicate) : array),
      {
        default: [],
        detectChange: true,
      },
    );
  }

  map(mapper) {
    return this._mutate(
      (array, original) => (array.length ? array.map(mapper) : original),
      {
        default: [],
        detectChange: true,
      },
    );
  }

  sort(func) {
    return this._mutate(
      (array, original) => (array.length ? array.sort(func) : original),
      {
        default: [],
        clone: true,
        detectChange: true,
      },
    );
  }

  splice(index, length, ...items) {
    return this._mutate((array) => array.splice(index, length, ...items), {
      clone: true,
      default: [],
      detectChange: true,
    });
  }

  assign(...props) {
    return this._mutate(
      (prev) => {
        const obj = props.length > 1 ? Object.assign({}, ...props) : props[0];
        let result = prev;
        Object.keys(obj).forEach((key) => {
          if (obj[key] !== result[key]) {
            if (result === prev) {
              result = {...prev};
            }
            result[key] = obj[key];
          }
        });
        return result;
      },
      {
        default: {},
      },
    );
  }

  delete(...props) {
    return this._mutate((prev) => {
      if (!prev) {
        return prev;
      }
      let result = prev;
      props.forEach((prop) => {
        if (prop in prev) {
          if (result === prev) {
            result = Array.isArray(prev) ? prev.slice(0) : {...prev};
          }
          delete result[prop];
        }
      });

      return result;
    });
  }

  toggle() {
    return this._mutate((prev) => !prev);
  }

  add(by = 1) {
    return this._mutate((prev) => {
      if (!(prev instanceof Date)) {
        return prev + by;
      }

      const date = prev;
      let duration = by;
      if (typeof duration !== 'object') {
        duration = {
          milliseconds: duration,
        };
      }
      const {
        years = 0,
        months = 0,
        days = 0,
        hours = 0,
        seconds = 0,
        minutes = 0,
        milliseconds = 0,
      } = duration;

      return new Date(
        date.getFullYear() + years,
        date.getMonth() + months,
        date.getDate() + days,
        date.getHours() + hours,
        date.getMinutes() + minutes,
        date.getSeconds() + seconds,
        date.getMilliseconds() + milliseconds,
      );
    });
  }

  constructor(mutate) {
    this._mutate = (
      mutator,
      {clone, detectChange, default: defaultValue} = {},
    ) => {
      return mutate((value) => {
        if (typeof value === 'undefined' || value === null) {
          value = defaultValue;
        }

        const originalValue = value;
        let isArray = false;
        let isObject = false;
        if (clone) {
          if (Array.isArray(value)) {
            value = value.slice(0);
            isArray = true;
          } else if (value instanceof Date) {
            value = new Date(value.getTime());
          } else if (typeof value === 'object') {
            value = {...value};
            isObject = true;
          }
        } else {
          if (Array.isArray(originalValue)) {
            isArray = true;
          } else if (isPlainObject(originalValue)) {
            isObject = true;
          }
        }

        const mutatedValue = mutator(value, originalValue);
        const nextValue =
          mutatedValue === originalValue
            ? originalValue
            : clone
            ? value
            : mutatedValue;
        if (nextValue === originalValue) {
          return originalValue;
        }

        let isEqual = false;
        if (detectChange) {
          if (isArray) {
            isEqual =
              nextValue.length === originalValue.length &&
              nextValue.every((value, index) => value === originalValue[index]);
          } else if (isObject) {
            const originalKeys = Object.keys(originalValue);
            const nextKeys = Object.keys(nextValue);
            isEqual =
              originalKeys.length === nextKeys.length &&
              originalKeys.every(
                (key) => originalValue[key] === nextValue[key],
              ) &&
              nextKeys.every((key) => originalValue[key] === nextValue[key]);
          }
        }
        return isEqual ? originalValue : nextValue;
      });
    };
  }
}
