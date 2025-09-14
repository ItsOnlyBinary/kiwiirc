import fs from 'fs';
import path from 'path';
import { gettextToI18next } from 'i18next-conv';
import { createFilter, normalizePath } from 'vite';

export default function convertLocalesPlugin() {
    const sourceDir = path.resolve('src/res/locales/');
    const outputDir = path.resolve('static/locales/');

    // import { createFilter } from 'vite';
    const filter = createFilter(['**/*.js', '**/*.vue', '**/*.json'], ['**/node_modules/**']);
    // console.log('filter Test', filter('../static/available.json'));

    const filterLocalePath = createFilter(['**/static/locales/*.json'], ['**/node_modules/**']);

    const localeRegexp = /^app.([a-z_-]+).po$/i;

    const localeStaticRegexp = /\/static\/locales\/([a-z_-]+).json$/i;

    const configStaticRegexp = /\/static\/config(_.+)?\.json$/i;

    console.log('sourceDir', sourceDir);

    const availableLangs = new Set();
    let devMode = false;

    return {
        name: 'vite-convert-locales-plugin',
        enforce: 'pre',

        resolveId(id, importer) {
            if (id.includes('fr-fr')) {
                console.log('resolve Locale', id);
            }
            if (filterLocalePath(id)) {
                // console.log('resolve Locale', id);
                return id;
            }

            if (!filter(id)) {
                return;
            }

            if (id.endsWith('available.json')) {
                return id;
            }
            console.log('resolveId', id);
        },

        config() {
            console.log('config');
        },

        configureServer(server) {
            devMode = true;
            console.log('configServer');
            server.middlewares.use(async (req, res, next) => {
                const url = req.url;

                const locale = url.match(localeStaticRegexp)?.[1];
                if (locale) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(await generateLocale(sourceDir, locale));
                    return;
                }

                const match = url.match(configStaticRegexp)?.[1];
                if (match) {
                    const configPaths = ['config.local.json', 'config.json'];
                    if (match[1]) {
                        configPaths.unshift(`config_${match[1]}.json`);
                        configPaths.unshift(`config_${match[1]}.local.json`);
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
                        const config = fs.readFileSync(configPath);
                        res.setHeader('Content-Type', 'application/json');
                        res.end(config);
                        return;
                    }
                }

                next(); // Pass to Vite's internal handlers
            });
        },

        async buildStart(options) {
            console.log('buildStart');

            const awaitPromises = new Set();

            availableLangs.clear();

            const files = fs.readdirSync(sourceDir).filter((f) => path.extname(f) === '.po');
            console.log('files', files);
            files.forEach((file) => {
                const locale = file.match(localeRegexp)?.[1];
                if (!locale) {
                    return
                }

                const lcLocale = locale.toLowerCase();

                availableLangs.add(lcLocale);

                if (devMode) {
                    return;
                }

                const outputPath = path.join(outputDir, lcLocale + '.json');
                const sourcePath = path.join(sourceDir, file);

                const promise = generateLocale(sourceDir, locale).then((json) => this.emitFile({
                    type: 'asset',
                    originalFileName: sourcePath,
                    fileName: 'static/locales/' + lcLocale + '.json',
                    source: json,
                }));

                awaitPromises.add(promise);
            });

            await Promise.all(awaitPromises);
        },

        async load(id) {
            if (!filter(id)) {
                return;
            }
            console.log('load', id);

            if (id.endsWith('available.json')) {
                return JSON.stringify({
                    locales: Array.from(availableLangs),
                });
            }

            if (filterLocalePath(id)) {
                console.log('load Locale', id);
                return await generateLocale(sourceDir, path.basename(id).replace(/\.json$/, ''));
            }
        }
    }
}

function generateLocale(sourceDir, locale) {
    const concatLocale = () => new Promise((resolve) => {
        let data = Buffer.alloc(0);
        const files = findLocaleFiles(sourceDir, locale);
        files.forEach((localeFile) => {
            const content = fs.readFileSync(path.join(sourceDir, localeFile));
            data = Buffer.concat([data, content]);
        });
        console.log('data', sourceDir, files, data);
        resolve(data);
    });

    return concatLocale().then((data) => gettextToI18next(locale, data));
}

function findLocaleFiles(sourceDir, locale) {
    const localeFinderRegexp = new RegExp(`^.+\\.${locale}\\.po$`, 'i');
    return fs.readdirSync(sourceDir).filter((file) => localeFinderRegexp.test(file))
}
