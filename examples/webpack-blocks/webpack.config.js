const {createConfig, setOutput, defineConstants, env, entryPoint, sourceMaps, addPlugins} = require('@webpack-blocks/webpack2');
const babel = require('@webpack-blocks/babel6');
const devServer = require('@webpack-blocks/dev-server2');
const webpack = require("webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = createConfig([
    entryPoint({
        index: '../create-react-app/src/index.js'
    }),
    setOutput({
        path: __dirname + '/build',
        publicPath: '/',
        sourcePrefix: '',
        filename: '[name].[hash].js'
    }),
    babel({
        cacheDirectory: true,
        presets: [require.resolve('babel-preset-react-app')],
        plugins: [require.resolve('babel-plugin-syntax-dynamic-import')]
    }),
    defineConstants({
        'process.env.NODE_ENV': process.env.NODE_ENV
    }),
    env('development', [
        devServer({
            port: process.env.PORT || 3000,
            contentBase: './src',
            stats: {colors: true}
        })
    ]),
    sourceMaps(),
    addPlugins([
        new HtmlWebpackPlugin({
            filename: 'index.html',
            favicon: './src/favicon.ico',
            chunks: ['common', 'index'],
            template: './src/index.html'
        })
    ])
]);

// console.log(module.exports);