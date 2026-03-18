import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [vue()],
    test: {
        globals: true,
        environment: 'jsdom',
        include: [
            'tests/unit/**/*.spec.js',
            '**/__tests__/*.js',
        ],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{js,jsx,vue}'],
            reportsDirectory: 'tests/coverage/',
            reporter: ['html', 'text-summary'],
        },
        deps: {
            optimizer: {
                web: {
                    include: ['ip-regex'],
                },
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
        extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    },
});
