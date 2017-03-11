"use strict";

var fs = require("fs");
var MemoryFileSystem = require('memory-fs');
var createMemoryHistory = require("react-router").createMemoryHistory;
var utils = require('./utils');

var ignoreUrls = [
    '/',
    '/index.html'
];

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

function createWebpackMiddleware(compiler, webpackConfig) {

    compiler.outputFileSystem = new MemoryFileSystem();

    return function(options) {
        options.fs = options.fs || compiler.outputFileSystem;
        return createExpressMiddleware(options);
    };

}

/**
 * @param {function} options.createRouter
 * @param {function} options.createStore
 * @param {function} options.template
 * @param {function} options.errorTemplate
 * @param {string} options.templatePath
 * @param {string} options.outputPath
 * @param {boolean} [options.debug]
 * @param {object} [options.fs]
 * @param {string[]} [options.ignoreUrls]
 * @param {string} [options.getInitialPropsKey]
 * @param {string} [options.notFoundKey]
 * @param {string} [options.initialStateKey]
 * @return {Function}
 */
function createExpressMiddleware(options) {

    options = options || {};

    ['template', 'templatePath', 'outputPath', 'createRouter', 'createStore'].forEach((k) => {
        if (!options[k]) throw new Error('Mandatory option not defined: ' + k);
    });

    options.ignoreUrls = options.ignoreUrls || ignoreUrls;
    options.fs = options.fs || fs;
    options.getInitialPropsKey = options.getInitialPropsKey || 'getInitialProps';
    options.notFoundKey = options.notFoundKey || 'notFound';
    options.initialStateKey = options.initialStateKey || '__INITIAL__STATE__';
    options.errorTemplate = options.errorTemplate || utils.errorTemplate;

    var history = createMemoryHistory();
    var routes = options.createRouter(history);
    var templatePromise = utils.waitForTemplate(options);

    return utils.middleware.bind(null, options, routes, history, templatePromise);

}

exports.skipRequireExtensions = skipRequireExtensions;
exports.createWebpackMiddleware = createWebpackMiddleware;
exports.createExpressMiddleware = createExpressMiddleware;