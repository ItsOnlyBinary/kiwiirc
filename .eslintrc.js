module.exports = {
    root: true,
    parserOptions: {
        parser: 'babel-eslint',
        sourceType: 'module'
    },
    extends: [
        'airbnb-base',
        'plugin:prettier/recommended',
        'prettier/standard',
        'plugin:vue/recommended',
    ],
    env: {
        'browser': true,
    },
    // required to lint *.vue files
    plugins: [
        'vue',
        'prettier',
    ],
    // add your custom rules here
    'rules': {
        "prettier/prettier": "error",
        'class-methods-use-this': 0,
        'import/extensions': 0,
        'import/no-extraneous-dependencies': 0,
        'import/no-unresolved': 0,
        'import/prefer-default-export': 0,
        'no-continue': 0,
        'no-multi-assign': 0,
        'no-param-reassign': ['error', { 'props': false }],
        'no-plusplus': 0,
        'no-prototype-builtins': 0,
        'prefer-promise-reject-errors': 0,
        'no-control-regex': 0,
        'object-shorthand': 0,
        'operator-linebreak': 0,
        'prefer-const': 0,
        'prefer-destructuring': 0,
        'prefer-template': 0,
        'vue/html-indent': ['error', 4],
        'vue/max-attributes-per-line': 0,
        'vue/require-prop-types': 0,
        'vue/require-default-prop': 0,
    }
}
