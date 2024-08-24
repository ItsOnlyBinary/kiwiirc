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
            host: '127.0.0.1',
            port: 8080,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
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

    if (argv.host) {
        devConfig.devServer.host = argv.host === true ? '0.0.0.0' : argv.host;
    }

    if (argv.port) {
        devConfig.devServer.port = argv.port;
    }

    return merge(baseConfig(env, argv, config), devConfig);
};
