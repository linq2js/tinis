import {effect, state, task} from './index';

const delayIn = (ms = 0) =>
  Object.assign(new Promise((resolve) => setTimeout(resolve, ms)), {
    __type: 'delayIn',
  });

test('cancel effect', async () => {
  let async = true;
  const callback = jest.fn();
  const doSomething = effect(function* () {
    if (async) {
      yield delayIn(5);
    }
    callback();
  });

  let promise = doSomething();
  expect(promise && typeof promise.then === 'function').toBe(true);
  await promise;
  expect(callback).toBeCalledTimes(1);

  promise = doSomething();
  await delayIn(3);
  promise.cancel();
  await delayIn(10);
  expect(callback).toBeCalledTimes(1);

  // turn off async mode
  async = false;
  doSomething();
  expect(callback).toBeCalledTimes(2);
});

test('listen all effects', async () => {
  const step1 = effect();
  const step2 = effect();
  const step3 = effect();
  const callback = jest.fn();
  const doSomething = effect(function* () {
    yield [step1, step2, step3];
    callback();
  });
  doSomething();
  step1();
  step3();
  step2();
  await delayIn();
  expect(callback).toBeCalledTimes(1);
});

test('listen some effect', async () => {
  const callback = jest.fn();
  const cancel = effect();
  const startSearch = effect();
  const doSearch = effect(function* () {
    yield delayIn(100, 'test-delay');
    callback();
  });
  const epic = effect(function* () {
    while (true) {
      yield startSearch;
      const searchDone = doSearch();
      yield {cancel, searchDone};
    }
  });

  epic();
  await delayIn();

  expect(callback).toBeCalledTimes(0);
  // start search and cancel
  startSearch('try 1');
  await delayIn(5);
  cancel();
  expect(callback).toBeCalledTimes(0);
  await delayIn(120);
  expect(callback).toBeCalledTimes(0);

  // start search and cancel
  startSearch('try 2');
  await delayIn(5);
  cancel();
  expect(callback).toBeCalledTimes(0);
  await delayIn(120);
  expect(callback).toBeCalledTimes(0);

  // start search and receive result
  startSearch('try 2');
  await delayIn(120);
  expect(callback).toBeCalledTimes(1);
});

test('listen effect chain: konami code', async () => {
  const up = effect();
  const down = effect();
  const left = effect();
  const right = effect();
  const A = effect();
  const B = effect();
  const callback = jest.fn();
  const doSomething = effect(function* () {
    while (true) {
      yield [[up, up, down, down, left, right, left, right, B, A]];
      callback();
    }
  });
  doSomething();

  down();
  up();
  up();
  down();
  left();
  right();
  left();
  right();
  A();
  B();
  await delayIn();
  expect(callback).toBeCalledTimes(0);

  up();
  up();
  down();
  down();
  left();
  right();
  left();
  right();
  B();
  A();
  await delayIn();
  expect(callback).toBeCalledTimes(1);

  up();
  up();
  down();
  down();
  left();
  right();
  left();
  right();
  B();
  A();
  await delayIn();
  expect(callback).toBeCalledTimes(2);
});

test('cancel state update', async () => {
  const values = [100, 101];
  const countState = state(0);
  const updateEffect = effect(function* () {
    yield delayIn(10);
    yield countState.mutate(async () => {
      await delayIn(5);
      return values.shift();
    });
  });

  updateEffect();

  await delayIn(20);
  expect(countState.value).toBe(100);

  const promise = updateEffect();
  await delayIn(12);
  promise.cancel();

  await delayIn(10);
  expect(countState.value).toBe(100);
});

test('effect (latest)', async () => {
  const countState = state(0);
  const increaseAsync = effect(
    function* () {
      yield delayIn(10);
      countState.value++;
    },
    {
      latest: true,
    },
  );

  increaseAsync();
  increaseAsync();
  increaseAsync();

  await delayIn(15);
  expect(countState.value).toBe(1);
});

test('effect (debounce)', async () => {
  const countState = state(0);
  const increaseAsync = effect(
    () => {
      countState.value++;
    },
    {
      debounce: 10,
    },
  );

  increaseAsync();
  increaseAsync();
  increaseAsync();

  await delayIn(15);
  expect(countState.value).toBe(1);

  increaseAsync();
  await delayIn(15);
  increaseAsync();

  await delayIn(15);
  expect(countState.value).toBe(3);
});

test('effect (throttle)', async () => {
  const countState = state(0);
  const increaseAsync = effect(
    function* () {
      yield delayIn(5);
      countState.value++;
    },
    {
      throttle: 10,
    },
  );

  increaseAsync();
  await delayIn(5);
  expect(countState.value).toBe(1);
  increaseAsync();
  await delayIn(5);
  increaseAsync();
  await delayIn(15);
  increaseAsync();
  expect(countState.value).toBe(2);
});

test('yield nothing', () => {
  const doNothing = effect(function* () {
    yield;
  });
  doNothing();
});

test('long press', async () => {
  const callback = jest.fn();
  const mouseup = effect();
  const mousedown = effect();
  const longPressEpic = effect(function* () {
    while (true) {
      yield mousedown;
      yield {
        mouseup,
        pressed: task.delay(100, callback),
      };
    }
  });
  longPressEpic();

  mousedown();
  await task.delay(50);
  mouseup();
  expect(callback).toBeCalledTimes(0);
  mousedown();
  await task.delay(150);
  mouseup();
  expect(callback).toBeCalledTimes(1);
});

test('handle any effect call', async () => {
  const effect1 = effect();
  const effect2 = effect();
  const callback = jest.fn();
  const epic = effect(function* () {
    while (true) {
      const result = yield effect.any;
      callback(result);
    }
  });

  epic();

  effect2(2);
  effect1(1);

  await delayIn();

  expect(callback.mock.calls).toEqual([
    [{target: effect2, payload: 2}],
    [{target: effect1, payload: 1}],
  ]);
});
