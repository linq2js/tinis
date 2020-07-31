const emptyMap = new Map();
const unset = {};
emptyMap.value = unset;

export default function createArrayKeyedMap() {
  const root = new Map();
  const values = [];
  root.value = unset;

  function getMap(key, createIfNotExist) {
    const keyArray = Array.isArray(key) ? key : [key];
    let prev = root;
    for (let i = 0; i < keyArray.length; i++) {
      const item = keyArray[i];
      const map = prev.get(item);
      if (typeof map === 'undefined') {
        if (!createIfNotExist) {
          return emptyMap;
        }
        const newMap = new Map();
        newMap.value = unset;
        prev.set(item, newMap);
        prev = newMap;
      } else {
        prev = map;
      }
    }
    return prev;
  }

  return {
    set(key, value) {
      const map = getMap(key, true);
      if (map.value === unset) {
        values[values.length] = map;
      }
      map.value = value;
    },
    get(key) {
      const value = getMap(key, false).value;
      return value === unset ? undefined : value;
    },
    getOrAdd(key, creator) {
      const map = getMap(key, true);
      if (map.value === unset) {
        map.value = creator(key);
      }
      return map.value;
    },
    clear() {
      root.clear();
    },
    delete(key) {
      getMap(key, false).value = unset;
    },
    *values() {
      for (const map of values) {
        yield map.value;
      }
    },
  };
}
