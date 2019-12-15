# Motel

Motel simplifies data-fetching in systems like Elm and React by
eliminating the need to use side-effects for triggering remote 
data reads. It uses *vacancy observers* to accomplish this:

Link: **[Overview of Vacancy Observers](https://gist.github.com/greim/3de3bcb71a672e11c75e371b7b81f4bb)**

## Installation

```bash
npm install motel
```

## API Documentation

Motel is a TypeScript project. Documentation is generated using
`typedoc` and is available under the `docs/` folder as HTML, or
via GitHub pages.

Link: [Motel API Documentation](https://greim.github.io/motel/)

```js
import Motel from 'motel';

const vacancies = Motel
  .create()
  .observe(...observer callback...)
  .connect(document.querySelector('#root'));
```
