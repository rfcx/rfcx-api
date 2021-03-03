module.exports = {
  env: {
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'standard',
    'plugin:promise/recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  plugins: [
    'jest'
  ],
  rules: {
  }
}
