# Motel

Motel is an implementation of the data vacancy pattern, which simplifies data-fetching in Flux-style apps. It was designed with Redux in mind, but can be used in any model-view-update app.

## Installation

```bash
npm install motel
```

## How it works

### 1. Add vacancies

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

### 3. Render vacancies

```js
// some-component.jsx

if (!user) {
  return <div data-vacancy={`users:${id}`}>Loading...</div>;
} else {
  return <div>{user.name}’s Profile</div>;
}
```

## The Data Vacancy Pattern

The data vacancy pattern addresses the question of how to handle data-fetching in a Flux-style app. It does so by treating the rendered UI as the system of record for fetch-needs.

We'll use the Elm architecture as an example, since it's a good distillation of Flux, and also provided the inspiration for Redux. An Elm app consists of model, view, and update components.

This architecture is pristinely simple, until you try to add data-fetching. Then things start getting complicated, since neither the model, the view, nor the update are concerned with asynchronous data requests.

The data vacancy pattern moves data-fetching into a separate module. For input, it observes data-vacancies in the DOM. Its output is a stream of dispatch events feeding into the update mechanism.
