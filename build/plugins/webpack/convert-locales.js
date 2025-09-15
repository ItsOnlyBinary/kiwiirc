const fs = require('fs');
const path = require('path');
const NormalModule = require('webpack').NormalModule;
const RawSource = require('webpack-sources').RawSource;

const utils = require('../../utils');

const localeRegexp = /^app.([a-z0-9_-]+).po$/i;

const log = (message, level = 'info') => {
    console[level](`[convert-locales] ${message}`);
};

const SCHEME = 'locale';

// const PATH_QUERY_REGEXP = /^((?:\0.|[^?\0])*)(\?.*)?$/;

module.exports = class VirtualLocalesPlugin {
    constructor(options = {}) {
        this.sourceDir = options.sourceDir || utils.pathResolve('src/res/locales');
        this.availableLangs = new Set();

        const files = fs.readdirSync(this.sourceDir).filter((f) => path.extname(f) === '.po');
        files.forEach((file) => {
            const locale = file.match(localeRegexp)?.[1];
            if (!locale) {
                log(`Skipping file without locale match: ${file}`, 'warn');
                return;
            }

            this.availableLangs.add(locale);
        });
    }

    apply(compiler) {
        const pluginName = this.constructor.name;

        compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
            compilation.hooks.processAssets.tapAsync(
                {
                    name: pluginName,
                    stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
                },
                async (assets, callback) => {
                    console.log('processAssets');
                    await this.generateLocales(assets, false);
                    callback();
                }
            );
        });

        compiler.hooks.compilation.tap(
            pluginName,
            (compilation, { normalModuleFactory }) => {
                normalModuleFactory.hooks.resolveForScheme
                    .for(SCHEME)
                    .tap(pluginName, (resourceData) => {
                        // const match = PATH_QUERY_REGEXP.exec(resourceData.resource);
                        // const path = match[1].replace(/\0(.)/g, '$1');
                        const url = resourceData.resource;
                        resourceData.path = resourceData.resource;
                        // resourceData.resource = resourceData.resource;
                        console.log('url', url);
                        // TODO
                        return true;
                    });

                const hooks = NormalModule.getCompilationHooks(compilation);
                hooks.readResource
                    .for(SCHEME)
                    .tapAsync(pluginName, async (loaderContext, callback) => {
                        const { resourcePath } = loaderContext;
                        const fileName = resourcePath.split(':')[1];

                        console.log('resoourcePath', fileName);

                        try {
                            if (fileName === 'available.json') {
                                callback(null, JSON.stringify(
                                    [...this.availableLangs].map((lng) => lng.toLowerCase()),
                                ));
                            } else {
                                const lcLocale = fileName.split('.')[0];
                                const localeData = await this.generateLocale(lcLocale);
                                console.log('localeData', lcLocale, typeof localeData);
                                callback(null, localeData);
                            }

                        } catch (err) {
                            callback(/** @type {Error} */ (err));
                        }
                    });
            }
        );
    }

    async generateLocales(assets, devMode = false) {
        if (!this.gettextToI18next) {
            this.gettextToI18next = await import('i18next-conv').then((m) => m.gettextToI18next);
        }

        const awaitPromises = new Set();
        this.availableLangs.clear();

        try {
            // Process locale files
            const files = fs.readdirSync(this.sourceDir).filter((f) => path.extname(f) === '.po');

            files.forEach((file) => {
                const locale = file.match(localeRegexp)?.[1];
                if (!locale) {
                    log(`Skipping file without locale match: ${file}`, 'warn');
                    return;
                }

                const lcLocale = locale.toLowerCase();
                this.availableLangs.add(lcLocale);

                if (!assets) {
                    return;
                }

                const promise = this.generateLocale(locale)
                    .then((json) => {
                        assets['static/locales/' + lcLocale + '.json'] = new RawSource(json);
                    }).catch((err) => {
                        log(`Error processing locale ${locale}: ${err.message}`, 'error');
                    });

                awaitPromises.add(promise);
            });

            await Promise.all(awaitPromises);
        } catch (err) {
            log(`Error during build start: ${err.message}`, 'error');
        }
    }

    /**
     * Generates a locale JSON file from PO files.
     *
     * This function reads all PO files matching the locale code, concatenates
     * their contents, and converts them to i18next JSON format.
     *
     * @param {string} sourceDir - Directory containing locale PO files
     * @param {string} locale - Locale code
     * @returns {Promise<string>} JSON string containing locale data
     */

    async generateLocale(locale) {
        if (!this.gettextToI18next) {
            this.gettextToI18next = await import('i18next-conv').then((m) => m.gettextToI18next);
        }

        try {
            const files = this.findLocaleFiles(this.sourceDir, locale);
            if (files.length === 0) {
                log(`No locale files found for "${locale}"`, 'warn');
                return '{}'; // Return empty JSON for missing locale
            }

            let data = Buffer.alloc(0);
            for (const localeFile of files) {
                try {
                    const filePath = path.join(this.sourceDir, localeFile);
                    const content = fs.readFileSync(filePath);
                    data = Buffer.concat([data, content]);
                } catch (err) {
                    log(`Error reading locale file ${localeFile}: ${err.message}`, 'error');
                    // Continue with other files
                }
            }

            if (data.length === 0) {
                log(`No data found for locale ${locale}`, 'warn');
                return '{}';
            }

            try {
                return this.gettextToI18next(locale, data);
            } catch (err) {
                return '{}'; // Return empty JSON on error
            }
        } catch (err) {
            log(`Error processing locale ${locale}: ${err.message}`, 'error');
            return '{}';
        }
    }

    /**
     * Finds locale files matching the given locale code.
     *
     * This function searches for PO files in the source directory that match
     * the given locale code. It handles errors gracefully and returns an empty
     * array if any issues occur.
     *
     * @param {string} sourceDir - Directory containing locale PO files
     * @param {string} locale - Locale code
     * @returns {string[]} Array of matching locale file names
     */
    findLocaleFiles(sourceDir, locale) {
        try {
            const localeFinderRegexp = new RegExp(`^.+\\.${locale}\\.po$`, 'i');
            const files = fs.readdirSync(sourceDir);

            // Filter files that match the locale pattern
            return files.filter((file) => {
                try {
                    return localeFinderRegexp.test(file);
                } catch (err) {
                    log(`Error processing file ${file}: ${err.message}`, 'error');
                    return false;
                }
            });
        } catch (err) {
            log(`Error reading directory ${sourceDir}: ${err.message}`, 'error');
            return [];
        }
    }
};
