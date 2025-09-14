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

        // config(config) {
        //     if (config.output.format !== 'cjs') {
        //         console.log('disabling');
        //         pluginDisabled = true;
        //         return
        //     }
        // },

        async transform(code, id) {
            if (!filter(id)) return;

            if (!code.includes(`'kiwi public'`)) {
                return;
            }

            // console.log('code', code);
            const ast = babel.parseSync(code, {
                sourceType: 'unambiguous',
                plugins: [],
            });

            // traverse.default(ast, {
                // ExpressionStatement(path) {
                //     const expr = path.node.expression;
                //     if (
                //         expr.type === 'StringLiteral' &&
                //         expr.value === 'kiwi public'
                //     ) {
                //         path.remove();
                //     }
                // },
            // });

            // const output = generate.default(ast, { sourceMaps: true, sourceFileName: id }, code);
            // return { code: output.code, map: output.map };
        },
    }
}
