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

    if (argv.host) {
        devConfig.devServer.host = argv.host === true ? '0.0.0.0' : argv.host;
    }

    if (argv.port) {
        devConfig.devServer.port = argv.port;
    }

    ['config.local.json', 'static/config.local.json']
        .map((configPath) => utils.pathResolve(configPath))
        .some((localConfig) => {
            if (!fs.existsSync(localConfig)) {
                return false;
            }

            const copyConfig = new CopyPlugin({
                patterns: [
                    {
                        from: localConfig,
                        to: utils.pathResolve('dist/static/config.json'),
                        force: true,
                    },
                ],
            });
            devConfig.plugins.push(copyConfig);

            return true;
        });

    return merge(baseConfig(env, argv, config), devConfig);
};
