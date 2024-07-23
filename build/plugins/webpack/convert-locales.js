const fs = require('fs');
const path = require('path');
const NormalModule = require('webpack').NormalModule;
const RawSource = require('webpack-sources').RawSource;

const utils = require('../../utils');

const localeRegexp = /^app.([a-z0-9_-]+).po$/i;

/**
 * Webpack plugin to convert PO locale files to JSON format for i18next.
 * This plugin scans a directory for PO files, converts them to JSON format
 * using i18next-conv, and makes them available to the webpack build process.
 */
module.exports = class VirtualLocalesPlugin {
    /**
     * Create a new instance of the VirtualLocalesPlugin.
     * @param {Object} [options={}] - Configuration options for the plugin.
     * @param {string} [options.sourceDir] - Directory containing PO locale files.
     * @param {string} [options.scheme='locale'] - URL scheme for virtual modules.
     */
    constructor(options = {}) {
        this.sourceDir = options.sourceDir || utils.pathResolve('src/res/locales');
        this.scheme = options.scheme || 'locale';
        this.availableLangs = new Set();
        this.gettextToI18next = import('i18next-conv').then((m) => m.gettextToI18next);
    }

    /**
     * Apply the plugin to the webpack compiler.
     * @param {Object} compiler - The webpack compiler instance.
     */
    apply(compiler) {
        const pluginName = this.constructor.name;

        const logger = compiler.getInfrastructureLogger(pluginName);

        const files = fs.readdirSync(this.sourceDir).filter((f) => path.extname(f) === '.po');
        files.forEach((file) => {
            const locale = file.match(localeRegexp)?.[1];
            if (!locale) {
                logger.warn(`Skipping file without locale match: ${file}`);
                return;
            }

            this.availableLangs.add(locale);
        });

        compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
            const compilationLogger = compilation.getLogger(pluginName);

            compilation.hooks.processAssets.tapAsync(
                {
                    name: pluginName,
                    stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
                },
                async (assets, callback) => {
                    try {
                        compilationLogger.debug('Processing assets');
                        await this.generateLocales(compilationLogger, assets);
                        callback();
                    } catch (err) {
                        callback(new Error(`Error processing assets: ${err.message}`));
                    }
                }
            );
        });

        compiler.hooks.compilation.tap(
            pluginName,
            (compilation, { normalModuleFactory }) => {
                const compilationLogger = compilation.getLogger(pluginName);

                normalModuleFactory.hooks.resolveForScheme
                    .for(this.scheme)
                    .tap(pluginName, (resourceData) => {
                        const url = resourceData.resource;
                        resourceData.path = url;
                        resourceData.resource = url + '.js';
                        compilationLogger.debug(`Resolving scheme for: ${url}`);
                        return true;
                    });

                const hooks = NormalModule.getCompilationHooks(compilation);
                hooks.readResource
                    .for(this.scheme)
                    .tapAsync(pluginName, async (loaderContext, callback) => {
                        const { resourcePath } = loaderContext;
                        const fileName = resourcePath.split(':')[1];

                        compilationLogger.debug(`Processing resource: ${fileName}`);

                        try {
                            if (fileName === 'available.js') {
                                callback(null, `export default ['${
                                    [...this.availableLangs].map((lng) => lng.toLowerCase()).join(`','`)
                                }']`);
                            } else {
                                const lcLocale = fileName.split('.')[0];
                                compilationLogger.debug(`Generating locale data for: ${lcLocale}`);
                                const localeData = await this.generateLocale(compilationLogger, lcLocale);
                                if (localeData) {
                                    callback(null, `export default ${localeData}`);
                                } else {
                                    callback(new Error(`Data missing for locale: ${lcLocale}`));
                                }
                            }
                        } catch (err) {
                            callback(new Error(`Error processing resource ${fileName}: ${err.message}`));
                        }
                    });
            }
        );
    }

    /**
     * Generate locale JSON files from PO files.
     * @param {Object} logger - The logger instance.
     * @param {Object} assets - The webpack assets object.
     * @private
     */
    async generateLocales(logger, assets) {
        const awaitPromises = new Set();
        try {
            [...this.availableLangs].forEach((locale) => {
                const lcLocale = locale.toLowerCase();
                const promise = this.generateLocale(logger, locale)
                    .then((json) => {
                        assets['static/locales/' + lcLocale + '.json'] = new RawSource(json);
                    }).catch((err) => {
                        logger.error(`Error processing locale ${locale}: ${err.message}`);
                    });

                awaitPromises.add(promise);
            });

            await Promise.all(awaitPromises);
        } catch (err) {
            logger.error(`Error during build start: ${err.message}`);
        }
    }

    /**
     * Generate JSON data for a specific locale.
     * @param {Object} logger - The logger instance.
     * @param {string} locale - The locale code (e.g., 'en-US').
     * @returns {Promise<string|null>} - The JSON data for the locale, or null if an error occurs.
     * @private
     */
    async generateLocale(logger, locale) {
        try {
            const files = await this.findLocaleFiles(logger, locale);
            if (files.length === 0) {
                logger.warn(`No locale files found for "${locale}"`);
                return null; // Return null for missing locale
            }

            let data = Buffer.alloc(0);
            for (const localeFile of files) {
                try {
                    const filePath = path.join(this.sourceDir, localeFile);
                    const content = fs.readFileSync(filePath);
                    data = Buffer.concat([data, content]);
                } catch (err) {
                    logger.error(`Error reading locale file ${localeFile}: ${err.message}`);
                    // Continue with other files
                }
            }

            if (data.length === 0) {
                logger.warn(`No valid data found for locale ${locale}`);
                return null;
            }

            try {
                return Promise.resolve(this.gettextToI18next).then((f) => f(locale, data));
            } catch (err) {
                logger.error(`Error parsing locale ${locale}: ${err.message}`);
                return '{}'; // Return empty JSON on error
            }
        } catch (err) {
            logger.error(`Error processing locale ${locale}: ${err.message}`);
            return null;
        }
    }

    /**
     * Find PO files for a specific locale.
     * @param {Object} logger - The logger instance.
     * @param {string} locale - The locale code (e.g., 'en-US').
     * @returns {Promise<string[]>} - An array of matching file names.
     * @private
     */
    async findLocaleFiles(logger, locale) {
        try {
            const localeFinderRegexp = new RegExp(`^.+\\.${locale}\\.po$`, 'i');
            const files = await fs.promises.readdir(this.sourceDir);

            // Filter files that match the locale pattern
            return files.filter((file) => localeFinderRegexp.test(file));
        } catch (err) {
            logger.error(`Error reading directory ${this.sourceDir}: ${err.message}`);
            return [];
        }
    }
};
