# Tinis

A tiny state management that is inspired on RecoilJs

Table of contents

1. [Intro](#intro)
1. [States](#states)
1. [Derived states](#derived-states)
1. [State family](#state-family)
1. [Asynchronous states](#asynchronous-states)
1. [Handling state value changing](#handling-state-value-changing)
1. [State Persistence](#state-persistence)

## Intro

In this tutorial, we'll be building a simple todo-list application. Our app will be able to do the following:

1. Add todo items
1. Edit todo items
1. Delete todo items
1. Filter todo items
1. Display useful stats

## States

States contain the partial data of application state.
In our todo-list, the source of truth will be an array of objects, with each object representing a todo item.

```jsx harmony
import {state} from 'tinis';
const todoListState = state([]);
```

To create new todo item we need to update todoListState. We use value prop to get and set value of todoListState

```jsx harmony
function addTodo(title) {
  todoListState.value = todoListState.value.concat({
    id: Math.random(),
    title,
    completed: false,
  });
}
```

Implement other actions for todo list

```jsx harmony
function removeTodo(id) {
  todoListState.value = todoListState.value.filter((todo) => todo.id !== id);
}

function updateTodo(title) {
  todoListState.value = todoListState.value.map((todo) =>
    todo.id === id ? {...todo, title} : todo,
  );
}

function toggleTodo(id) {
  todoListState.value = todoListState.value.map((todo) =>
    todo.id === id ? {...todo, completed: !todo.completed} : todo,
  );
}
```

## Derived states

You can think of derived state as the output of passing state to a pure function that modifies the given state in some way.

Derived state is a powerful concept because it lets us build dynamic data that depends on other data. In the context of our todo list application, the following are considered derived state:

1. Filtered todo list: derived from the complete todo list by creating a new list that has certain items filtered out based on some criteria (such as filtering out items that are already completed).
1. Todo list statistics: derived from the complete todo list by calculating useful attributes of the list, such as the total number of items in the list, the number of completed items, and the percentage of items that are completed.

To implement a filtered todo list, we need to choose a set of filter criteria whose value can be saved in an state. The filter options we'll use are: "Show All", "Show Completed", and "Show Uncompleted". The default value will be "Show All":

```jsx harmony
const todoListFilterState = state('Show All');
```

Using todoListFilterState and todoListState, we can build a filteredTodoListState which derives a filtered list:

```jsx harmony
const filteredTodoListState = state(function () {
  const filter = todoListFilterState.value;
  const list = todoListState.value;
  switch (filter) {
    case 'Show Completed':
      return list.filter((item) => item.completed);
    case 'Show Uncompleted':
      return list.filter((item) => !item.completed);
    default:
      return list;
  }
});
```

The filteredTodoListState internally keeps track of two dependencies:
todoListFilterState and todoListState so that it re-runs if either of those change.

With a few lines of code we've managed to implement filtering! We'll use the same concepts to implement the TodoListStats component.

We want to display the following stats:

1. Total number of todo items
1. Total number of completed items
1. Total number of uncompleted items
1. Percentage of items completed

While we could create a state for each of the stats, an easier approach would be to create one state that returns an object containing the data we need. We'll call this state todoListStatsState:

```jsx harmony
const todoListStatsState = state(function () {
  const todoList = todoListState.value;
  const total = todoList.length;
  const totalCompleted = todoList.filter((item) => item.completed).length;
  const totalUncompleted = total - totalCompleted;
  const percentCompleted = total === 0 ? 0 : totalCompleted / total;

  return {
    total,
    totalCompleted,
    totalUncompleted,
    percentCompleted,
  };
});
```

To summarize, we've created a todo list app that meets all of our requirements:

1. Add todo items
1. Edit todo items
1. Delete todo items
1. Filter todo items
1. Display useful stats

## State family

Sometimes your app is a UI prototyping tool where the user can dynamically add elements and each element has state, such as its position.
Ideally, each element would get its own state.
You could implement this yourself via a memoization pattern
But, Tinis provides this pattern for you with the state.family utility

```jsx harmony
const positionState = state.family((id) => {
  return {
    id,
    x: 0,
    y: 0,
  };
});

console.log(positionState('element 1').value); // { id: 'element 1', x: 0, y: 0 }
console.log(positionState('element 2').value); // { id: 'element 2', x: 0, y: 0 }
```

### Persistence

Persistence observers will persist the state for each parameter value as a distinct state with a unique key based on serialization of the parameter value used.
Therefore, it is important to only use parameters which are primitives or simple compound objects containing primitives.
Custom classes or functions aren't allowed.

## Asynchronous States

Tinis allows you to seamlessly mix synchronous and asynchronous functions in your data-flow graph of states.
Simply return a Promise to a value instead of the value itself from a state func, the interface remains exactly the same.

Async states can be used as one way to incorporate asynchronous data into the Tinis data-flow graph.
Please keep in mind that states represent pure functions: For a given set of inputs they should always produce the same results (at least for the lifetime of the application).
This is important as state evaluations may execute one or more times, may be restarted, and may be cached.
Because of this, async states are a good way to model read-only DB queries where repeating a query provides consistent data

```jsx harmony
const currentUserIDState = state(0);

const currentUserNameState = state(
  async () => {
    const response = await userProfileDbQuery({
      userID: currentUserIDState.value,
    });
    // if request has an error
    if (response.error) {
      throw response.error;
    }
    return response.name;
  },
  {default: 'Default User Name'},
);

// at this time, request does not complete, async state value is 'Default User Name'
console.log(currentUserNameState.value); // 'Default User Name'

// wait for userProfileDbQuery done
console.log(currentUserNameState.value); // 'User name that received from the server'
// if request has and error
console.log(currentUserNameState.error); // Http Error
```

## Handling state value changing

```jsx harmony
const countState = state(0);
countState.onChange(() => console.log(countState.value));
countState.value++;
```

## State Persistence

To persist state, subscribe to state changes and record the new state.

```jsx harmony
// load appData from localStorage
const localStorageAppDataState = state(() => {
  return JSON.parse(localStorage.getItem('appData'));
});

const userToken = localStorageAppDataState.mapTo((value) => value.token);
const userProfile = localStorageAppDataState.mapTo((value) => value.profile);

const appDataState = state.map({
  token: userToken,
  profile: userProfile,
});

// when appDataState changed, save its value to local storage
appDataState.onChange(() => {
  localStorage.setItem('appData', JSON.stringify(appDataState.value));
});

// update states
userProfile.value = {email: 'test@tempuri.org'};
```
