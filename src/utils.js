var path = require("path");
var renderToString = require("react-dom/server").renderToString;
var React = require("react");
var StaticRouter = require("react-router").StaticRouter;
var lib = require("./lib");

var httpCodes = {
    redirect: 301,
    ok: 200,
    notFound: 404,
    internalServerError: 500,
    notImplemented: 501
};

var pollInterval = 200;

function isRedirect(res) {
    return res.statusCode === httpCodes.redirect;
}

function setErrorStatus(res, e) {

    res.statusMessage = e.message || e;
    res.status(httpCodes.internalServerError);

}

function waitForTemplate(options) {

    return (new Promise(function(resolve) {

        var interval = setInterval(function() {

            if (options.fs.existsSync(options.templatePath)) {
                clearInterval(interval);
                resolve(options.fs.readFileSync(options.templatePath).toString());
            }

        }, pollInterval);

    }));

}

function renderHTML(config, options) {

    var parsedTemplate = options.template({
        component: config.component,
        error: config.error,
        html: config.html,
        initialProps: config.initialProps,
        store: config.store,
        renderProps: config.renderProps,
        req: config.req,
        res: config.res,
        template: config.template.replace(
            '<head>', // this should be the first script on a page so that others can pick it up
            '<head>' +
            '<script type="text/javascript">window["' + options.initialStateKey + '"] = ' + JSON.stringify(config.store ? config.store.getState() : undefined) + ';</script>' +
            '<script type="text/javascript">window["' + options.initialPropsKey + '"] = ' + JSON.stringify(config.initialProps) + ';</script>'
        )
    });

    if (typeof parsedTemplate !== 'string') throw new Error('Return type of options.template() has to be a string');

    return parsedTemplate;

}

function errorTemplate(config) {
    return (
        "<h1>" + httpCodes.internalServerError + " Server Error</h1>" +
        "<pre>" + (config.error.stack || config.error) + "</pre>"
    );
}

function defaultTemplate(config) {

    var error = config.error ? ('<div id="server-error">' + errorTemplate(config) + '</div>') : '';

    return config.template.replace(
        '<div id="root"></div>',
        error + '<div id="root">' + config.html + '</div>'
    );

}

function middleware(options, template, req, res) {

    var initialProps, context = {}; // these vars are passes all the way

    return (new Promise(function performRouting(resolve, reject) {

        ['app'].forEach((k) => {
            if (!options[k]) throw new Error('Mandatory option not defined: ' + k);
        });

        var initialHtml = renderToString(React.createElement(
            StaticRouter,
            {location: req.url, context: context},
            options.app({
                props: undefined,
                req: req,
                res: res,
                state: undefined
            })
        ));

        // console.log('Context', context);

        if (context.url) {
            res.redirect(httpCodes.redirect, context.url); //TODO Handle context.code
            return reject(new Error('Redirect'));
        }

        resolve(initialHtml);

    })).then(function getInitialPropsOfComponent() {

        return (new Promise(function(resolve) {
            resolve((context.getInitialProps) ? context.getInitialProps({
                location: context.location,
                req: req,
                res: res,
                store: context.store
            }) : null);
        }).catch(function(e) {
            return {initialError: e.message || e.toString()};
        }));

    }).then(function renderApp(props) {

        initialProps = props || {}; // client relies on truthy value of server-rendered props

        // console.log('Setting context initial props', initialProps);
        // console.log('Store state before rendering', context.store.getState());

        return {
            html: renderToString(React.createElement(
                StaticRouter,
                {location: req.url, context: context},
                options.app({
                    props: initialProps,
                    req: req,
                    res: res,
                    state: context.store ? context.store.getState() : undefined
                })
            ))
        };

    }).catch(function renderErrorHandler(e) {

        if (isRedirect(res)) throw e;

        // If we end up here it means server-side error that can't be handled by application
        // By returning an object we are recovering from error
        return {
            error: e
        };

    }).then(function renderAndSendHtml(result) {

        if (result.error) {
            setErrorStatus(res, result.error);
        } else {
            res.status(context.code || httpCodes.ok);
        }

        res.send(renderHTML(
            lib.extends({
                error: null,
                initialProps: initialProps,
                html: '',
                req: req,
                res: res,
                store: context.store,
                template: template
            }, result), // appends error or html
            options
        ));

    }).catch(function finalErrorHandler(e) {

        if (isRedirect(res)) return;

        setErrorStatus(res, e);

        res.send(errorTemplate({
            error: e,
            req: req,
            res: res,
            template: template
        }));

        return e; // re-throw to make it unhandled?

    });

}

exports.middleware = middleware;
exports.errorTemplate = errorTemplate;
exports.defaultTemplate = defaultTemplate;
exports.renderHTML = renderHTML;
exports.waitForTemplate = waitForTemplate;