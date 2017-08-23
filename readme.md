# Motel

*Motel* is an implementation of the [vacancy observer pattern](https://medium.com/@greim/a-plan-for-data-fetching-a68d171af38), which simplifies data-fetching in unidirectional data-flow apps. It was designed with Redux in mind, but has no explicit dependencies on Redux or React.

## Installation

```bash
npm install motel
```

## Example Usage

### 1. Add vacancy listeners

```js
// vacancies.js

const motel = require('motel');
const vacancies = motel();

vacancies.listen('users/:id', async function(params, send) {
  const id = params.id;
  send({ type: 'FETCHING_USER', id });
  const resp = await fetch(`/users/${id}`);
  const user = await resp.json();
  send({ type: 'RECEIVE_USER', id, user });
});

module.exports = vacancies;
```

### 2. Wire it up

```js
// main.js

const vacancies = require('./vacancies');
const myReduxStore = redux.createStore(...);
vacancies.connect(document.getElementById('app-root'));
vacancies.subscribe(myReduxStore.dispatch);
```

### 3. Render your app

```js
// user-profile.jsx

if (!user) {
  return <div data-vacancy={`users/${id}`}>Loading...</div>;
} else {
  return <div>{user.name}’s Profile</div>;
}
```

## API

### `motel()` (Factory Function)

Initialize a vacancy observer using this factory function.

```js
const motel = require('motel');
const vacancies = motel();
```

### `Motel#listen(pattern, handler)` (Method)

Match specific vacancies by pattern. Conceptually similar to URL routing.

 * `pattern` - Regex or string. If string, [url-pattern](https://www.npmjs.com/package/url-pattern) is used.
 * `handler(params, send)` - Callback when a vacancy matches the pattern. `params` is whatever is produced by a match against url-pattern or regex. `send` is a function you can call multiple times to stream actions to your reducer. Can be either sync or async function.

```js
vacancies.listen('users/:id', async function(params, send) {
  const id = params.id;
  send({ type: 'FETCHING_USER', id });
  const resp = await fetch(`/users/${id}`);
  const user = await resp.json();
  send({ type: 'RECEIVE_USER', id, user });
});
```

#### Note about multiple vacancies

You can declare a single vacancy by rendering this DOM:

```html
<div data-vacancy="foo/aaa"></div>
```

In order to declare multiple vacancies at once, render a JSON-stringified array into the attribute, instead of a plain string:

```html
<div data-vacancy='["foo/aaa", "foo/bbb"]'></div>
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

Subscribe to the output of the vacancy observer. The `subscriber` argument is a function called arbitrarily many times, which receives an action object to be fed into a Redux reducer.

```js
vacancies.subscribe(myReduxStore.dispatch);
```

### `Motel#publish(vacancyString)` (Method)

Manually publish a vacancy, even if you haven't called `connect()`.

```js
vacancies.publish('users/u123');
```
