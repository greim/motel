# Motel

*motel* is an implementation of the data vacancy pattern, which simplifies data-fetching in Flux-style apps. It was designed with Redux in mind, but can be used in any unidirectional data-flow app.

## Installation

```bash
npm install motel
```

## Getting started

### 1. Declare vacancies

```js
// my-motel.js

const motel = require('motel');
const myMotel = module.exports = motel();

myMotel.vacancy(/users:(.+)/, async function(match, publish) {
  const [,id] = match;
  publish({ type: 'fetchingUser', id });
  const resp = await fetch(`/users/${id}`);
  const user = await resp.json();
  publish({ type: 'receiveUser', id, user });
});
```

### 2. Wire it up

```js
// main.js

const myMotel = require('./my-motel');
const store = redux.createStore(...);
myMotel.subscribe(myReduxStore.dispatch);
myMotel.observe(document.body);
```

### 3. Render your app

```js
// some-component.jsx

if (!user) {
  return <div data-vacancy={`users:${id}`}>Loading...</div>;
} else {
  return <div>{user.name}’s Profile</div>;
}
```

## The Data Vacancy Pattern

The data vacancy pattern addresses data-fetching in Flux-style apps by treating the rendered UI as the system of record for fetch-needs. This is a recognition of the fact that the only place in our app we know what data we need is the render function.

We'll use the Elm architecture as an example, since it's a good distillation of Flux, and also inspired popular frameworks like Redux. An Elm app has a model, view, and an update component.

This architecture is pristinely simple, until you start mixing in your data-fetching logic. Then things start getting complicated, since neither the model, the view, nor the update know or care about asynchronous data requests. Adding fetches to any of these compromises the architecture.

The data vacancy pattern moves data-fetching into a separate module. For input, it observes data-vacancies in the DOM. Its output is a stream of dispatch events feeding back into the update mechanism.

![architectural drawing](./dv-arch.png?raw=true)
