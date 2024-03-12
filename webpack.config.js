const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCSSExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: {
        index: './src/index.js',
        APP: './src/js/app.js',
        PATHS: './src/js/paths.js',
        KUKSA: './src/js/kuksa.js',
        VAL_WEB: './src/generated/val_grpc_web_pb.js',
        VAL: './src/generated/val_pb.js',
        TYPES: './src/generated/types_pb.js',
        VOLUME: './src/js/volume.js'
    },
    output: {
        path: __dirname + '/dist',
        filename: '[name].js',
        libraryTarget: 'var',
        // `library` determines the name of the global variable
        library: '[name]'
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                minify: TerserPlugin.uglifyJsMinify,
                terserOptions: {}
            })
        ],
    },
    plugins: [
        new CleanWebpackPlugin({
            cleanAfterEveryBuildPatterns: ['dist']
        }),
        new CopyPlugin({
            patterns: [
                {
                    from: 'src/icon.*',
                    to: "[name][ext]"
                },
                {
                    from: 'src/appinfo.json',
                    to: "appinfo.json"
                },
                {
                    from: 'src/images/*',
                    to: 'images/[name][ext]'
                }
            ]
        }),
        new HtmlWebpackPlugin({
            template: 'src/index.html',
            filename: 'index.html',
            inject: 'body'
        }),
        new MiniCSSExtractPlugin({
            filename: 'app.css',
        })
    ],
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            },
            {
                test: /\.scss$/,
                use: [
                    MiniCSSExtractPlugin.loader,
                    "css-loader",
                    "sass-loader"
                ]
            },
            {
                test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
                type: 'asset/resource',
                generator: {
                    filename: 'fonts/[name][ext]'
                }
            },
            {
                test: /\.(gif|png|jpe?g|svg)$/i,
                type: 'asset/resource'
            }
        ]
    },
    devServer: {
        static: path.join(__dirname, 'dist'),
        compress: true,
        port: 9000
    }
}; 
