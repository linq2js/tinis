import {createObservable, ErrorWrapper, loadableStates, unset} from './utils';

export default function createLoadable(
  state = loadableStates.hasValue,
  value = unset,
  error,
) {
  const onChange = createObservable();
  let currentLoadable = undefined;

  function get() {
    return currentLoadable;
  }

  function set(state, value, error) {
    if (value instanceof ErrorWrapper) {
      state = loadableStates.hasError;
      error = value;
      value = undefined;
    }

    if (!currentLoadable) {
      currentLoadable = {state, value, error};
    } else if (
      currentLoadable.value !== value ||
      currentLoadable.error !== error ||
      currentLoadable.state !== state
    ) {
      currentLoadable = {state, value, error};
      onChange.dispatch(currentLoadable);
    }
  }

  set(state, value, error);

  return {
    set,
    get,
    onChange: onChange.subscribe,
  };
}
