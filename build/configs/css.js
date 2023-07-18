const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const Autoprefixer = require('autoprefixer');
const { merge } = require('webpack-merge');

const cssRules = [
    {
        test: /\.css$/,
        use: [
            {
                loader: MiniCssExtractPlugin.loader,
            },
            {
                loader: 'css-loader',
                options: {
                    importLoaders: 2,
                    esModule: false,
                },
            },
            {
                loader: 'postcss-loader',
                options: {
                    postcssOptions: {
                        plugins: [Autoprefixer],
                    },
                },
            },
        ],
    },
    {
        test: /\.less$/,
        use: [
            {
                loader: MiniCssExtractPlugin.loader,
            },
            {
                loader: 'css-loader',
                options: {
                    importLoaders: 2,
                    esModule: false,
                },
            },
            {
                loader: 'postcss-loader',
                options: {
                    postcssOptions: {
                        plugins: [Autoprefixer],
                    },
                },
            },
            {
                loader: 'less-loader',
            },
        ],
    },
    {
        test: /\.s[ac]ss$/,
        use: [
            {
                loader: MiniCssExtractPlugin.loader,
            },
            {
                loader: 'css-loader',
                options: {
                    importLoaders: 2,
                    esModule: false,
                },
            },
            {
                loader: 'postcss-loader',
                options: {
                    postcssOptions: {
                        plugins: [Autoprefixer],
                    },
                },
            },
            {
                loader: 'sass-loader',
            },
        ],
    },
];

module.exports = (env, argv, config) => {
    const outputFileName = `static/css/[name]${!env.WEBPACK_SERVE ? '.[contenthash:8]' : ''}.css`;

    return merge(config, {
        plugins: [
            new MiniCssExtractPlugin({
                filename: outputFileName,
                chunkFilename: outputFileName,
            }),
        ],
        module: {
            rules: cssRules,
        },
    });
};
