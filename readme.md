# Motel

*Motel* is an implementation of the [vacancy observer pattern](https://gist.github.com/greim/3de3bcb71a672e11c75e371b7b81f4bb), which simplifies data-fetching in unidirectional data-flow apps like Elm or React/Redux by eliminating the need to use side-effects, hooks or lifecycle methods.

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

vacancies.listen('users/:id', async function(params, send) {
  const id = params.id;
  send({ type: 'FETCHING_USER', id });
  const resp = await fetch(`/users/${id}`);
  const user = await resp.json();
  send({ type: 'RECEIVE_USER', id, user });
});
```

### 2. Wire it up

```js
// main.js

import vacancies from './vacancies';
const myReduxStore = redux.createStore(...);
vacancies.subscribe(myReduxStore.dispatch);
vacancies.connect(document.getElementById('app-root'));
```

### 3. Render your app

```js
const UserComponent = ({ user }) => {
  if (!user) {
    return <div data-vacancy={`users/${id}`}>Loading...</div>;
  } else {
    return <div>{user.name}’s Profile</div>;
  }
};
```

## API

### `Motel.create()` (Factory Function)

Initialize a vacancy observer using this factory function.

```js
import { Motel } from 'motel';
const vacancies = Motel.create();
```

### `Motel#listen(pattern, handler)` (Method)

Match specific vacancies by pattern. Conceptually similar to URL routing.

 * `pattern` - Regex or string. If string, [url-pattern](https://www.npmjs.com/package/url-pattern) is used.
 * `handler(params, send, exit)` - Callback when a vacancy matches the pattern.
   * `params` is a match produced by url-pattern or regex.
   * `send` is a function you can call multiple times to stream actions to your reducer. Can be either sync or async function.
   * `exit` is a promise which resolves when the vacancy is no longer present. This may be useful for example if vacancy presence is used to signal a long-running subscription, rather than a one-off data fetch. The exit promise would then signal when the subscription is no longer needed and can be cleaned up.

```js
// HTTP fetch example
vacancies.listen('users/:id', async ({id}, send) => {
  send({ type: 'FETCHING_USER', id });
  const resp = await fetch(`/users/${id}`);
  const user = await resp.json();
  send({ type: 'RECEIVE_USER', id, user });
});
```

```js
// subscription example
vacancies.listen('users/:id', async ({id}, send, exit) => {
  const type = 'RECEIVE_USER';
  const subscription = websocket.connect(`/users/${id}`);
  subscription.on('update', user => send({ type, id, user }));
  await exit;
  subscription.destroy();
});
```

### `Motel#connect(root)` (Method) (DOM-Dependent)

Call once. Start observing vacancies under the given root element. `root` should live at or above your app's mount node in the DOM tree, and otherwise not disappear over the life of your app.

```js
vacancies.connect(document.getElementById('root'));
```

### `Motel#disconnect()` (Method) (DOM-Dependent)

Stop observing vacancies.

```js
vacancies.disconnect();
```

### `Motel#subscribe(subscriber)` (Method)

Subscribe to the output of the vacancy observer. The `subscriber` argument is a function that will be called many times. Specifically, it will be called whenever a vacancy listener calls its `send()` function, passing along the argument it was called with.

```js
vacancies.subscribe(myReduxStore.dispatch);
```
