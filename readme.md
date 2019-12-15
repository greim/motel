# Motel

Motel simplifies data-fetching in systems like Elm and React by
eliminating the need to use side-effects for triggering remote 
data reads. It uses *vacancy observers* to accomplish this.

Link: **[Overview of Vacancy Observers](https://gist.github.com/greim/3de3bcb71a672e11c75e371b7b81f4bb)**

## Installation

```bash
npm install motel
```

## API Documentation

Documentation is produced using [typedoc](https://typedoc.org/)
and is available under the `docs/` folder of the git repo, and
also on the web via GitHub pages.

Link: **[Full API Documentation](https://greim.github.io/motel/)**

## Quick Example

```js
// basic sequence

import Motel from 'motel';

const vacancies = Motel.create()
  .observe(...observer callback...)
  .observe(...observer callback...)
  .observe(...observer callback...)
  .subscribe(action => store.dipatch(action))
  .connect(document.querySelector('#root'));
```
