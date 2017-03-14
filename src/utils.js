var path = require("path");
var Provider = require("react-redux").Provider;
var WrapperProvider = require("./wrapper").WrapperProvider;
var renderToString = require("react-dom/server").renderToString;
var React = require("react");
var ReactRouter = require("react-router");
var lib = require("./lib");

var match = ReactRouter.match;
var RouterContext = ReactRouter.RouterContext;

var roots = [
    '/',
    '/index.html'
];

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

    e.code = e.code || httpCodes.internalServerError;

    res.statusMessage = e.message || e;
    res.status(e.code);

    return e;

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
        "<h1>" + config.error.code + " Server Error</h1>" +
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

function middleware(options, routes, history, template, req, res, next) {

    var Cmp, renderProps, store, initialProps; // these vars are passes all the way

    return (new Promise(function performRouting(resolve, reject) {

        ['createRoutes'].forEach((k) => {
            if (!options[k]) throw new Error('Mandatory option not defined: ' + k);
        });

        options.initialStateKey = options.initialStateKey || '__INITIAL__STATE__';
        options.initialPropsKey = options.initialPropsKey || '__INITIAL__PROPS__';
        options.createStore = options.createStore || null;
        options.outputPath = options.outputPath || path.join(process.cwd(), 'build');
        options.templatePath = options.templatePath || path.join(options.outputPath, 'index.html');
        options.template = options.template || defaultTemplate;

        var location = history.createLocation(req.url);

        if (
            options.fs.existsSync(path.join(options.outputPath, location.pathname)) &&
            !~roots.indexOf(location.pathname)
        ) {
            if (options.debug) console.log('Static', location.pathname);
            next();
            var e = new Error('Static');
            e.static = true;
            return reject(e);
        }

        match({routes: routes, location: location}, function(error, redirectLocation, props) {

            renderProps = props;

            var e;

            if (options.debug) console.log('Rendering', location.pathname + location.search);

            if (redirectLocation) {
                res.redirect(httpCodes.redirect, redirectLocation.pathname + redirectLocation.search);
                e = new Error('Redirect');
                e.code = httpCodes.redirect;
                return reject(e);
            }

            // TODO Find how to test
            if (error) {
                error.code = httpCodes.notImplemented;
                return reject(error);
            }

            // This is hard 404 which means router failed to load any page
            if (!renderProps) {
                e = new Error('Route Not Found');
                e.code = httpCodes.notFound;
                return reject(e);
            }

            resolve();

        });

    })).then(function getInitialPropsOfComponent() {

        store = options.createStore ? options.createStore({req: req, res: res}) : null;

        Cmp = renderProps.components[renderProps.components.length - 1]; // it used to be .WrappedComponent but it's useless, users can find it themselves if needed

        // console.log('Found Component', Cmp.getInitialProps);

        return new Promise(function(resolve) {
            resolve((Cmp && Cmp.getInitialProps) ? Cmp.getInitialProps({
                location: renderProps.location,
                params: renderProps.params,
                req: req,
                res: res,
                store: store
            }) : null);
        }).catch(function(e) {
            return {initialError: e.message || e.toString()};
        });

    }).then(function renderApp(props) {

        initialProps = props || {}; // client relies on truthy value of server-rendered props

        // console.log('Setting context initial props', initialProps);
        // console.log('Store state before rendering', store.getState());

        var routerContext = React.createElement(RouterContext, renderProps);

        return {
            html: renderToString(
                React.createElement(
                    WrapperProvider,
                    {initialProps: initialProps},
                    (store
                        ? React.createElement(Provider, {store: store}, routerContext)
                        : routerContext)
                )
            )
        };

    }).catch(function renderErrorHandler(e) {

        if (isRedirect(res) || e.static) throw e;

        // If we end up here it means server-side error that can't be handled by application
        // By returning an object we are recovering from error
        return {
            error: e
        };

    }).then(function renderAndSendHtml(result) {

        if (result.error) {
            result.error = setErrorStatus(res, result.error);
        } else {
            res.status(Cmp && !Cmp.notFound ? httpCodes.ok : httpCodes.notFound);
        }

        res.send(renderHTML(
            lib.extends({
                component: Cmp,
                error: null,
                initialProps: initialProps,
                html: '',
                renderProps: renderProps,
                req: req,
                res: res,
                store: store,
                template: template
            }, result), // appends error or html
            options
        ));

    }).catch(function finalErrorHandler(e) {

        if (isRedirect(res) || e.static) return;

        e = setErrorStatus(res, e);

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
exports.renderHTML = renderHTML;
exports.waitForTemplate = waitForTemplate;