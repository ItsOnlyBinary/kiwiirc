const fs = require('fs').promises;
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

        compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
            const compilationLogger = compilation.getLogger(pluginName);

            // Initialize available languages
            this.initializeAvailableLangs(compilation);

            compilation.hooks.processAssets.tapAsync(
                {
                    name: pluginName,
                    stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
                },
                async (assets, callback) => {
                    try {
                        compilationLogger.debug('Processing assets');
                        await this.generateLocales(compilation, assets, false);
                        callback();
                    } catch (err) {
                        compilationLogger.error(`Error processing assets: ${err.message}`);
                        callback(err);
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
                        resourceData.path = resourceData.resource;
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
                            if (fileName === 'available.json') {
                                compilationLogger.debug('Returning available languages');
                                callback(null, JSON.stringify(
                                    [...this.availableLangs].map((lng) => lng.toLowerCase()),
                                ));
                            } else {
                                const lcLocale = fileName.split('.')[0];
                                compilationLogger.debug(`Generating locale data for: ${lcLocale}`);
                                const localeData = await this.generateLocale(compilation, lcLocale);

                                if (localeData) {
                                    callback(null, localeData);
                                } else {
                                    callback(null, '{}'); // Return empty JSON if no data
                                }
                            }
                        } catch (err) {
                            compilationLogger.error(`Error processing resource ${fileName}: ${err.message}`);
                            callback(/** @type {Error} */(err));
                        }
                    });
            }
        );
    }

    /**
     * Initialize the set of available languages by scanning the source directory.
     * @param {Object} compilation - The webpack compilation object.
     * @private
     */
    async initializeAvailableLangs(compilation) {
        const logger = compilation.getLogger(this.constructor.name);

        try {
            const files = await fs.readdir(this.sourceDir);
            const poFiles = files.filter((f) => path.extname(f) === '.po');

            for (const file of poFiles) {
                const locale = file.match(localeRegexp)?.[1];
                if (!locale) {
                    logger.warn(`Skipping file without locale match: ${file}`);
                    continue;
                }

                this.availableLangs.add(locale.toLowerCase());
            }
        } catch (err) {
            logger.error(`Error reading source directory: ${err.message}`);
        }
    }

    /**
     * Generate locale JSON files from PO files.
     * @param {Object} compilation - The webpack compilation object.
     * @param {Object} assets - The webpack assets object.
     * @param {boolean} [devMode=false] - Whether this is a development build.
     * @private
     */
    async generateLocales(compilation, assets, devMode = false) {
        const logger = compilation.getLogger(this.constructor.name);

        this.availableLangs.clear();

        try {
            // Process locale files
            const files = await fs.readdir(this.sourceDir);
            const poFiles = files.filter((f) => path.extname(f) === '.po');

            if (!assets) {
                // Just collect available languages
                for (const file of poFiles) {
                    const locale = file.match(localeRegexp)?.[1];
                    if (locale) {
                        this.availableLangs.add(locale.toLowerCase());
                    }
                }
                return;
            }

            // Process each locale file in parallel
            const processLocale = async (file) => {
                const locale = file.match(localeRegexp)?.[1];
                if (!locale) {
                    logger.warn(`Skipping file without locale match: ${file}`);
                    return;
                }

                const lcLocale = locale.toLowerCase();
                this.availableLangs.add(lcLocale);

                try {
                    const json = await this.generateLocale(compilation, locale);
                    if (json) {
                        assets['static/locales/' + lcLocale + '.json'] = new RawSource(json);
                    }
                } catch (err) {
                    logger.error(`Error processing locale ${locale}: ${err.message}`);
                }
            };

            // Process all locales in parallel
            const promises = poFiles.map(processLocale);
            await Promise.all(promises);
        } catch (err) {
            logger.error(`Error during build start: ${err.message}`);
        }
    }

    /**
     * Generate JSON data for a specific locale.
     * @param {Object} compilation - The webpack compilation object.
     * @param {string} locale - The locale code (e.g., 'en-US').
     * @returns {Promise<string|null>} - The JSON data for the locale, or null if an error occurs.
     * @private
     */
    async generateLocale(compilation, locale) {
        const logger = compilation.getLogger(this.constructor.name);

        // Ensure gettextToI18next is initialized
        await this.gettextToI18next;

        try {
            const files = await this.findLocaleFiles(compilation, locale);
            if (files.length === 0) {
                logger.warn(`No locale files found for "${locale}"`);
                return null; // Return null for missing locale
            }

            // Read all files in parallel and collect valid buffers
            const readPromises = files.map(async (localeFile) => {
                try {
                    const filePath = path.join(this.sourceDir, localeFile);
                    const buffer = await fs.readFile(filePath);
                    return buffer;
                } catch (err) {
                    logger.error(`Error reading locale file ${localeFile}: ${err.message}`);
                    return null;
                }
            });

            const contents = await Promise.all(readPromises);
            const data = Buffer.concat(contents.filter((c) => c !== null));

            if (data.length === 0) {
                logger.warn(`No valid data found for locale ${locale}`);
                return null;
            }

            try {
                return this.gettextToI18next(locale, data);
            } catch (err) {
                logger.error(`Error converting locale ${locale}: ${err.message}`);
                return null; // Return null on error
            }
        } catch (err) {
            logger.error(`Error processing locale ${locale}: ${err.message}`);
            return null;
        }
    }

    /**
     * Find PO files for a specific locale.
     * @param {Object} compilation - The webpack compilation object.
     * @param {string} locale - The locale code (e.g., 'en-US').
     * @returns {Promise<string[]>} - An array of matching file names.
     * @private
     */
    async findLocaleFiles(compilation, locale) {
        const logger = compilation.getLogger(this.constructor.name);

        try {
            const localeFinderRegexp = new RegExp(`^.+\\.${locale}\\.po$`, 'i');
            const files = await fs.readdir(this.sourceDir);

            // Filter files that match the locale pattern
            return files.filter((file) => {
                try {
                    return localeFinderRegexp.test(file);
                } catch (err) {
                    logger.error(`Error processing file ${file}: ${err.message}`);
                    return false;
                }
            });
        } catch (err) {
            logger.error(`Error reading directory ${this.sourceDir}: ${err.message}`);
            return [];
        }
    }
};
