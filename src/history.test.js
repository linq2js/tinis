import {state} from './index';
import {delayIn} from './utils';

test('history', async () => {
  const count1 = state(1);
  const count2 = state(2);
  const history = state.history(
    {
      count1,
      count2,
    },
    {
      debounce: true,
    },
  );

  expectHistoryEntry(history.value, {
    count1: 1,
    count2: 2,
  });

  const increase = () => {
    count1.value++;
    count2.value++;
  };

  increase();
  await delayIn(1);

  expectHistoryEntry(
    history.value,
    {
      count1: 2,
      count2: 3,
    },
    [{count1: 1, count2: 2}],
  );

  increase();
  await delayIn(1);

  expectHistoryEntry(
    history.value,
    {
      count1: 3,
      count2: 4,
    },
    [
      {count1: 1, count2: 2},
      {count1: 2, count2: 3},
    ],
  );

  increase();
  await delayIn(1);

  expectHistoryEntry(
    history.value,
    {
      count1: 4,
      count2: 5,
    },
    [
      {count1: 1, count2: 2},
      {count1: 2, count2: 3},
      {
        count1: 3,
        count2: 4,
      },
    ],
  );

  // go back
  history.back();
  await delayIn(1);

  expectHistoryEntry(
    history.value,
    {
      count1: 3,
      count2: 4,
    },
    [
      {count1: 1, count2: 2},
      {count1: 2, count2: 3},
    ],
    [
      {
        count1: 4,
        count2: 5,
      },
    ],
  );

  expect(count1.value).toBe(3);
  expect(count2.value).toBe(4);

  // go back
  history.back();
  await delayIn(1);

  expectHistoryEntry(
    history.value,
    {
      count1: 2,
      count2: 3,
    },
    [{count1: 1, count2: 2}],
    [
      {count1: 3, count2: 4},
      {
        count1: 4,
        count2: 5,
      },
    ],
  );

  expect(count1.value).toBe(2);
  expect(count2.value).toBe(3);

  // go back
  history.forward();
  await delayIn(1);

  expectHistoryEntry(
    history.value,
    {
      count1: 3,
      count2: 4,
    },
    [
      {count1: 1, count2: 2},
      {count1: 2, count2: 3},
    ],
    [
      {
        count1: 4,
        count2: 5,
      },
    ],
  );

  expect(count1.value).toBe(3);
  expect(count2.value).toBe(4);
});

function expectHistoryEntry(entry, current, prev = [], next = []) {
  // console.log(entry.current, entry.prev, entry.next);
  expect(entry.current).toEqual(current);
  expect(entry.prev).toEqual(prev);
  expect(entry.next).toEqual(next);
}

test('async state and history', async () => {
  const todoState = state(async () => {
    await delayIn(20);
    return 'item 1';
  });

  const historyOfTodo = state.history(todoState);

  expect(historyOfTodo.value.current).toEqual(undefined);
  await delayIn(30);
  expect(historyOfTodo.value.current).toEqual('item 1');
  todoState.value = 'item 2';
  expect(historyOfTodo.value.current).toEqual('item 2');
  todoState.value = 'item 4';
  expect(historyOfTodo.value.current).toEqual('item 4');
  historyOfTodo.go(-2);
  expect(historyOfTodo.value.current).toEqual('item 1');
});
