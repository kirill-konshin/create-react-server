Create React Server
===================

Config-free server side rendering for React applications based on React Router. Compatible with Redux apps and
Webpack Dev Middleware for simple and painless development and production usage. Comes as [CLI script](#cli-mode),
[standalone server](#custom-server), and [middleware](#middleware).

*This package is formerly known as `react-router-redux-middleware` (which is now deprecated).*

- [Installation](#installation)
- [Examples](#examples)
- [Preconditions](#preconditions)
- [CLI mode](#cli-mode) — simple integration with Create React App (aka React Scripts)
- [Config](#config)
- [Template Function](#template-function)
- [Custom server](#custom-server)
- [Use with Webpack Dev Middleware](#middleware) useful for 
- [Use with React Helmet](#use-with-react-helmet)
- [Asynchronous require](#asynchronous-require)
- [Handling props updates](#handling-props-updates)

## Installation

```bash
npm install create-react-server babel-preset-react-app --save-dev
```

You don't have to install `babel-preset-react-app` if you use Create React App, it will be pre-installed already.

## Examples

- With Create React App: [examples/create-react-app](https://github.com/kirill-konshin/create-react-server/tree/master/examples/create-react-app)
- With Webpack Blocks (custom webpack config, server, dev middleware): [examples/webpack-blocks](https://github.com/kirill-konshin/create-react-server/tree/master/examples/webpack-blocks)

In order to use examples you should clone the repository and do `npm install` inside the repo and then separate
`npm install` in example dir.

```bash
git clone https://github.com/kirill-konshin/create-react-server.git
cd create-react-server
npm install
cd examples/[any-example]
npm install
npm run redeploy # launch in production mode
```

## Preconditions

### Add `.babelrc` file or `babel` section of `package.json`

```json
{
    "presets": [
      "react-app"
    ]
}
```

### Page (e.g. leaf router node)

Server rendering procedure takes `getInitialProps` static property and performs everything defined in it both on server
and later on client (if needed). Anything that was returned from `getInitialProps` becomes the initial set of props
when component will be rendered on server.

On client these props will be available with some delay, so you may use custom property `initialLoading` which will be
`true` while `getInitialProps` function is resolving.

If an error occurs inside `getInitialProps` it will be available via `initialError` property. This property is populated
from the server as well (as a string, no trace, you may capture this also in `template` function).

Component also receives a wrapped version of `getInitialProps` in its `props`, so that it can be called when needed,
for example when `componentWillReceiveProps` on React Router route change to load new data, but be careful and don't
cause infinite loops or race conditions.

If you use `withWrapper` you *must* wrap each leaf page, otherwise if you open unwrapped page in browser and then
navigate to wrapped no `getInitialProps` will be called because wrapped will assume that it's first run.

```js
// src/Page.js

import React, {Component} from "react";
import {connect} from "react-redux"; // this is optional
import {withWrapper} from "create-react-server/wrapper";

export class App extends Component {

    static async getInitialProps({location: {pathname, query}, params, store}) {
        await store.dispatch(barAction()); // this is optional
        return {custom: 'custom'};
    };

    render() {
        const {foo, bar, custom, initialError} = this.props;
        if (initialError) return <pre>Initial Error: {initialError.stack}</pre>;
        return (
            <div>Foo {foo}, Bar {bar}, Custom {custom}</div>
        );
    }

}

App = connect(state => state)(App); // this is optional
export default withWrapper(App); // here we connect to WrapperProvider
```

Component which will be used as 404 stub should have `notFound` static property:

```js
// src/NotFound.js

import React, {Component} from "react";

export default class NotFound extends Component {
    static notFound = true;
    render() {
        return (
            <div>404 Not Found</div>
        );
    }

}
```

### Router

React Router is mandatory for this pacakge, so you have to make a `createRoutes` function that should return routes or
routes config for React Router:

```js
// src/routes.js

import React from "react";
import {Route, IndexRoute} from "react-router";
import NotFound from './NotFound';
import Page from './Page';

export default function() {
    return <Route path="/">
        <IndexRoute component={Page}/>
        <Route path="*" component={NotFound}/>
    </Route>;
}
```

### Redux (optional)

If your app is using Redux, then you will have to make a `createStore` function, that should take initial state as an
argument and return a new `Store`:

```js
// src/store.js

import {createStore} from "redux";

function reducer(state, action) { return state; }

export default function (initialState, {req, res}) {
    if (req) { // it means it's launched from server in CLI mode
        initialState = {foo: res.url}; // so we can pre-populate something
    }
    return createStore(
        reducer,
        initialState
    );
}
```

### Main App Entry Point

This  hackery is especially required if you use async routes:

```js
// src/index.js

import React from "react";
import {render} from "react-dom";
import {browserHistory, match, Router} from "react-router";
import {WrapperProvider} from "create-react-server/wrapper";

import createRoutes from "./routes";

const mountNode = document.getElementById('root');

const Root = () => (
    <WrapperProvider initialProps={window.__INITIAL__PROPS__}>
        <Router history={browserHistory}>
            {createRoutes()}
        </Router>
    </WrapperProvider>
);

render((<Root/>), mountNode);
```

If you use Redux then Root constant will be slightly different, it should have Redux `Provider`:

```js
import {Provider} from "react-redux";
import createStore from "./store";

const Root = () => (
    <Provider store={createStore(window.__INITIAL_STATE__)}>
        <WrapperProvider initialProps={window.__INITIAL__PROPS__}>
            <Router history={browserHistory}>
                {createRoutes()}
            </Router>
        </WrapperProvider>
    </Provider>
);
```

## CLI Mode
 
First of all prepare your application according to steps in [preconditions](#preconditions).

It is convenient to put console command into `scripts` section of `package.json`:

```json
{
    "build": "react-scripts build",
    "server": "create-react-server --createRoutes path-to-routes.js [--createStore path-to-store.js] [options]"
}
```

All specified JS files must export functions as `default export` or as `module.exports`. It assumes that
`--createRoutes path-to-routes.js` as path to file which exports a `createRoutes` and so on.

Available options:

- `--createRoutes` or `-r` path to JS file with `createRoutes` function
- `--createStore` or `-s` path to JS file with `createStore` function
- `--template` or `-t` path to JS file with `template` function
- `--outputPath` or `-o` as path to your `build` (e.g. your static files)
- `--templatePath` or `-i` path to your `index.html`
- `--debug` or `-d` if you want to get more information of requests handling
- `--port` or `-p` to bind to something other than `3000`, port will also be automatically taken from `process.env.PORT`


You may also run with `NODE_ENV=development` to get more info:

```bash
NODE_ENV=development create-react-server [your options]
```

Then run from console:

```bash
npm run build
npm run server
```


Now if you open `http://localhost:3000` you will see a page rendered on the server.

## Config

Middleware accepts following options:

- `options.outputPath` **required** path with static files, usually equals to Webpack's `output.path`
- `options.createRoutes()` **required** function must return routes or routes config for React Router
- `options.createStore({req, res})` *optional* if set function must return an instance of Redux Store with initial state
- `options.template` *optional*, main [template function](#template-function), performs injection of rendered HTML to
    the template, default = replaces `<div id="root"></div>` with `<div id="root">%HTML%</div>`
    completely failed to render
- `options.templatePath` *optional* path to `index.html`, default = `%outputPath%/index.html`
- `options.debug` *optional* emits to console some extra information about request handling, default = `false`
- `options.initialStateKey` *optional* key in `window` object that will be used to pass initial props, 
    default = `__INITIAL_PROPS__`
- `options.initialPropsKey` *optional* key in `window` object that will be used to pass initial state, 
default = `__INITIAL_STATE__` 

Server accepts following options in addition to the ones accepted by middleware:

- `options.skipExtensions` *optional* array of strings that represent most commonly imported non-JS extensions that has
    to be skipped during server build, default = `['css', 'jpg', 'gif', ...]` 
- `options.port` *optional* port to listen, default = `3000`
- `options.listen` *optional* Express's listen function

## Template Function

Template function performs injection of rendered HTML to the template. This function will also be called if React App
failed to render (e.g. in case of server error).

Function accepts `config` as parameter with the following always available properties:

- `config.error` error object if function is called as error handler, equals `null` otherwise
- `config.req` instance of NodeJS Request
- `config.res` instance of NodeJS Response
- `config.template` contents of `index.html` or any other file defined in `templatePath` option

If function is called in a **normal** way, e.g. NOT as error handler, the following properties will also be provided,
some of them still *may* be available in error handler mode, depending on which stage the error has happened:

- `config.component` matched component (your leaf page)
- `config.html` result of React rendering
- `config.initialProps` result of `getInitialProps` (resolved result of Promise if it was returned)
- `config.store` instance of Redux Store

Most common cases when this function is called as error handler are:

- You forgot to configure React Router's fallback route, e.g. `<Route path="*" component={...}/>`
- React Router has returned an error

If you don't output any error information then the client will be rendered as if nothing happened.

By default this function replaces `<div id="root"></div>` (exactly as written). If there is an error — it's HTML is
injected right before `div#root`.

If anything will be thrown from this function, then default error handler will take over. You should avoid this by
placing `try {} catch {}` around your code, in this case default handler wiil not be called.

## Custom server

First of all prepare your application according to steps in [preconditions](#preconditions).

In these example we will use `express` server and `babel-cli`:

```bash
npm install express babel-cli --save-dev
```

Modify `scripts` section of `package.json`:

```json
{
    "build": "react-scripts build && npm run build-server",
    "build-server": "NODE_ENV=production babel --source-maps --out-dir build-lib src",
    "server": "node ./build-lib/server.js"
}
```

It makes client side build using Create React App (React Scripts) and server side build using Babel, which takes
everything from `src` and puts the outcome to `build-lib`. You may add this directory to `.gitignore`.

```js
// src/server.js

import path from "path";
import {rewind} from "react-helmet";
import {createExpressServer} from "create-react-server";
import createRoutes from "./routes";
import createStore from "./store";

createExpressServer({
    port: process.env.PORT || 3000,
    createRoutes: () => (createRoutes()),
    createStore: ({req, res}) => (createStore({})),
    template: ({template, html, req}) => (
        template.replace(
            `<div id="root"></div>`,
            `<div id="root">${html}</div>`)),
    outputPath: path.join(process.cwd(), 'build')
});
```

Check out the ready-to-use example in [examples/create-react-app](https://github.com/kirill-konshin/create-react-server/tree/master/examples/create-react-app)
folder.

In this mode your `createStore` function will on server will receive second config argument: `{req, res}` with request
and response respectively. In other modes you can control what is passed where.

## Middleware

There are two middleware modes: for Webpack Dev Server and for Express server.

If you have access to `webpack.config.js` then you may run the Webpack Dev Server along with server side rendering,
this example covers both.

In order to do that we need to install `webpack-dev-server` (in addition to packages from 
[preconditions step](#preconditions)), you may skip this if you have already installed it. In these example we will use
`express` server and `babel-cli` to make server side builds:

```bash
npm install express babel-cli babel-preset-react-app webpack-dev-server html-webpack-plugin --save-dev
```

*Note: you don't have to install `babel-preset-react-app` if you use Create React App or you already have preset.

### Modify `scripts` section of `package.json`

In this example we run server by Babel Node, in this case server will be transformed in runtime (which is not
recommended for production). You also can build the server like in [custom server](#custom-server) section.

```json
{
    "server-dev": "NODE_ENV=development babel-node ./src/server.js",
    "server-runtime": "NODE_ENV=production babel-node ./src/server.js"
}
```

### Webpack Config

Main entry file `index.html` should be a part of webpack build, e.g. emitted to you output path. It could be a
real file or generated by `HtmlWebpackPlugin`, but it has to be known by Webpack.

Make sure your `webpack.config.js` has all the following:

```js
// webpack.config.js

var HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
//...
    "output": {
        path: process.cwd() + '/build', // mandatory
        publicPath: '/',
    },
    "plugins": [new HtmlWebpackPlugin({
        filename: 'index.html',
        favicon: './src/favicon.ico', // this is optional
        template: './src/index.html'
    })],
    devServer: {
        port: process.env.PORT || 3000,
        contentBase: './src',
    }
//...
}
```

### Server

```js
// src/server.js

import path from "path";
import Express from "express";
import webpack from "webpack";
import Server from "webpack-dev-server";
import createRoutes from "./createRoutes"; // same file as in client side
import createStore from "./src/createStore"; // same file as in client side
import config from "../webpack.config";
import {createExpressMiddleware, createWebpackMiddleware, skipRequireExtensions} from "create-react-server";

skipRequireExtensions(); // this may be omitted but then you need to manually teach Node to ignore non-js files

const port = process.env.PORT || 3000;

const options = {
    createRoutes: createRoutes,
    createStore: ({req, res}) => (createStore({
        foo: Date.now() // pre-populate something right here
    })),
    template: ({template, html}) => (template.replace(
        // !!!!! MUST MATCH THE INDEX.HTML
        `<div id="root"></div>`,
        `<div id="root">${html}</div>`
    )),
    templatePath: path.join(config.output.path, 'index.html'),
    outputPath: config.output.path
};

if (process.env.NODE_ENV !== 'production') {

    const compiler = webpack(config);

    config.devServer.setup = function(app) {
        app.use(createWebpackMiddleware(compiler, config)(options));
    };

    new Server(compiler, config.devServer).listen(port, '0.0.0.0', listen);

} else {

    const app = Express();

    app.use(createExpressMiddleware(options));
    app.use(Express.static(config.output.path));

    app.listen(port, listen);

}

function listen(err) {
    if (err) throw err;
    console.log('Listening %s', port);
}
```

Check out the ready-to-use example in [examples/webpack-blocks](https://github.com/kirill-konshin/create-react-server/tree/master/examples/webpack-blocks)
folder.

## Use with React Helmet

Take a look at React Helmet's [readme note about server side rendering](https://github.com/nfl/react-helmet#server-usage).
In a few words you have to add `rewind()` call to your implementation of `template` option:

```js
import {rewind} from "react-helmet";

const template = ({template, html, req}) => {

    const head = rewind();

    return template
        .replace(
            `<div id="root"></div>`,
            `<div id="root">${html}</div>`
        )
        .replace(
            /<title>.*?<\/title>/g,
            head.title.toString()
        )
        .replace(
            /<html>/g,
            '<html ' + head.htmlAttributes.toString() + '>'
        );

};
```

## Asynchronous Require

If you use `require.ensure` in your app, you will have to install `babel-plugin-transform-ensure-ignore`.

```bash
npm install babel-plugin-transform-ensure-ignore --save-dev
```

And add it to `.babelrc` file or `babel` section of `package.json`:

```json
{
    "presets": [
      "react-app"
    ],
    "plugins": [
      "transform-ensure-ignore"
    ]
}
```

If you use dynamic `import()` function, then you will need more plugins `babel-plugin-dynamic-import-webpack`, it should
be used together with `babel-plugin-transform-ensure-ignore`. Make sure it is used only on server, and Webpack (client
build) will not pick it up. On client plugin `babel-plugin-syntax-dynamic-import` should be used.
 
## Handling props updates

Your component may receive props from React Router without unmounting/mounting, for example `query` or `param` has
changed.

In this case you can create a `componentWillReceiveProps` lifecycle hook and call `this.props.getInitialProps()` from
it to force static `getInitialProps` method to be called again:

```js
export class Page extends React.Component {

    static async getInitialProps({params}) {
        var res = await fetch(`/pages?slug=${params.slug}`);
        return await res.json();
    }

    componentWillReceiveProps(newProps) {
        if (this.props.params.slug !== newProps.params.slug) this.props.getInitialProps();
    }

    render() {
        // your stuff here
    }

}

export default withWrapper(Page);
```