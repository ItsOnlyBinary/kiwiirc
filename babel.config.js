module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                useBuiltIns: 'entry',
                modules: 'commonjs',
                corejs: { version: 3, proposals: true },
            },
        ],
    ],
    plugins: [['@babel/plugin-transform-runtime', { corejs: 3, useESModules: true }]],
    exclude: [/core-js/],
};
