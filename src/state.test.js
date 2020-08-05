import {delayIn} from './utils';
import {state} from './index';

const increaseReducer = (value) => value + 1;
//
// test('state error', () => {
//   let throwError = false;
//   const countState = state(async () => {
//     if (!throwError) {
//       return true;
//     }
//
//   });
// });

test('async state', async () => {
  const countState = state(async () => {
    await delayIn(5);
    return 100;
  });

  expect(countState.value).toBeUndefined();
  await delayIn(10);
  expect(countState.value).toBe(100);
});

test('got error when evaluating', async () => {
  const countState = state(async () => {
    throw new Error('invalid');
  });

  countState.eval();
  await delayIn();
  expect(countState.error).not.toBeUndefined();
});

test('state is dirty', () => {
  const countState = state(2);
  const doubleCountState = state(() => countState.value * 2);
  expect(doubleCountState.value).toBe(4);
  doubleCountState.value = 10;
  countState.value++;
  expect(doubleCountState.value).toBe(10);
  doubleCountState.reset();
  expect(doubleCountState.value).toBe(6);
});

test('async state - use reducer', async () => {
  const countState = state(async () => {
    await delayIn(5);
    return 100;
  });

  countState.mutate(increaseReducer);
  countState.mutate(increaseReducer);
  countState
    .mutate(increaseReducer)
    .then(() => expect(countState.value).toBe(103));

  expect(countState.value).toBeUndefined();
  await delayIn(10);
  expect(countState.value).toBe(103);
});

test('async state - use reducer and assign new promise', async () => {
  const countState = state(async () => {
    await delayIn(5);
    return 100;
  });

  const expected = () => expect(countState.value).toBe(121);

  countState
    .mutate(increaseReducer)
    // should use only promise for all async value
    .then(expected);
  countState
    .mutate(increaseReducer)
    // should use only promise for all async value
    .then(expected);
  countState
    .mutate(increaseReducer)
    // should use only promise for all async value
    .then(expected);

  countState.mutate(delayIn(5, 120));
  countState.mutate(increaseReducer);

  expect(countState.value).toBeUndefined();
  await delayIn(20);
  expected();
});

test('async state dependency', async () => {
  const initialData = [
    {title: 'item 1', completed: true},
    {title: 'item 2', completed: false},
  ];
  const newTodo = {title: 'item 3', completed: false};
  const todosState = state(() => delayIn(10, initialData), {
    default: [],
  });

  const filterState = state('all');

  const filteredTodosState = state(() => {
    const filter = filterState.value;
    const todos = todosState.value;

    return filterTodos(todos, filter);
  });

  const todoCountState = state(() => {
    const todos = todosState.value;

    return {
      all: filterTodos(todos, 'all').length,
      active: filterTodos(todos, 'active').length,
      done: filterTodos(todos, 'done').length,
    };
  });

  function filterTodos(todos, filter) {
    switch (filter) {
      case 'active':
        return todos.filter((todo) => !todo.completed);
      case 'done':
        return todos.filter((todo) => todo.completed);
      default:
        return todos;
    }
  }

  expect(todosState.loading).toBe(true);
  expect(todoCountState.loading).toBe(true);
  expect(filteredTodosState.loading).toBe(true);

  await delayIn(50);

  expect(todosState.value).toEqual(initialData);
  expect(todosState.loading).toBe(false);
  expect(todoCountState.loading).toBe(false);
  expect(filteredTodosState.loading).toBe(false);

  todosState.mutate((prev) => prev.concat(newTodo));

  expect(todosState.loading).toBe(false);
  expect(todoCountState.loading).toBe(false);
  expect(filteredTodosState.loading).toBe(false);

  expect(todosState.value).toEqual(initialData.concat(newTodo));
});

test('state map', async () => {
  const countState = state(
    async () => {
      await delayIn(5);
      return 2;
    },
    {
      default: 1,
    },
  );
  const doubleCountState = countState.mapTo((x) => x * 2);
  const allCountState = state.map({
    double: doubleCountState,
    count: countState,
  });
  const countHistory = countState.mapTo((value, seed = []) =>
    seed.concat([value]),
  );

  expect(doubleCountState.value).toBe(2);
  expect(allCountState.value).toEqual({double: 2, count: 1});
  expect(countHistory.value).toEqual([1]);

  await delayIn(10);

  expect(doubleCountState.value).toBe(4);
  expect(allCountState.value).toEqual({double: 4, count: 2});
  expect(countHistory.value).toEqual([1, 2]);
});

test('readonly state', () => {
  const countState = state(0, {readonly: true});
  expect(() => countState.value++).toThrow('Cannot mutate readonly state');
});
