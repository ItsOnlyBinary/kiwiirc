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

    console.log('sourceDir', sourceDir);

    const availableLangs = new Set();
    let devMode = false;

    return {
        name: 'vite-convert-locales-plugin',
        enforce: 'pre',

        resolveId(id, importer) {
            if (!filter(id)) {
                return;
            }

            if (id.endsWith('available.json')) {
                return id;
            }

            if (filterLocalePath(id)) {
                console.log('resolve Locale', id);
                return id;
            }
            console.log('resolveId', id);
        },

        config() {
            console.log('config');
        },

        configureServer() {
            devMode = true;
            console.log('configServer');
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
        findLocaleFiles(sourceDir, locale).forEach((localeFile) => {
            if (!localeFile.endsWith(`.${locale}.po`)) {
                return;
            }
            const content = fs.readFileSync(path.join(sourceDir, localeFile));
            data = Buffer.concat([data, content]);
        });
        resolve(data);
    });

    return concatLocale().then((data) => gettextToI18next(locale, data));
}

function findLocaleFiles(sourceDir, locale) {
    const localeFinderRegexp = new RegExp(`^.+\\.${locale}\\.po$`);
    return fs.readdirSync(sourceDir).filter((file) => localeFinderRegexp.test(file))
}
