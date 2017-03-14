"use strict";

var fs = require('fs');
var path = require('path');
var express = require('express');
var createMemoryHistory = require("react-router").createMemoryHistory;
var utils = require('./utils');

var skippedExtensions = [
    '.coffee',
    '.css',
    '.eot',
    '.gif',
    '.jpg',
    '.jpeg',
    '.less',
    '.png',
    '.sass',
    '.scss',
    '.svg',
    '.ts',
    '.ttf',
    '.woff',
    '.woff2'
];

function skipRequireExtensions(additional) {

    skippedExtensions
        .concat(additional || [])
        .forEach(function(ext) {
            require.extensions[ext] = function() {};
        });

}

function createWebpackMiddleware(compiler, config) {

    if (!compiler.outputFileSystem) {
        throw new Error('Compiler has no file system yet, use inside config.devServer.setup(cb) callback');
    }

    return function(options) {
        options.fs = compiler.outputFileSystem;
        return createExpressMiddleware(options);
    };

}

/**
 * @param {function} options.createRoutes function must return routes or routes config for React Router
 * @param {function} [options.createStore] if set function must return an instance of Redux Store with initial state
 * @param {function} [options.template] main [template function](#template-function), performs injection of rendered HTML to the template, default = replaces `<div id="root"></div>` with `<div id="root">%HTML%</div>`
 * @param {string} [options.outputPath] path with static files, usually equals to Webpack's `output.path`
 * @param {string} [options.templatePath] path to `index.html`, default = `%outputPath%/index.html`
 * @param {boolean} [options.debug] emits to console some extra information about request handling, default = `false`
 * @param {object} [options.fs] internal option used to pass an instance of file system object
 * @param {string} [options.initialStateKey] key in `window` object that will be used to pass initial props, default = `__INITIAL_PROPS__`
 * @param {string} [options.initialPropsKey] key in `window` object that will be used to pass initial state, default = `__INITIAL_STATE__`
 * @return {Function}
 */
function createExpressMiddleware(options) {

    options = options || {};

    //TODO Create every time?
    var history = createMemoryHistory();
    var routes = options.createRoutes();

    options.fs = options.fs || fs;

    return function(req, res, next) {
        utils.waitForTemplate(options).then(function(template){
            utils.middleware(options, routes, history, template, req, res, next);
        });
    }

}

/**
 * @param {string} options.outputPath path with static files, usually equals to Webpack's `output.path`
 * @param {function} options.createRoutes function must return routes or routes config React Router
 * @param {function} [options.createStore] if set function must return an instance of Redux Store with initial state
 * @param {function} [options.template] main [template function](#template-function), performs injection of rendered HTML to the template, default = replaces `<div id="root"></div>` with `<div id="root">%HTML%</div>`
 * @param {string} [options.templatePath] path to `index.html`, default = `%outputPath%/index.html`
 * @param {boolean} [options.debug] emits to console some extra information about request handling, default = `false`
 * @param {object} [options.fs] internal option used to pass an instance of file system object
 * @param {string} [options.initialStateKey] key in `window` object that will be used to pass initial props, default = `__INITIAL_PROPS__`
 * @param {string} [options.initialPropsKey] key in `window` object that will be used to pass initial state, default = `__INITIAL_STATE__`
 * @param {string[]} [options.skipExtensions] array of strings that represent most commonly imported non-JS extensions that has to be skipped during server build, default = `['css', 'jpg', 'gif', ...]`
 * @param {number} [options.port] listening port, default = `3000`
 * @param {function} [options.listen] Express's listen function
 * @return {Function}
 */
function createExpressServer(options) {

    skipRequireExtensions(options.skipExtensions || null);

    var app = express();
    var port = options.port || 3000;

    app.use(createExpressMiddleware(options));

    app.use(express.static(options.outputPath));

    app.listen(port, options.listen || function(err) {
            if (err) throw err;
            console.log('Listening', port);
        });

    return app;

}

exports.skipRequireExtensions = skipRequireExtensions;
exports.createWebpackMiddleware = createWebpackMiddleware;
exports.createExpressMiddleware = createExpressMiddleware;
exports.createExpressServer = createExpressServer;