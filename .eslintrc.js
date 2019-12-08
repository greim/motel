module.exports = {
  "env": {
    "es6": true,
    "node": true,
    "mocha": true,
  },
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2017,
    "sourceType": "module",
  },
  "plugins": [
    "@typescript-eslint"
  ],
  "globals": {
    "window": true,
    "document": true,
    "location": true,
    "fetch": true,
    "MutationObserver": true
  },
  "rules": {

    // Possible Errors

    'no-cond-assign': 1, // disallow assignment operators in conditional expressions
    'no-console': 1, // disallow the use of console
    'no-constant-condition': 2, // disallow constant expressions in conditions
    'no-debugger': 2, // disallow the use of debugger
    'no-dupe-args': 2, // disallow duplicate arguments in function definitions
    'no-dupe-keys': 2, // disallow duplicate keys in object literals
    'no-duplicate-case': 2, // disallow duplicate case labels
    'no-empty-character-class': 2, // disallow empty character classes in regular expressions
    'no-ex-assign': 2, // disallow reassigning exceptions in catch clauses
    'no-extra-semi': 1, // disallow unnecessary semicolons
    'no-func-assign': 2, // disallow reassigning function declarations
    'no-inner-declarations': 2, // disallow function or var declarations in nested blocks
    'no-irregular-whitespace': 1, // disallow irregular whitespace outside of strings and comments
    'no-negated-in-lhs': 2, // disallow negating the left operand in `in` expressions
    'no-obj-calls': 2, // disallow calling global object properties as functions
    'no-sparse-arrays': 1, // disallow sparse arrays
    'no-unreachable': 2, // disallow unreachable code after return, throw, continue, and break statements
    'no-unsafe-finally': 2, // disallow control flow statements in finally blocks
    'use-isnan': 2, // require calls to isNaN() when checking for NaN
    'valid-typeof': 2, // enforce comparing typeof expressions against valid strings

    // Best Practices

    'block-scoped-var': 1, // enforce the use of variables within the scope they are defined
    'curly': 1, // enforce consistent brace style for all control statements
    'default-case': 0, // require default cases in switch statements
    'eqeqeq': 1, // require the use of === and !==
    'no-alert': 1, // disallow the use of alert, confirm, and prompt
    'no-caller': 1, // disallow the use of arguments.caller or arguments.callee
    'no-div-regex': 2, // disallow division operators explicitly at the beginning of regular expressions
    'no-eq-null': 1, // disallow null comparisons without type-checking operators
    'no-eval': 2, // disallow the use of eval()
    'no-extend-native': 1, // disallow extending native types
    'no-extra-bind': 1, // disallow unnecessary calls to .bind()
    'no-extra-label': 1, // disallow unnecessary labels
    'no-fallthrough': 1, // disallow fallthrough of case statements
    'no-floating-decimal': 1, // disallow leading or trailing decimal points in numeric literals
    'no-implicit-globals': 1, // disallow var and named function declarations in the global scope
    'no-implied-eval': 2, // disallow the use of eval()-like methods
    'no-iterator': 1, // disallow the use of the __iterator__ property
    'no-lone-blocks': 1, // disallow unnecessary nested blocks
    'no-loop-func': 1, // disallow function declarations and expressions inside loop statements
    'no-multi-spaces': 1, // disallow multiple spaces
    'no-native-reassign': 1, // disallow assignments to native objects or read-only global variables
    'no-new': 1, // disallow new operators outside of assignments or comparisons
    'no-new-func': 1, // disallow new operators with the Function object
    'no-new-wrappers': 1, // disallow new operators with the String, Number, and Boolean objects
    'no-proto': 1, // disallow the use of the __proto__ property
    'no-redeclare': 1, // disallow var redeclaration
    'no-return-assign': 1, // disallow assignment operators in return statements
    'no-script-url': 1, // disallow javascript:0, // urls
    'no-self-assign': 1, // disallow assignments where both sides are exactly the same
    'no-self-compare': 1, // disallow comparisons where both sides are exactly the same
    'no-sequences': 1, // disallow comma operators
    'no-throw-literal': 1, // disallow throwing literals as exceptions
    'no-unmodified-loop-condition': 1, // disallow unmodified loop conditions
    'no-unused-expressions': 1, // disallow unused expressions
    'no-unused-labels': 1, // disallow unused labels
    'no-useless-call': 1, // disallow unnecessary calls to .call() and .apply()
    'no-useless-concat': 1, // disallow unnecessary concatenation of literals or template literals
    'no-useless-escape': 1, // disallow unnecessary escape characters
    'no-with': 2, // disallow with statements
    'radix': 1, // enforce the consistent use of the radix argument when using parseInt()

    // Strict Mode

    strict: 0, // require or disallow strict mode directives

    // Variables

    'no-catch-shadow': 1, // disallow catch clause parameters from shadowing variables in the outer scope
    'no-delete-var': 1, // disallow deleting variables
    'no-label-var': 1, // disallow labels that share a name with a variable
    'no-shadow': 1, // disallow var declarations from shadowing variables in the outer scope
    'no-shadow-restricted-names': 1, // disallow identifiers from shadowing restricted names
    'no-undef': 2, // disallow the use of undeclared variables unless mentioned in /*global */ comments
    'no-unused-vars': 1, // disallow unused variables

    // Node.js and CommonJS

    'global-require': 1, // require require() calls to be placed at top-level module scope
    'no-new-require': 1, // disallow new operators with calls to require

    // Stylistic Issues

    'brace-style': [1, "1tbs", { "allowSingleLine":true }], // enforce consistent brace style for blocks
    'camelcase': [1, { "properties":"never" }], // enforce camelcase naming convention
    'comma-dangle': [1, "always-multiline"], // require or disallow trailing commas
    'comma-spacing': 1, // enforce consistent spacing before and after commas
    'comma-style': [1, "last"], // enforce consistent comma style
    'computed-property-spacing': 1, // enforce consistent spacing inside computed property brackets
    'consistent-this': 1, // enforce consistent naming when capturing the current execution context
    'indent': ["warn", 2, { "SwitchCase":1 }], // enforce consistent indentation
    'key-spacing': 1, // enforce consistent spacing between keys and values in object literal properties
    'keyword-spacing': [1, { "overrides":{ "catch":{ "after":false } } }], // enforce consistent spacing before and after keywords
    'linebreak-style': 1, // enforce consistent linebreak style
    'max-nested-callbacks': [1, { "max":5 }], // enforce a maximum depth that callbacks can be nested
    'max-params': [1, { "max":5 }], // enforce a maximum number of parameters in function definitions
    'new-cap': [1, { "capIsNew":false }], // require constructor function names to begin with a capital letter
    'new-parens': 1, // require parentheses when invoking a constructor with no arguments
    'no-array-constructor': 1, // disallow Array constructors
    'no-mixed-spaces-and-tabs': 1, // disallow mixed spaces and tabs for indentation
    'no-nested-ternary': 1, // disallow nested ternary expressions
    'no-new-object': 1, // disallow Object constructors
    'no-spaced-func': 1, // disallow spacing between function identifiers and their applications
    'no-trailing-spaces': 1, // disallow trailing whitespace at the end of lines
    'quotes': [1, "single"], // enforce the consistent use of either backticks, double, or single quotes
    'semi': 1, // require or disallow semicolons instead of ASI
    'semi-spacing': 1, // enforce consistent spacing before and after semicolons
    'space-before-blocks': 1, // enforce consistent spacing before blocks
    'space-before-function-paren': [1, "never"], // enforce consistent spacing before function definition opening parenthesis
  }
}
