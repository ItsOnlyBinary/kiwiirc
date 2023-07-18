const fs = require('fs');
const { merge } = require('webpack-merge');
const CopyPlugin = require('copy-webpack-plugin');

const utils = require('../utils');

const baseConfig = require('./base');

module.exports = (env, argv, config) => {
    const devConfig = {
        plugins: [],

        devServer: {
            devMiddleware: {
                publicPath: 'auto',
            },
            open: false,
            host: '0.0.0.0',
            port: 8080,
            static: [
                {
                    directory: utils.pathResolve('static'),
                    publicPath: 'static',
                },
            ],
            client: {
                logging: 'info',
                overlay: {
                    runtimeErrors: true,
                    errors: true,
                    warnings: false,
                },
            },
        },

        infrastructureLogging: {
            level: 'warn',
        },

        stats: {
            all: false,
            loggingDebug: ['sass-loader'],
        },
    };

    const localConfig = utils.pathResolve('static/config.local.json');
    if (fs.existsSync(localConfig)) {
        devConfig.plugins.push(new CopyPlugin({
            patterns: [
                {
                    from: localConfig,
                    to: utils.pathResolve('dist/static/config.json'),
                    force: true,
                },
            ],
        }));
    }

    return merge(
        baseConfig(env, argv, config),
        devConfig,
    );
};
