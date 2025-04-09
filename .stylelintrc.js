module.exports = {
    plugins: ['@stylistic/stylelint-plugin'],
    extends: [
        'stylelint-config-standard',
        'stylelint-config-recommended',
        'stylelint-config-recommended-vue',
        'stylelint-config-recommended-vue/scss',
        'stylelint-config-standard-scss',
        'stylelint-config-recommended-scss',
    ],
    overrides: [
        {
            files: ['**/*.vue', '**/*.html'],
            customSyntax: 'postcss-html',
        },
        {
            files: [
                '**/*.scss',
            ],
            customSyntax: 'postcss',
            extends: [
                'stylelint-config-recess-order',
            ],
        },
        {
            files: [
                '**/StateBrowser*.vue',
            ],
            customSyntax: 'postcss-html',
            extends: [
                'stylelint-config-recess-order',
            ],
            rules: {
                'alpha-value-notation': 'number',
                'color-function-notation': 'legacy',
                'declaration-block-no-redundant-longhand-properties': true,
                'media-feature-range-notation': 'prefix',
                'property-no-vendor-prefix': true,
                'scss/double-slash-comment-whitespace-inside': 'always',
                'shorthand-property-no-redundant-values': true,
            },
        },
    ],
    rules: {
        'alpha-value-notation': null,
        'color-function-notation': null,
        'declaration-block-no-redundant-longhand-properties': null,
        'declaration-no-important': true,
        'declaration-property-value-no-unknown': null, // breaks css round()"
        'media-feature-range-notation': null,
        'no-descending-specificity': null,
        'number-max-precision': null,
        'property-no-vendor-prefix': null,
        'value-keyword-case': [
            'lower',
            {
                ignoreFunctions: ['v-bind'],
            },
        ],
        'scss/at-rule-no-unknown': [
            true,
            {
                ignoreAtRules: [
                    'each',
                    'else',
                    'extends',
                    'for',
                    'function',
                    'if',
                    'ignores',
                    'include',
                    'media',
                    'mixin',
                    'return',
                    'use',

                    // Font Awesome 4
                    'fa-font-path',
                ],
            },
        ],
        'selector-class-pattern': [
            '^[a-z]([-]?[a-z0-9]+)*(__[a-z0-9]([-]?[a-z0-9]+)*)?(--[a-z0-9]([-]?[a-z0-9]+)*)?$',
            {
                /** This option will resolve nested selectors with & interpolation. - https://stylelint.io/user-guide/rules/selector-class-pattern/#resolvenestedselectors-true--false-default-false */
                resolveNestedSelectors: true,
                /** Custom message */
                message: function expected(selectorValue) {
                    return `Expected class selector "${selectorValue}" to match BEM CSS pattern https://en.bem.info/methodology/css. Selector validation tool: https://regexr.com/3apms`;
                },
            },
        ],
        'scss/double-slash-comment-empty-line-before': null,
        'scss/double-slash-comment-whitespace-inside': null,
        'scss/no-global-function-names': null,
        'shorthand-property-no-redundant-values': null,

        '@stylistic/color-hex-case': 'lower',
        '@stylistic/indentation': 4,
        // '@stylistic/no-empty-first-line': true,
        '@stylistic/number-leading-zero': 'always',
        '@stylistic/property-case': 'lower',
        '@stylistic/string-quotes': 'single',
        '@stylistic/unit-case': 'lower',
    },
};
