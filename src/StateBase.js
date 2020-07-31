export default class StateBase {
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
      (array) => (array.length ? array.concat(values) : values),
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
      (array) => (array.length ? values.concat(array) : values),
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

  constructor(props) {
    Object.assign(this, props);
  }

  _mutate(mutator, {clone, detectChange, default: defaultValue}) {
    return this.mutate((value) => {
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
      }

      const mutatedValue = mutator(value, originalValue);
      const nextValue = clone ? value : mutatedValue;
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
  }
}
