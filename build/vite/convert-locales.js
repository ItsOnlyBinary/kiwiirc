import fs from 'fs';
import path from 'path';
import { gettextToI18next } from 'i18next-conv';
import { createFilter } from 'vite';

/**
 * Vite plugin to convert locale files from PO format to i18next JSON format.
 * This plugin handles locale file conversion during build and development.
 *
 * @returns {Object} Vite plugin object
 */
export default function convertLocalesPlugin() {
    const sourceDir = path.resolve('src/res/locales/');
    const outputDir = path.resolve('static/locales/');

    // Initialize logging
    const log = (message, level = 'info') => {
        console[level](`[convert-locales] ${message}`);
    };

    // Create filters for locale files and other relevant files
    const filterLocalePath = createFilter(['**/static/locales/*.json'], ['**/node_modules/**']);
    const filterAvailablePath = createFilter(['**/res/locales/available.json'], ['**/node_modules/**']);

    // Regular expressions for matching locale files and URLs
    const localeRegexp = /^app.([a-z0-9_-]+).po$/i;
    const localeStaticRegexp = /\/static\/locales\/([a-z_-]+).json$/i;
    const configStaticRegexp = /\/static\/config(_.+)?\.json$/i;

    // Track available languages and development mode state
    const availableLangs = new Set();
    let devMode = false;

    return {
        name: 'vite-convert-locales-plugin',
        enforce: 'pre',

        resolveId(id, importer) {
            // Special handling for available.json
            if (filterAvailablePath(id)) {
                return id;
            }

            // Handle locale file resolution
            if (filterLocalePath(id)) {
                return id;
            }
        },

        configureServer(server) {
            devMode = true;

            server.middlewares.use(async (req, res, next) => {
                const url = req.url;

                // Handle locale file requests
                const localeMatch = url.match(localeStaticRegexp);
                const locale = localeMatch?.[1];
                if (locale) {
                    try {
                        const json = await generateLocale(sourceDir, locale);
                        res.setHeader('Content-Type', 'application/json');
                        res.end(json);
                    } catch (err) {
                        log(`Error generating locale ${locale}: ${err.message}`, 'error');
                        res.statusCode = 500;
                        res.end('Internal Server Error');
                    }
                    return;
                }

                // Handle config file requests
                const configMatch = url.match(configStaticRegexp);
                if (configMatch) {
                    const configPaths = ['config.local.json', 'config.json'];
                    if (configMatch[1]) {
                        configPaths.unshift(`config_${configMatch[1]}.json`);
                        configPaths.unshift(`config_${configMatch[1]}.local.json`);
                    }

                    let configPath = null;
                    for (const filePath of configPaths) {
                        const resolvedPath = path.resolve('static/', filePath);
                        if (fs.existsSync(resolvedPath)) {
                            configPath = resolvedPath;
                            break;
                        }
                    }

                    if (configPath) {
                        try {
                            const config = fs.readFileSync(configPath);
                            res.setHeader('Content-Type', 'application/json');
                            res.end(config);
                        } catch (err) {
                            log(`Error reading config file ${configPath}: ${err.message}`, 'error');
                            res.statusCode = 500;
                            res.end('Internal Server Error');
                        }
                        return;
                    } else {
                        log('Config file not found', 'warn');
                        res.statusCode = 404;
                        res.end('Not Found');
                        return;
                    }
                }

                next(); // Pass to Vite's internal handlers
            });
        },

        async buildStart(options) {
            const awaitPromises = new Set();
            availableLangs.clear();

            try {
                // Process locale files
                const files = fs.readdirSync(sourceDir).filter((f) => path.extname(f) === '.po');

                files.forEach((file) => {
                    const locale = file.match(localeRegexp)?.[1];
                    if (!locale) {
                        log(`Skipping file without locale match: ${file}`, 'warn');
                        return;
                    }

                    const lcLocale = locale.toLowerCase();
                    availableLangs.add(lcLocale);

                    if (devMode) {
                        return;
                    }

                    const outputPath = path.join(outputDir, lcLocale + '.json');
                    const sourcePath = path.join(sourceDir, file);

                    const promise = generateLocale(sourceDir, locale)
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
        },

        async load(id) {
            try {
                if (filterAvailablePath(id)) {
                    return JSON.stringify({
                        locales: Array.from(availableLangs),
                    });
                }

                if (filterLocalePath(id)) {
                    const locale = path.basename(id).replace(/\.json$/, '');
                    try {
                        return await generateLocale(sourceDir, locale);
                    } catch (err) {
                        log(`Error loading locale ${locale}: ${err.message}`, 'error');
                        return '{}';
                    }
                }
            } catch (err) {
                log(`Error in load function: ${err.message}`, 'error');
            }
        }
    };
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
async function generateLocale(sourceDir, locale) {
    try {
        const files = findLocaleFiles(sourceDir, locale);
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
            return gettextToI18next(locale, data);
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
function findLocaleFiles(sourceDir, locale) {
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
