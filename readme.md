# Motel

Motel simplifies data-fetching in systems like Elm and React by
eliminating the need to use side-effects to trigger remote data
reads. To accomplish this, it uses a concept called
[vacancy observers](https://gist.github.com/greim/3de3bcb71a672e11c75e371b7b81f4bb).

## Installation

```bash
npm install motel
```

## Example Usage

### Step 1: Add observers

Create a file containing your observers: `vacancies.js`

```js
import { Motel } from 'motel';
export const vacancies = Motel.create();

vacancies.observe('users/:id', async ({ id }, dispatch, exit) => {

  /*
   * Somewhere in the DOM, one or more elements
   * have declared a vacancy on "users/:id".
   *
   * Fill that vacancy by fetching data. Set up
   * a websocket or a poller. Call your GraphQL
   * service. Etc. Send these updates to your
   * dispatcher by calling dispatch().
   */

  await exit;

  /*
   * All elements with "users/:id" vacancies have
   * now left the DOM.
   *
   * Do necessary cleanup. Unregister websockets,
   * cancel pollers, dispatch deletion actions.
   */
});
```

### Step 2: Wire it up

Entry-point file: `main.js`

```js
/*
 * This is some boilerplatey stuff that you
 * would do for example in your Redux app's
 * main.js entry-point module.
 */

import vacancies from './vacancies';
const myReduxStore = redux.createStore(...);
vacancies.subscribe(myReduxStore.dispatch);
vacancies.connect(document.getElementById('app-root'));

// ...
```

### 3. Render your app

React component: `UserProfileWrapper.js`

```js
/*
 * Here's a React component that renders a
 * vacancy in the form of a `data-vacancy`
 * attribute, which is sort of like a `src=""`
 * attribute on an <img/>.
 */

export const UserProfileWrapper = ({ id, users }) => {
  const user = users[id];
  return (
    <div data-vacancy={`users/${id}`}>
      { user
        ? <UserProfile user={user}/>
        : <div>Loading...</div>
      }
    </div>
  );
};
```

## API Overview

*TypeScript note: Motel ships with its own TypeScript definitions,
so can be used in both JS and TS apps.*

### `Motel.create()`

Initialize a vacancy observer using this factory function.
Type `T` represents the action type that will be dispatched
from your handler functions described below.

```js
import { Motel } from 'motel';
const vacancies = Motel.create();
```

### `Motel#observe(pattern, handler)`

Match specific vacancies by pattern.

 * `pattern` - `RegExp` or `string`. If string,
    [url-pattern](https://www.npmjs.com/package/url-pattern)
    is used to do the matching.
 * `handler(params, dispatch, exit)` - Callback when a vacancy
    matches the pattern. In other words, as your app renders over
    time, this is called when a vacancy appears in the DOM
    matching the given `pattern`. If duplicate vacancies appear,
    this is only called for the first one. Callback arguments:
    * `params` is a match produced by url-pattern or regex.
    * `dispatch` is a function you can call multiple times to
      stream actions to your reducer. Can be either sync or
      async function.
    * `exit` is a promise which resolves when the vacancy no
      longer exists in the DOM. This may be useful for example
      if a vacancy is used to create a long-running subscription,
      rather than a one-off data fetch. The exit promise would
      then signal when the subscription is no longer needed and
      can be cleaned up. If duplicate vacancies exist, it resolves
      only when the last one exits the DOM.

```js
// One-off HTTP fetch example
vacancies.observe('users/:id', async ({id}, dispatch) => {
  dispatch({ type: 'FETCHING_USER', id });
  const resp = await fetch(`/users/${id}`);
  const user = await resp.json();
  dispatch({ type: 'RECEIVE_USER', id, user });
});
```

```js
// Continuous subscription example
vacancies.observe('users/:id', async ({id}, dispatch, exit) => {
  const type = 'RECEIVE_USER';
  const subscription = websocket.connect(`/users/${id}`)
    .on('update', user => dispatch({ type, id, user }));
  await exit;
  subscription.cancel();
});
```

### `Motel#connect(root)`

Call once. Setup a `MutationObserver` on the given `root`
element. It should live at or above your app's mount node in
the DOM tree, and otherwise not be removed from the DOM over
the life of your app.

```js
vacancies.connect(document.getElementById('root'));
```

### `Motel#subscribe(action => { ... })`

Subscribe to the output of the vacancy observer. The
`subscriber` argument is a function that will be called
many times. Specifically, it will be called whenever an
observer calls its `send()` function, passing along the
argument it was called with.

```js
vacancies.subscribe(myReduxStore.dispatch);
```
