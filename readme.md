# Motel

*Motel* is an implementation of the [data vacancy pattern](https://medium.com/@greim/a-plan-for-data-fetching-a68d171af38), which simplifies data-fetching in Flux-style apps. It was designed with Redux in mind, but can be used in any unidirectional data-flow app.

## Experimental!

Note: This lib is in a 0.x state, and is likely not quite ready for prime time. It may contain bugs, and/or the API might change as I try it out and get feedback from the community.

## Installation

```bash
npm install motel
```

## Example Usage

### 1. Add vacancy observers

```js
// vacancies.js

// this module creates any number of vacancy observers,
// sending output to the send() function. In a Redux app,
// arguments passed to send() would be Redux action objects.

const motel = require('motel');
const vacancies = motel();

vacancies.add('users[:id]', async function(match, send) {
  const id = match.id;
  send({ type: 'fetchingUser', id });
  const resp = await fetch(`/users/${id}`);
  const user = await resp.json();
  send({ type: 'receiveUser', id, user });
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
vacancies.observe(document.body);
vacancies.subscribe(myReduxStore.dispatch);
```

### 3. Render your app

```js
// user-profile.jsx

// simply render a vacancy upon encountering missing data,
// using a key matching a vacancy observer above. When unit
// testing your component, you can simply check that it
// renders vacancies correctly on a given input.

if (!user) {
  return <div data-vacancy={`users[${id}]`}>Loading...</div>;
} else {
  return <div>{user.name}’s Profile</div>;
}
```

## API

### `motel` (Factory Function)

The constructor isn't exposed. Create a `Motel` instance using this factory function. Accepts no args.

```js
const motel = require('motel');
const vacancies = motel();
```

### `Motel#add(pattern, handler)` (Method)

Create a vacancy observer.

 * `pattern` - Either a regex or a string. If string, [url-pattern](https://www.npmjs.com/package/url-pattern) will be used to create a pattern object.
 * `handler(params, send)` - Function which will be called when a vacancy matches the above pattern. `params` argument will be whatever match object was produced by url-pattern or a regex. `send` is a function you can call over and over to stream actions to your dispatcher. In a future version of this library, the plan is to support [async generators](https://jakearchibald.com/2017/async-iterators-and-generators/#async-generators-creating-your-own-async-iterator) here, in which case you can `yield` things rather than `send()` them.

```js
vacancies.add('users[:id]', async function(params, send) {
  const id = params.id;
  send({ type: 'fetchingUser', id });
  const resp = await fetch(`/users/${id}`);
  const user = await resp.json();
  send({ type: 'receiveUser', id, user });
});
```

Alternatively, use a regex...

```js
vacancies.add(/^users\[(.+)\]$/, async function(params, send) {
  const id = params[1];
  ...
});
```

### `Motel#observe(element)` (Method) (DOM-Dependent)

Sets up a mutation observer on the given DOM element. `element` should live at or above your app's mount node in the tree, and otherwise not disappear over the life of your app. Note: Most Motel instance methods can run in non-browser environments such as node.js. However, this requires a DOM implementation.

```js
vacancies.observe(document.getElementById('root'));
```

### `Motel#unobserve()` (Method) (DOM-Dependent)

In case you want to remove the previously-created mutation observer. Note: Most Motel instance methods can run in non-browser environments such as node.js. However, this requires a DOM implementation.

```js
vacancies.unobserve();
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

The [data vacancy pattern](https://medium.com/@greim/a-plan-for-data-fetching-a68d171af38) addresses data-fetching in unidirectional data-flow apps by treating the rendered UI as the system of record for fetch-needs. This is based on the fact that the only place in our app we know what data we need is the render function.

We'll use The Elm Architecture (TEA) as an example, since it's a good distillation of unidirectional data-flow, and also inspired the popular framework Redux. An Elm app has a model, view, and an update component.

TEA is reactive and simple, until you start mixing in imperative data-fetching logic. Then things start getting complicated, since neither the model, the view, nor the update know or care about asynchronous data requests. Adding fetches to any of these compromises the architecture.

The data vacancy pattern moves data-fetching into a separate module. For input, it observes data-vacancies in the DOM. Its output is a stream of dispatch events feeding back into the update mechanism. This maintains separation of concerns and re-establishes reactivity and unidirectional data-flow.

![architectural drawing](./dv-arch.png?raw=true)
