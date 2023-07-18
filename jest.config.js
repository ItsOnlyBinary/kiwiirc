module.exports = {
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.{js,jsx,vue}'],
    coverageProvider: 'babel',
    coverageDirectory: 'tests/coverage/',
    coverageReporters: ['html', 'text-summary'],
    testEnvironment: 'jsdom',
    moduleFileExtensions: [
        'js',
        'json',
        'vue',
    ],
    transform: {
        '^.+\\.vue$': require.resolve('@vue/vue3-jest'),
        '^.+\\.jsx?$': require.resolve('babel-jest'),
        '.+\\.(css|less|sass|scss|png|jpg|svg|ttf|woff|woff2)$': 'jest-transform-stub',
    },
    transformIgnorePatterns: ['/node_modules/'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testMatch: [
        '**/tests/unit/**/*.spec.[jt]s?(x)',
        '**/__tests__/*.[jt]s?(x)',
    ],
};
