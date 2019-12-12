# Motel

Motel is an implementation of the
[vacancy observer pattern](https://gist.github.com/greim/3de3bcb71a672e11c75e371b7b81f4bb).
It simplifies data-fetching in systems like
Elm or React by eliminating the need to use
side-effects, hooks or lifecycle methods to
trigger network requests and the like.

## Installation

```bash
npm install motel
```

## Example Usage

### 1. Add vacancy listeners

```js
// vacancies.js

import { Motel } from 'motel';
export const vacancies = Motel.create();

vacancies.listen('users/:id', async ({ id }, dispatch, exit) => {

  /*
   * Somewhere in the DOM, one or more elements
   * have appeared with declared dependencies on
   * "users/:id".
   *
   * Perform data-fetching. Set up a websocket or
   * a poller. Call your GraphQL service. Etc.
   * Send these updates to your dispatcher by
   * calling dispatch().
   */

  await exit;

  /*
   * All elements with "users/:id" dependencies
   * have left the DOM.
   *
   * Do necessary cleanup. Unregister websockets,
   * cancel pollers, dispatch deletion actions.
   */
});
```

### 2. Wire it up

```js
// main.js

/*
 * This is some boilerplatey stuff that you
 * would do for example in your Redux app's
 * main.js entry-point module.
 */

import vacancies from './vacancies';
const myReduxStore = redux.createStore(...);
vacancies.subscribe(myReduxStore.dispatch);
vacancies.connect(document.getElementById('app-root'));
```

### 3. Render your app

```js
// UserProfileWrapper.js

/*
 * Here's a React component that renders a
 * vacancy. Think of it sort of like the
 * `src` attribute on an <img/> tag.
 */

export const UserProfileWrapper = ({ id }) => {
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

## API

Motel ships with its own TypeScript definitions, so can be
used in both JS and TS apps.

### `Motel.create()` (Factory Function)

Initialize a vacancy observer using this factory function.
Type `T` represents the action type that will be dispatched
from your handler functions described below.

```js
import { Motel } from 'motel';
const vacancies = Motel.create();
```

### `Motel#listen(pattern, handler)` (Method)

Match specific vacancies by pattern.

 * `pattern` - `RegExp` or `string`. If string,
    [url-pattern](https://www.npmjs.com/package/url-pattern)
    is used to do the matching.
 * `handler(params, dispatch, exit)` - Callback when a vacancy
    matches the pattern. In other words, this is called when
    a vacancy appears in the DOM that patches the `pattern`.
    If duplicate vacancies appear, this is only called when
    the first one it appears. Arguments:
    * `params` is a match produced by url-pattern or regex.
    * `dispatch` is a function you can call multiple times to
      stream actions to your reducer. Can be either sync or
      async function.
    * `exit` is a promise which resolves when the vacancy is
      no longer present. This may be useful for example if
      vacancy presence is used to signal a long-running
      subscription, rather than a one-off data fetch. The exit
      promise would then signal when the subscription is no
      longer needed and can be cleaned up. If duplicate vacancies
      exist, this is only called when the last one exits the DOM.

```js
// One-off HTTP fetch example
vacancies.listen('users/:id', async ({id}, send) => {
  send({ type: 'FETCHING_USER', id });
  const resp = await fetch(`/users/${id}`);
  const user = await resp.json();
  send({ type: 'RECEIVE_USER', id, user });
});
```

```js
// Continuous subscription example
vacancies.listen('users/:id', async ({id}, send, exit) => {
  const type = 'RECEIVE_USER';
  const subscription = websocket.connect(`/users/${id}`)
    .on('update', user => send({ type, id, user }));
  await exit;
  subscription.cancel();
});
```

### `Motel#connect(root)` (Method) (DOM-Dependent)

Call once. Start observing vacancies under the given root
element. `root` should live at or above your app's mount
node in the DOM tree, and otherwise not disappear over the
life of your app.

```js
vacancies.connect(document.getElementById('root'));
```

### `Motel#disconnect()` (Method) (DOM-Dependent)

Stop observing vacancies.

```js
vacancies.disconnect();
```

### `Motel#subscribe(action => { ... })` (Method)

Subscribe to the output of the vacancy observer. The
`subscriber` argument is a function that will be called
many times. Specifically, it will be called whenever a
vacancy listener calls its `send()` function, passing
along the argument it was called with.

```js
vacancies.subscribe(myReduxStore.dispatch);
```
