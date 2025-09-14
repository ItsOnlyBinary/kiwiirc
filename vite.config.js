import path from 'path';
import { defineConfig, normalizePath } from 'vite';

import commonjs from '@rollup/plugin-commonjs';
import vue from '@vitejs/plugin-vue2';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import convertLocalesPlugin from './build/vite/convert-locales';

const pkg = require('./package.json');

// https://vite.dev/config/
export default defineConfig({
    publicDir: null,
    output: {
        // format: 'cjs',
    },
    plugins: [
        // commonjs({
        //     exclude: [
        //         '!node_modules/scrollparent/*',
        //     ],
        // }),
        convertLocalesPlugin(),
        vue(),
        nodePolyfills({
            include: ['Buffer', 'stream', 'util'],
            globals: {
                Buffer: true,
            },
        }),
        viteStaticCopy({
            targets: [
                {
                    src: pathResolve('static'),
                    dest: '',
                    globOptions: {
                        ignore: [
                            '**/.DS_Store',
                            '**/index.html',
                            '**/config.local.json',
                        ],
                    },
                    structured: true,
                },
            ],
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
        extensions: [
            '.vue', '.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'
        ],
    },
    define: {
        '__VERSION__': JSON.stringify(pkg.version),
        '__COMMITHASH__': JSON.stringify(getCommitHash()),
    },
    build: {
        rollupOptions: {
            output: {
                // format: 'cjs',
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        return 'vendor' // All node_modules go into vendor.js
                    }
                },

                // JS output structure
                chunkFileNames: 'js/[name]-[hash].js',
                entryFileNames: 'js/[name]-[hash].js',

                // Assets structure
                assetFileNames: (assetInfo) => {
                    const ext = assetInfo.name.split('.').pop()

                    if (/\.(png|jpe?g|gif|svg|webp)$/.test(assetInfo.name)) {
                        return 'images/[name]-[hash][extname]'
                    }

                    if (/\.(woff2?|ttf|otf|eot)$/.test(assetInfo.name)) {
                        return 'fonts/[name]-[hash][extname]'
                    }

                    if (ext === 'css') {
                        return 'css/[name]-[hash][extname]'
                    }

                    return 'assets/[name]-[hash][extname]'
                },
            },
        }
    },
    server: {
        port: 8080,
    },
});

function pathResolve(dir) {
    return normalizePath(path.resolve(__dirname, dir));
}

function getCommitHash() {
    let commitHash = 'unknown';
    try {
        commitHash = execSync('git rev-parse --short HEAD').toString().trim();
        const modified = execSync('git diff-index --quiet HEAD -- || echo true').toString();
        if (modified.trim() === 'true') {
            commitHash += '-modified';
        }
    } catch {
        console.error('Failed to get commit hash');
    }
    return commitHash;
}
