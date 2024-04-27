module.exports = {
  env: {
    es6: true,
    node: true,
    mocha: true,
  },
  parser: '@typescript-eslint/parser',
  extends: ['plugin:@typescript-eslint/eslint-recommended'],
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  globals: {
    window: true,
    document: true,
    location: true,
    fetch: true,
    MutationObserver: true,
  },
  rules: {
    'prettier/prettier': 'warn',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        args: 'all',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    '@typescript-eslint/consistent-type-imports': 'warn',
    'object-shorthand': 'warn',
    'no-console': 'warn',
  },
};
