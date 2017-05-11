# Motel

*Motel* is an implementation of the [data vacancy pattern](https://medium.com/@greim/a-plan-for-data-fetching-a68d171af38), which simplifies data-fetching in unidirectional data-flow apps. It was designed with Redux in mind, but has no explicit dependencies on Redux and can be used anywhere.

**Note:** Motel is in a 0.x state, and isn't quite ready for prime time.

## Installation

```bash
npm install motel
```

## Example Usage

### 1. Add vacancy listeners

```js
// vacancies.js

// this module creates any number of vacancy listeners,
// sending output via the send() function. Anything can be
// sent, but in a Redux app they'd be action objects
// shaped like this: { type, ... }

const motel = require('motel');
const vacancies = motel();

vacancies.listen('users[:id]', async function(params, send) {
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

// This is where we setup our store and kick off our app.
// The observe() call sets up DOM => Motel data-flow.
// The subscribe() call sets up Motel => Redux data-flow.

const vacancies = require('./vacancies');
const myReduxStore = redux.createStore(...);
vacancies.connect(document.getElementById('app-root'));
vacancies.subscribe(myReduxStore.dispatch);
```

### 3. Render your app

```js
// user-profile.jsx

// simply render a vacancy upon encountering missing data,
// using a value that matches a vacancy listener above. When
// unit testing this component, you can simply check that it
// renders vacancies correctly on a given input.

if (!user) {
  return <div data-vacancy={`users[${id}]`}>Loading...</div>;
} else {
  return <div>{user.name}’s Profile</div>;
}
```

## API

### `motel` (Factory Function)

Initialize a vacancy observer using this factory function.

```js
const motel = require('motel');
const vacancies = motel();
```

### `Motel#listen(pattern, handler)` (Method)

Match specific vacancies by pattern. This is conceptually similar to URL routing.

 * `pattern` - Either a regex or a string. If string, [url-pattern](https://www.npmjs.com/package/url-pattern) will be used to create a pattern object.
 * `handler(params, send)` - Callback function for when an observed vacancy matches the above pattern. `params` argument will be whatever match object was produced by url-pattern or a regex. `send` is a function you can call over and over to stream actions to your dispatcher. In a future version of this library, the plan is to support [async generators](https://jakearchibald.com/2017/async-iterators-and-generators/#async-generators-creating-your-own-async-iterator) here, in which case you can `yield thing` rather than `send(thing)`.

```js
vacancies.listen('users[:id]', async function(params, send) {
  const id = params.id;
  send({ type: 'FETCHING_USER', id });
  const resp = await fetch(`/users/${id}`);
  const user = await resp.json();
  send({ type: 'RECEIVE_USER', id, user });
});
```

Alternatively, use a regex...

```js
vacancies.listen(/^users\[(.+)\]$/, async function(match, send) {
  const id = match[1];
  ...
});
```

### `Motel#connect(elmt)` (Method) (DOM-Dependent)

Start listening for mutations at the given root DOM element. `elmt` should live at or above your app's mount node in the DOM tree, and otherwise not disappear over the life of your app. Note: `connect` and `disconnect` are the only methods in this lib that require a DOM implementation to be present.

```js
vacancies.connect(document.getElementById('root'));
```

### `Motel#disconnect()` (Method) (DOM-Dependent)

In case you want to remove a previously-created mutation observer. Note: `connect` and `disconnect` are the only methods in this lib that require a DOM implementation to be present.

```js
vacancies.disconnect();
```

### `Motel#subscribe(subscriber)` (Method)

Subscribe to the stream of updates produced by the `publish` function mentioned above. The `subscriber` argument is a function which receives an action which can be fed (for example) into a Redux reducer.

```js
vacancies.subscribe((action) => {
  myReduxStore.dispatch(action);
});
```

### `Motel#publish(vacancy)` (Method)

Manually publish a vacancy. You may not need to call this since the mutation observer calls this internally. However this can be useful for example if Motel is being used in a JS environment without a DOM implementation, allowing alternate mechanisms to publish vacancies.

```js
vacancies.publish('users[u123]');
```

## The Data Vacancy Pattern

Read more here: https://medium.com/@greim/a-plan-for-data-fetching-a68d171af38
