module.exports = {
  extends: ['plugin:cubyn/recommended', 'plugin:prettier/recommended'],
  env: {
    mocha: true
  },
  globals: { expect: true },
  overrides: [
    {
      files: '**/**.spec.js',
      rules: {
        // mocha uses getters for assertions, so unused expressions are expected in spec files
        'no-unused-expressions': 'off',
        'no-undefined': 'off'
      }
    }
  ]
};
