const { merge } = require('webpack-merge');

const ESLintPlugin = require('eslint-webpack-plugin');
const ESLintFormatter = require('eslint-formatter-friendly');
const { VueLoaderPlugin } = require('vue-loader');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const HTMLPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { DefinePlugin } = require('webpack');
const FriendlyErrorsWebpackPlugin = require('@soda/friendly-errors-webpack-plugin');

const ConvertLocalesPlugin = require('../plugins/webpack/convert-locales');

const utils = require('../utils');
const pkg = require('../../package.json');

const cssConfig = require('./css');

module.exports = (env, argv, config) => {
    const outputFileName = `static/js/[name]${!env.WEBPACK_SERVE ? '.[contenthash:8]' : ''}.js`;

    let sourceMap;

    if (config.mode === 'development') {
        sourceMap = env.WEBPACK_SERVE ? 'eval-source-map' : 'source-map';
    }

    const baseConfig = merge(config, {
        context: process.cwd(),

        entry: {
            app: './src/main.js',
        },

        devtool: sourceMap,

        output: {
            path: utils.pathResolve('dist'),
            publicPath: 'auto',
            filename: outputFileName,
            chunkFilename: outputFileName,
        },

        resolve: {
            alias: {
                '@': utils.pathResolve('src'),
                'vue': 'vue/dist/vue.esm-bundler.js',
            },
            fallback: {
                stream: require.resolve('stream-browserify'),
            },
            extensions: ['.js', '.jsx', '.vue', '.json'],
        },

        resolveLoader: {
            modules: [
                utils.pathResolve('node_modules'),
                utils.pathResolve('build/plugins/webpack'),
            ],
        },

        performance: {
            maxEntrypointSize: 1.6 * utils.MiB,
            maxAssetSize: 1 * utils.MiB,
        },

        plugins: [
            new ESLintPlugin({
                emitError: true,
                emitWarning: true,
                extensions: ['.ts', '.tsx', '.js', '.jsx', '.vue'],
                formatter: ESLintFormatter,
            }),
            new VueLoaderPlugin(),
            new CaseSensitivePathsPlugin(),
            new ConvertLocalesPlugin(),
            new HTMLPlugin({
                template: utils.pathResolve('static/index.html'),
                templateParameters: {
                    NODE_ENV: env.NODE_ENV,
                },
                minify: false,
            }),
            new CopyPlugin({
                patterns: [
                    {
                        from: utils.pathResolve('static'),
                        to: utils.pathResolve('dist/static'),
                        toType: 'dir',
                        globOptions: {
                            ignore: ['.DS_Store', '**/index.html', '**/config.local.json'],
                        },
                        info: {
                            minimized: true,
                        },
                        noErrorOnMissing: true,
                    },
                ],
            }),
            new DefinePlugin({
                // TODO
                '__VERSION__': JSON.stringify(pkg.version),
                '__COMMITHASH__': JSON.stringify(utils.getCommitHash()),

                // Vue 3 feature flags http://link.vuejs.org/feature-flags
                '__VUE_OPTIONS_API__': 'true',
                '__VUE_PROD_DEVTOOLS__': 'false',

                'process.env': {},
            }),
            new FriendlyErrorsWebpackPlugin(),
        ],

        module: {
            rules: [
                {
                    test: /\.vue$/,
                    use: [
                        {
                            loader: 'vue-loader',
                            options: {
                                transformAssetUrls: {
                                    object: ['data'],
                                },
                            },
                        },
                        'exports-loader',
                    ],
                },

                {
                    test: /\.js$/,
                    // TODO
                    // eslint-disable-next-line arrow-body-style
                    exclude: (file) => {
                        // always transpile js in vue files
                        // if (/\.vue\.jsx?$/.test(file)) {
                        //     return false;
                        // }
                        // Don't transpile node_modules
                        return /node_modules/.test(file);
                    },
                    use: ['thread-loader', 'exports-loader', 'babel-loader'],
                },

                // images
                {
                    test: /\.(png|jpe?g|gif|webp)(\?.*)?$/,
                    type: 'asset',
                    generator: { filename: 'static/img/[name].[contenthash:8][ext][query]' },
                },

                // svg
                {
                    test: /\.(svg)(\?.*)?$/,
                    type: 'asset/resource',
                    generator: { filename: 'static/img/[name].[contenthash:8][ext][query]' },
                },

                // media
                {
                    test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
                    type: 'asset',
                    generator: { filename: 'static/media/[name].[contenthash:8][ext][query]' },
                },

                // fonts
                {
                    test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/i,
                    type: 'asset',
                    generator: { filename: 'static/fonts/[name].[contenthash:8][ext][query]' },
                },
            ],
        },
    });

    return cssConfig(env, argv, baseConfig);
};
