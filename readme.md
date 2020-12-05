# Motel: Side-effect free data-fetching

In order to know _when_ to fetch data, we typically use lifecycle events, for example when a component mounts. Motel uses the [vacancy observer pattern](https://gist.github.com/greim/3de3bcb71a672e11c75e371b7b81f4bb) to avoid the need for such side-effects, thus keeping components simpler.

## Installation

```bash
npm install motel
```

## API Documentation

Documentation is available under the `docs/` folder of this repo, and also [online](https://greim.github.io/motel/).

## Quick Example

```js
// Your main.js entrypoint

import Motel from 'motel';

const mountElement = document.querySelector('#root');

const vacancies = Motel.create()
  .observe(...observer callback...)
  .observe(...observer callback...)
  .observe(...observer callback...)
  .subscribe(action => store.dipatch(action))
  .connect(mountElement);
```
