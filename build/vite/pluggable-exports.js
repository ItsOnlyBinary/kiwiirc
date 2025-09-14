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


        async transform(code, id) {
            if (!filter(id)) return;

            if (!code.includes(`void 'kiwi public'`)) {
                console.log('skipping', id);
                return;
            }

            console.log('transforming', id);

            // try {
            //     const ast = babel.parseSync(code, {
            //         sourceType: 'module',
            //         plugins: [],
            //     });

            //     console.log('code', code);
            //     console.log('ast', ast.program.body[0]);

            //     traverse.default(ast, {
            //         Program: {
            //             exit() {
            //                 process.exit(0);
            //             },
            //         },
            //         StringLiteral(path) {
            //             const value = path.node.value;
            //             if (value === void 'kiwi public') {
            //                 console.log('removing');
            //                 path.remove();
            //             } else {
            //                 console.log('expr', value);
            //             }
            //         },
            //         ExpressionStatement(path) {
            //             const expr = path.node.expression;
            //             if (
            //                 path.parent.type === 'Program' &&
            //                 expr.type === 'StringLiteral' &&
            //                 expr.value === void 'kiwi public'
            //             ) {
            //                 console.log('Matched top-level string literal:', expr.value);
            //                 console.log('Location:', expr.loc?.start);
            //             }
            //         }
            //     });

            //     const output = generate.default(ast, { sourceMaps: true, sourceFileName: id }, code);
            //     return { code: output.code, map: output.map };

            // } catch (error) {
            //     console.log('error', id, error);
            // }
        },
    }
}
