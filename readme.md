# Tinis

A tiny state management that is inspired on RecoilJs

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

To implement a filtered todo list, we need to choose a set of filter criteria whose value can be saved in an atom. The filter options we'll use are: "Show All", "Show Completed", and "Show Uncompleted". The default value will be "Show All":

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
