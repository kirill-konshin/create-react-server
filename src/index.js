"use strict";

var fs = require("fs");
var path = require("path");
var Provider = require("react-redux").Provider;
var renderToString = require("react-dom/server").renderToString;
var ReactRouter = require("react-router");
var React = require("react");
var MemoryFileSystem = require('memory-fs');

var createMemoryHistory = ReactRouter.createMemoryHistory;
var match = ReactRouter.match;
var RouterContext = ReactRouter.RouterContext;

var roots = [
    '/',
    '/index.html'
];

var skippedExtensions = [
    '.css',
    '.less',
    '.sass',
    '.scss',
    '.ttf',
    '.woff',
    '.woff2',
    '.svg',
    '.eot',
    '.gif',
    '.jpg',
    '.jpeg',
    '.png',
    '.coffee',
    '.ts'
];

function skipRequireExtensions() {

    skippedExtensions.forEach(function(ext) {
        require.extensions[ext] = function() {};
    });

}

function sendError(res, code, e) {
    res.status(code).send("<h1>" + code + " Error</h1><pre>" + (e.stack || e.message || e) + "</pre>");
}

function createWebpackMiddleware(compiler, webpackConfig) {

    compiler.outputFileSystem = new MemoryFileSystem();

    return function(options) {
        options.fs = options.fs || compiler.outputFileSystem;
        return createExpressMiddleware(options);
    };

}

/**
 * @param options.createRouter
 * @param options.createStore
 * @param options.initialStateKey
 * @param options.mountNode
 * @param options.mountNodeTemplate
 * @param options.templatePath
 * @param options.outputPath
 * @param [options.initialState]
 * @param [options.debug]
 * @param [options.fs]
 * @param [options.roots]
 * @param [options.getInitialProps]
 * @param [options.notFound]
 * @return {Function}
 */
function createExpressMiddleware(options) {

    options = options || {};

    options.roots = options.roots || roots;
    options.fs = options.fs || fs;
    options.getInitialProps = options.getInitialProps || 'getInitialProps';
    options.notFound = options.notFound || 'notFound';
    options.initialState = options.initialState || undefined;

    var history = createMemoryHistory();
    var routes = options.createRouter(history);

    var templateHtml = '';

    function renderFullPage(html, preloadedState, options) {

        return (new Promise(function(resolve) {

            if (!options.fs.existsSync(options.templatePath) || !templateHtml) {

                var interval = setInterval(function() {

                    if (options.fs.existsSync(options.templatePath)) {
                        templateHtml = options.fs.readFileSync(options.templatePath).toString();
                        clearInterval(interval);
                        resolve(templateHtml);
                    }

                }, 500);

            } else {
                resolve(templateHtml);
            }

        })).then(function(templateHtml) {

            return templateHtml
                .replace(
                    options.mountNode,
                    options.mountNodeTemplate(html)
                )
                .replace(
                    '<head>', // this should be the first script on a page so that others can pick it up
                    '<head>\n<script type="text/javascript">window["' + options.initialStateKey + '"] = ' + JSON.stringify(preloadedState) + ';</script>'
                );

        });

    }

    return function(req, res, next) {

        var store = options.createStore(options.initialState, req);
        var location = history.createLocation(req.url);

        if (options.fs.existsSync(path.join(options.outputPath, location.pathname)) && !~roots.indexOf(location.pathname)) {
            if (options.debug) console.log('Static', location.pathname);
            return next();
        }

        match({routes: routes, location: location}, function(error, redirectLocation, renderProps) {

            if (options.debug) console.log('Rendering', location.pathname + location.search);

            if (redirectLocation) {
                return res.redirect(301, redirectLocation.pathname + redirectLocation.search);
            }

            if (error) {
                return sendError(res, 502, error);
            }

            if (renderProps === null) {
                return sendError(res, 404, renderFullPage('', store.getState(), options));
            }

            new Promise(function(resolve) {

                var location = renderProps.location;
                var params = renderProps.params;

                var Cmp = renderProps.components[renderProps.components.length - 1].WrappedComponent;

                if (!Cmp || !Cmp[options.getInitialProps]) {
                    return resolve([Cmp]);
                }

                resolve(Promise.all([Cmp, Cmp[options.getInitialProps]({
                    location: location,
                    params: params,
                    store: store,
                    history: history
                })]));

            }).then(function(result) {

                var Cmp = result[0];
                var fetchedData = result[1]; // kinda useless since everything is already rendered, can be used for flags from renderer, for example, title tag

                // console.log('Fetched data', fetchedData);
                // console.log('Store state before rendering', store.getState());

                var html = renderToString(React.createElement(Provider, {store: store}, React.createElement(RouterContext, renderProps)));

                res.status(Cmp && !Cmp[options.notFound] ? 200 : 404);

                return renderFullPage(html, store.getState(), options);

            }).then(res.send.bind(res)).catch(sendError.bind(null, res, 500));
            
        });

    };

}

exports.skipRequireExtensions = skipRequireExtensions;
exports.createWebpackMiddleware = createWebpackMiddleware;
exports.createExpressMiddleware = createExpressMiddleware;