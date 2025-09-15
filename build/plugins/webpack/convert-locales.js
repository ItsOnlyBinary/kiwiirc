const fs = require('fs');
const path = require('path');

const utils = require('../../utils');

const localeRegexp = /^app.([a-z0-9_-]+).po$/i;

const log = (message, level = 'info') => {
    console[level](`[convert-locales] ${message}`);
};

module.exports = class ConvertLocalesPlugin {
    constructor(options = {}) {
        this.sourceDir = options.sourceDir || utils.pathResolve('src/res/locales');
        this.availableLangs = new Set();
    }

    apply(compiler) {
        const pluginName = this.constructor.name;
        const fileDependencies = new Set();

        compiler.hooks.afterEnvironment.tap(pluginName, () => {
            const devServer = compiler.options.devServer;
            if (!devServer) {
                return;
            }
        });

        compiler.hooks.beforeRun.tapAsync(pluginName, async (compilation, callback) => {
            // run in build mode
            await this.generateLocales(true);
            callback();
        });

        compiler.hooks.watchRun.tapAsync(pluginName, async (compilation, callback) => {
            // run in dev mode
            await this.generateLocales(true);
            callback();
        });

        compiler.hooks.compilation.tap(
            pluginName,
            (compilation, { normalModuleFactory }) => {
                // Intercept the resolution of the module
                normalModuleFactory.hooks.resolve.tapAsync(
                    pluginName,
                    (data, callback) => {
                        if (data.request === '@/res/locales/available.json') {
                            console.log('resolve avail locale', data);
                            // Modify the data object in-place
                            data.path = data.request;
                            data.resource = data.request;
                            // No return, just call callback()
                            callback();
                            return;
                        }
                        callback();
                    }
                );

                // Provide the content for the virtual module
                normalModuleFactory.hooks.afterResolve.tap(
                    pluginName,
                    (data) => {
                        if (data.request === '@/res/locales/available.json') {
                            console.log('requested avail locale');
                            // data.loaders = [
                            //     {
                            //         loader: require.resolve('json-loader'),
                            //         options: {},
                            //         ident: 'json',
                            //         type: 'json',
                            //     },
                            // ];
                            data.createData.content = JSON.stringify({
                                locales: Array.from(this.availableLangs),
                            });
                            // data.createData.resource = 'virtual-locales-module';

                        }
                    }
                );
            }
        );
        // compiler.hooks.compilation.tap(
        //     pluginName,
        //     (compilation, { normalModuleFactory }) => {
        //         normalModuleFactory.hooks.afterResolve.tap(
        //             pluginName,
        //             (data) => {
        //                 if (data.request === '@/res/locales/available.json') {
        //                     console.log('requested avail locale');
        //                     // Generate your content here
        //                     data.createData.resource = 'virtual-locales-module';
        //                     data.createData.content = JSON.stringify({
        //                         locales: Array.from(this.availableLangs),
        //                     });
        //                 }
        //             }
        //         );
        //     }
        // );

        // compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
        //     compilation.hooks.processAssets.tapPromise({

        //     });
        // });

        // compiler.hooks.beforeRun.tapAsync(pluginName, (compilation, callback) => {
        //     // run in build mode
        //     convertLocales(fileDependencies, callback);
        // });

        // compiler.hooks.watchRun.tapAsync(pluginName, (compilation, callback) => {
        //     // run in dev mode
        //     convertLocales(fileDependencies, callback);
        // });

        // compiler.hooks.afterEmit.tapAsync(pluginName, (compilation, callback) => {
        //     // Add file dependencies
        //     fileDependencies.forEach((dependency) => {
        //         compilation.fileDependencies.add(dependency);
        //     });

        //     callback();
        // });
    }

    async generateLocales(devMode = false) {
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

                if (devMode) {
                    return;
                }

                const sourcePath = path.join(this.sourceDir, file);

                const promise = this.generateLocale(this.sourceDir, locale)
                    .then((json) => this.emitFile({
                        type: 'asset',
                        originalFileName: sourcePath,
                        fileName: 'static/locales/' + lcLocale + '.json',
                        source: json,
                    })).catch((err) => {
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

    async generateLocale(sourceDir, locale) {
        try {
            const files = this.findLocaleFiles(sourceDir, locale);
            if (files.length === 0) {
                log(`No locale files found for ${locale}`, 'warn');
                return '{}'; // Return empty JSON for missing locale
            }

            let data = Buffer.alloc(0);
            for (const localeFile of files) {
                try {
                    const filePath = path.join(sourceDir, localeFile);
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
            if (!fs.existsSync(sourceDir) || !fs.lstatSync(sourceDir).isDirectory()) {
                log(`Invalid source directory: ${sourceDir}`, 'error');
                return [];
            }

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

// async function convertLocales(fileDependencies, callback) {
//     const i18nextConv = await import('i18next-conv');

//     fileDependencies.clear();
//     const sourceDir = path.resolve('src/res/locales/');
//     const outputDir = path.resolve('static/locales/');

//     const awaitPromises = new Set();
//     const availableLangs = new Set();

//     const files = fs.readdirSync(sourceDir).filter((f) => path.extname(f) === '.po');
//     files.forEach((file) => {
//         const match = file.match(/^app.([a-z_-]+).po$/i);
//         if (!match) {
//             return;
//         }

//         const locale = match[1];
//         const lcLocale = locale.toLowerCase();
//         const outputPath = path.join(outputDir, lcLocale + '.json');
//         const sourcePath = path.join(sourceDir, file);

//         const concatLocale = () => new Promise((resolve) => {
//             let data = Buffer.alloc(0);
//             files.forEach((localeFile) => {
//                 if (!localeFile.endsWith(`.${locale}.po`)) {
//                     return;
//                 }
//                 const content = fs.readFileSync(path.join(sourceDir, localeFile));
//                 data = Buffer.concat([data, content]);
//             });
//             resolve(data);
//         });

//         const promise = concatLocale()
//             .then((data) => i18nextConv.gettextToI18next(locale, data))
//             .then((json) => writeIfChanged(outputPath, json));

//         awaitPromises.add(promise);
//         availableLangs.add(lcLocale);
//         fileDependencies.add(sourcePath);
//     });

//     // Write available.json
//     const availablePath = path.join(sourceDir, 'available.json');
//     const content = JSON.stringify({
//         locales: Array.from(availableLangs),
//     });
//     writeIfChanged(availablePath, content);

//     await Promise.all(awaitPromises);
//     callback();
// }

// function writeIfChanged(file, _data) {
//     const data = Buffer.from(_data);
//     if (fs.existsSync(file) && data.equals(fs.readFileSync(file))) {
//         return;
//     }

//     fs.writeFileSync(file, data);
// }
