import {state} from './index';

test('push nothing', () => {
  const callback = jest.fn();
  const arrayState = state([]);
  arrayState.onChange(callback);
  arrayState.op.push();

  expect(callback).toBeCalledTimes(0);
});

test('push(1, 2, 3)', () => {
  const callback = jest.fn();
  const arrayState = state([]);
  arrayState.onChange(callback);
  arrayState.op.push(1, 2, 3);

  expect(callback).toBeCalledTimes(1);
  expect(arrayState.value).toEqual([1, 2, 3]);
});

test('auto detect change', () => {
  const callback = jest.fn();
  const arrayState = state([1, 2, 3]);
  arrayState.onChange(callback);
  // nothing change
  arrayState.op.filter((x) => x !== 0);
  expect(callback).toBeCalledTimes(0);
  arrayState.op.filter((x) => x % 2 === 0);
  expect(callback).toBeCalledTimes(1);
  expect(arrayState.value).toEqual([2]);
});

test('delete()', () => {
  const callback = jest.fn();
  const objectState = state({prop1: 1, prop2: 2, prop3: 3});
  objectState.onChange(callback);

  objectState.op.delete('100');
  expect(callback).toBeCalledTimes(0);

  objectState.op.delete('prop1', 'prop2');
  expect(callback).toBeCalledTimes(1);
  expect(objectState.value).toEqual({prop3: 3});
});

test('assign()', () => {
  const callback = jest.fn();
  const objectState = state({prop1: 1, prop2: 2, prop3: 3});
  objectState.onChange(callback);

  objectState.op.assign({prop1: 1});
  expect(callback).toBeCalledTimes(0);

  objectState.op.assign({prop3: 4}, {prop3: 3});
  expect(callback).toBeCalledTimes(0);

  objectState.op.assign({prop4: 4});
  expect(callback).toBeCalledTimes(1);
  expect(objectState.value).toEqual({prop1: 1, prop2: 2, prop3: 3, prop4: 4});
});

test('add(number)', () => {
  const callback = jest.fn();
  const numberState = state(0);
  numberState.onChange(callback);

  numberState.op.add();
  numberState.op.add();
  expect(callback).toBeCalledTimes(2);
  expect(numberState.value).toBe(2);
});

test('add(string)', () => {
  const callback = jest.fn();
  const numberState = state('0');
  numberState.onChange(callback);

  numberState.op.add();
  numberState.op.add();
  expect(callback).toBeCalledTimes(2);
  expect(numberState.value).toBe('011');
});

test('add(timespan)', () => {
  const callback = jest.fn();
  const now = new Date();
  const numberState = state(now);
  numberState.onChange(callback);

  numberState.op.add(100);
  expect(callback).toBeCalledTimes(1);
  expect(numberState.value.getTime()).toBe(now.getTime() + 100);

  numberState.op.add({
    milliseconds: 10,
    seconds: 2,
  });
  expect(callback).toBeCalledTimes(2);
  expect(numberState.value.getTime()).toBe(now.getTime() + 2110);
});

test('swap object props', () => {
  const callback = jest.fn();
  const objectState = state({prop1: 1, prop2: 2, prop3: 1});
  objectState.onChange(callback);

  objectState.op.swap('prop1', 'prop3');
  expect(callback).toBeCalledTimes(0);

  objectState.op.swap('prop1', 'prop2');
  expect(callback).toBeCalledTimes(1);
  expect(objectState.value).toEqual({prop1: 2, prop2: 1, prop3: 1});
});
