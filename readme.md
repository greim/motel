# Motel: Side-effect free data-fetching

## Remote data dependencies

React is a function of state, so one of our jobs as developers is making that state available. Sometimes it's available locally; either hard-coded in the source or provided by the user. Other times it's available remotely; for example stored in the cloud. These *remote data dependencies* are essentially the "R" in [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete).

## The vacancy observer pattern

Typically, in order to know when to fetch remote data dependencies, we're forced to use lifecycle events, which are side effects. This lib uses the [vacancy observer pattern](https://gist.github.com/greim/3de3bcb71a672e11c75e371b7b81f4bb) to fetch remote data dependencies without side effects, thus keeping UI logic closer to the *pure function of application state* ideal.

## Prerequisites

This lib has no dependencies or requirements of React.

The prerequisite is rather that you're using an approach where state is managed centrally, and where UI components are a pure function of application state. React+Redux and Elm are both examples of this.

## Installation

```bash
npm install motel
```

## API Documentation

Documentation is available under the `docs/` folder of this repo, and also [online](https://greim.github.io/motel/).

## Quick Example

## In your `main.js` entry-point

Import or require this library.

```js
import Motel from 'motel';
const Motel = require('motel');
```

Grab a reference to the "mount node" of your app.

```js
const mountNode = document.querySelector('#root');
```

Initialize the motel instance. This exists for the lifetime of the app.

```js
const vacancies = Motel.create();
```

Setup handler for all vacancies as they occur.

```js
vacancies.observe('*', (url, dispatch) => {
  dispatch({ type: 'requested', url });
  const response = await fetcfh(url);
  const data = await response.json();
  dispatch({ type: 'received', url, data });
});
```

Capture the output of the above callbacks.

```js
vacancies.subscribe(action => store.dipatch(action));
```

Start observing vacancies on the DOM subtree of the mount node.

```js
vacancies.connect(mountNode);
```

## In any React component

Simply render data vacancies on any component with a remote data dependency.

```jsx
function UserProfile(props) {
  return (
    <div data-vacancy="/api/users/xxxxxxxx">
      ...content here...
    </div>
  );
}
```

## Further examples

For more in-depth examples, refer to `examples.md` in this same repo.
