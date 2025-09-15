import fs from 'fs';
import path from 'path';
import { createFilter } from 'vite';
import * as babel from '@babel/core';
import traverse from '@babel/traverse';
import generate from '@babel/generator';

export default function pluggableExportsPlugin() {
    let pluginDisabled = false;

    const filter = createFilter(['**/*.js', '**/*.vue'], ['**/node_modules/**']);

    return {
        name: 'vite-pluggable-exports-plugin',
        enforce: 'post',

        config(config) {
            if (config.output.format !== 'cjs') {
                console.log('disabling');
                pluginDisabled = true;
                return
            }
        },


        // async transform(code, id) {
        //     if (pluginDisabled || !filter(id)) return;

        //     if (!code.includes(`void 'kiwi public'`)) {
        //         console.log('skipping', id);
        //         return;
        //     }

        //     console.log('transforming', id);

        //     try {
        //         const ast = babel.parseSync(code, {
        //             sourceType: 'module',
        //             plugins: [],
        //         });

        //         // console.log('code', code);

        //         traverse.default(ast, {
        //             Program: {
        //                 exit(path) {

        //                 },
        //             },
        //         });

        //         const output = generate.default(ast, { sourceMaps: true, sourceFileName: id }, code);
        //         return { code: output.code, map: output.map };

        //     } catch (error) {
        //         console.log('error', id, error);
        //     }
        // },
    }
}
