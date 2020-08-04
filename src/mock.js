import {isEffect, isState, mockingScope} from './utils';

export default function (funcOrTarget) {
  if (isState(funcOrTarget) || isEffect(funcOrTarget)) {
    return getMockInstance(funcOrTarget);
  }

  return mockingScope(new WeakMap(), funcOrTarget);
}

function getMockInstance(target) {
  const mockingContext = mockingScope();
  let instance = mockingContext.get(target);
  if (!instance) {
    instance =
      isState(target) || isEffect(target)
        ? createMockInstance(target)
        : undefined;
    if (!instance) {
      throw new Error('No mock supported for ' + typeof target);
    }
    mockingContext.set(target, instance);
    instance.remove = () => mockingContext.delete(target);
  }
  return instance;
}

export function tryGetPropValue(target, prop) {
  const mockingContext = mockingScope();
  if (mockingContext) {
    const mockInstance = mockingContext.get(target);
    if (mockInstance && prop in mockInstance.props) {
      if (typeof mockInstance.props[prop] === 'function') {
        return {
          success: true,
          value: mockInstance.props[prop](),
        };
      }
      return {
        success: true,
        value: mockInstance.props[prop],
      };
    }
  }
  return {
    success: false,
  };
}

function createMockInstance(target) {
  let props = {};
  return {
    props,
    body(newValue) {
      props.body = newValue;
      return this;
    },
    value(newValue) {
      props.value = newValue;
      return this;
    },
    result(newValue) {
      props.result = newValue;
      return this;
    },
    called(newValue) {
      props.called = newValue;
      return this;
    },
    error(newValue) {
      props.error = newValue;
      return this;
    },
    loading(newValue) {
      props.loading = newValue;
      return this;
    },
    onCall() {
      target.mockApi.onCall();
      return this;
    },
    onChange() {
      target.mockApi.onChange();
      return this;
    },
    onLoadingChange() {
      target.mockApi.onLoadingChange();
      return this;
    },
  };
}
