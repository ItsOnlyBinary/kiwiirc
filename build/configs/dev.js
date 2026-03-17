const fs = require('fs');
const { merge } = require('webpack-merge');
const chokidar = require('chokidar');

const utils = require('../utils');

const baseConfig = require('./base');

const configPattern = /\/static\/config(_.+)?\.json/;
let configWatcher = null;

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
            allowedHosts: ['localhost', '127.0.0.1'],
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
                    runtimeErrors: false,
                    errors: true,
                    warnings: false,
                },
            },
            setupMiddlewares: (middlewares, devServer) => {
                devServer.app.get(configPattern, async (req, res) => {
                    if (configWatcher) {
                        await configWatcher.close();
                        configWatcher = null;
                    }

                    const configFiles = ['config.local.json', 'config.json'];
                    const configMatch = req.url.match(configPattern)?.[1];
                    if (configMatch) {
                        configFiles.unshift(`config_${configMatch}.json`);
                        configFiles.unshift(`config_${configMatch}.local.json`);
                    }

                    let configPath = null;
                    for (const filePath of configFiles) {
                        const resolvedPath = utils.pathResolve('static/', filePath);
                        if (fs.existsSync(resolvedPath)) {
                            configPath = resolvedPath;
                            break;
                        }
                    }

                    if (!configPath) {
                        res.statusCode = 404;
                        res.end('Not Found');
                        return;
                    }

                    try {
                        const config = fs.readFileSync(configPath);
                        configWatcher = chokidar.watch(configPath);
                        configWatcher.on(
                            'change',
                            (path) => devServer.sendMessage(
                                devServer.webSocketServer.clients,
                                'content-changed'
                            ),
                        );
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Cache-Control', 'no-store');
                        res.setHeader('Pragma', 'no-cache');
                        res.setHeader('Expires', '0');
                        res.end(config);
                    } catch (err) {
                        res.statusCode = 500;
                        res.end('Internal Server Error');
                    }
                });

                return middlewares;
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
        const newHost = argv.host === true ? '0.0.0.0' : argv.host;
        devConfig.devServer.host = newHost;
        devConfig.devServer.allowedHosts.push(
            newHost === '0.0.0.0' ? '*' : newHost,
        );
    }

    if (argv.port) {
        devConfig.devServer.port = argv.port;
    }

    return merge(baseConfig(env, argv, config), devConfig);
};
