import path from 'path';
import { defineConfig, normalizePath } from 'vite';
import { execSync } from 'child_process';
import commonjs from '@rollup/plugin-commonjs';
import vue from '@vitejs/plugin-vue2';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import convertLocalesPlugin from './build/vite/convert-locales';
import pluggableExportsPlugin from './build/vite/pluggable-exports';

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
        pluggableExportsPlugin(),
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
        '__BUILD_INFO__': {
            date: (new Date()).toISOString(),
            version: pkg.version,
            commit: getCommitHash(),
        },
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
                chunkFileNames: 'static/js/[name]-[hash].js',
                entryFileNames: 'static/js/[name]-[hash].js',

                // Assets structure
                assetFileNames: (assetInfo) => {
                    const ext = assetInfo.name.split('.').pop()

                    if (/\.(png|jpe?g|gif|svg|webp)$/.test(assetInfo.name)) {
                        return 'static/images/[name]-[hash][extname]'
                    }

                    if (/\.(woff2?|ttf|otf|eot)$/.test(assetInfo.name)) {
                        return 'static/fonts/[name]-[hash][extname]'
                    }

                    if (ext === 'css') {
                        return 'static/css/[name]-[hash][extname]'
                    }

                    return 'static/assets/[name]-[hash][extname]'
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
    } catch (error) {
        console.error('Failed to get commit hash:', error.message);
    }
    return commitHash;
}
