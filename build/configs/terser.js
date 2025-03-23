module.exports = {
    terserOptions: {
        compress: {
            booleans: true,
            conditionals: true,
            dead_code: true,
            evaluate: true,
            if_return: true,
            sequences: true,
            unused: true,
        },
        keep_classnames: true,
        keep_fnames: true,
        mangle: {
            safari10: true,
            keep_classnames: true,
            keep_fnames: true,
        },
        format: {
            comments: false,
        },
    },
    extractComments: {
        condition: false,
    },
};
