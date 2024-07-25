const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { merge } = require('webpack-merge');
const zlib = require('zlib');

const baseConfig = require('./base');
const terserOptions = require('./terser');

module.exports = (env, argv, config) => {
    const compressionTest = /\.(js|css|js.map|css.map|svg|json|ttf|eot|woff2?)(\?.*)?$/;

    const prodConfig = {
        plugins: [
            new CompressionPlugin({
                filename: '[path][base].gz',
                algorithm: 'gzip',
                test: compressionTest,
                compressionOptions: {
                    level: 9,
                },
                threshold: 10240,
            }),
            new CompressionPlugin({
                filename: '[path][base].br',
                algorithm: 'brotliCompress',
                test: compressionTest,
                compressionOptions: {
                    params: {
                        [zlib.constants.BROTLI_PARAM_QUALITY]: 8,
                    },
                },
                threshold: 10240,
            }),
        ],

        optimization: {
            minimize: true,
            minimizer: [new TerserPlugin(terserOptions), new CssMinimizerPlugin()],
            moduleIds: 'deterministic',
            splitChunks: {
                cacheGroups: {
                    icons: {
                        name: 'chunk-icons',
                        test: /([\\/]res[\\/]icons[\\/]|[\\/]node_modules[\\/]@fortawesome[\\/]free-(solid|regular)-svg-icons[\\/])/,
                        minChunks: 1,
                        minSize: 0,
                        priority: -10,
                        chunks: 'all',
                        reuseExistingChunk: true,
                    },
                    defaultVendors: {
                        name: 'chunk-vendors',
                        test: /[\\/]node_modules[\\/]/,
                        priority: -20,
                        chunks: 'initial',
                    },
                    common: {
                        name: 'chunk-common',
                        minChunks: 2,
                        priority: -30,
                        chunks: 'initial',
                        reuseExistingChunk: true,
                    },
                },
            },
        },
    };

    return merge(baseConfig(env, argv, config), prodConfig);
};
