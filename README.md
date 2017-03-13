Create React Server
===================

Middleware for React + Router + Redux with Server Side Rendering. Formerly known as `react-router-redux-middleware`.

- [Installation](#installation)
- [Preconditions](#preconditions)
- [Simple integration with Create React App (aka React Scripts)](#use-with-create-react-app)
- [Use with Webpack Dev Middleware](#use-with-webpack-dev-middleware)
- [Use with React Helmet](#use-with-react-helmet)

## Installation

```bash
npm install create-react-server --save-dev
```

## Preconditions

In these examples we will use `express` server and `babel-cli` (with plugin `babel-plugin-transform-ensure-ignore`) to
make server side builds:

```bash
npm install express babel-cli babel-plugin-transform-ensure-ignore babel-preset-react-app --save-dev
```

*Note: you don't have to install `babel-preset-react-app` if you use Create React App or you already have preset.

### Add `.babelrc` file or `babel` section of `package.json`

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

### Page (e.g. leaf router node)

```js
import React, {Component} from "react";
import {connect} from "react-redux";
import {withWrapper} from "react-router-redux-wrapper";

export class App extends Component {

    static async getInitialProps({location, query, params, store}) {
        await store.dispatch(barAction());
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

App = connect(state => state)(App);
export default withWrapper(App); // here we connect to WrapperProvider
```

Component which will be used as 404 stub should have `notFound` static property:

```js
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

Create Router function should take history as an argument and return a new `Router`:

```js
import React from "react";
import {Router, Route} from "react-router";
import NotFound from './NotFound';
import App from './App';

export default function(history) {
    return <Router history={history}>
        <Route path='/' component={App}/>
        <Route path='*' component={NotFound}/>
    </Router>;
}
```

### Redux

Create Store function should take initial state as an argument and return a new `Store`:

```js
import {createStore} from "redux";

function reducer(state, action) { return state; }

export default function (initialState) {
    return createStore(
        reducer,
        initialState
    );
}
```

### Main App Entry Point

This  hackery is especially required if you use async routes:

```js
import React from "react";
import {render} from "react-dom";
import {Provider} from "react-redux";
import {browserHistory, match, Router} from "react-router";
import {WrapperProvider} from "create-react-server/wrapper";

import createRouter from "./createRouter";
import createStore from "./createStore";

const mountNode = document.getElementById('root'); // !!!!! PLEASE NOTE ID OF MOUNT NODE !!!!!
const store = createStore(window.__INITIAL_STATE__); // !!!!! PLEASE NOTE THE NAME OF VARIABLE !!!!!

const Root = () => (
    <Provider store={store}>
        <WrapperProvider initialProps={window.__INITIAL__PROPS__}>
            {createRouter(browserHistory)}
        </WrapperProvider>
    </Provider>
);

render((<Root/>), mountNode);
```

## Use with Create React App

### Modify `scripts` section of `package.json`

```json
{
    "build": "react-scripts build && NODE_ENV=production babel --source-maps --out-dir build-lib src",
    "server": "node ./build-lib/server.js"
}
```

It makes client side build using Create React App (React Scripts) and server side build using Babel, which takes everything from `src` and
puts the outcome to `build-lib`. You may add this directory to `.gitignore`.

### Server

Create `./src/server.js`:

```js
import path from "path";
import express from "express";
import {rewind} from "react-helmet";
import {createExpressMiddleware, skipRequireExtensions} from "create-react-server";
import createRouter from "./createRouter";
import createStore from "./createStore";

const port = process.env.PORT || 3000;
const app = express();
const outputPath = path.join(process.cwd(), 'build');

skipRequireExtensions();

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection:', reason.stack || reason);
});

app.use(createExpressMiddleware({
    createRouter: (history) => (createRouter(history)),
    createStore: ({req, res}) => (createStore({})),
    template: ({template, html, req}) => (
        template.replace(
            `<div id="root"></div>`,
            `<div id="root">${html}</div>`)),
    templatePath: path.join(outputPath, 'index.html'),
    outputPath: outputPath,
    debug: true
}));

app.use(express.static(outputPath));

app.listen(port, (err) => {
    if (err) throw err;
    console.log('Listening %s', port);
});
```

Check out the ready-to-use example in [examples/create-react-app](https://github.com/kirill-konshin/create-react-server/tree/master/examples/create-react-app)
folder.

## Use with Webpack Dev Middleware

If you have access to `webpack.config.js` then you may run the Webpack Dev Middleware along with server side rendering.

In order to do that we need to install `webpack-dev-server` (in addition to packages from 
[preconditions step](#preconditions)), you may skip this if you have already installed it:

```bash
npm install webpack-dev-server html-webpack-plugin --save-dev
```

### Modify `scripts` section of `package.json`

If you don't want to build your server, you can also run it by Babel Node, in this case server will be transformed in
runtime (not recommended for production).

```json
{
    "server-dev": "NODE_ENV=development babel-node ./src/server.js",
    "server-runtime": "NODE_ENV=production babel-node ./src/server.js"
}
```

You also can build the server like in [React Scripts example](#use-with-create-react-app).

### Webpack Config

Main entry file `index.html` should be a part of webpack build, e.g. emitted to you output path. It could be a
real file or generated by `HtmlWebpackPlugin`, but it has to be known by Webpack.

Make sure your `webpack.config.js` has all the following:

```js
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

Create `./src/server.js`:

```js
import path from "path";
import Express from "express";
import webpack from "webpack";
import Server from "webpack-dev-server";
import createRouter from "./createRouter"; // same file as in client side
import createStore from "./src/createStore"; // same file as in client side
import config from "../webpack.config";
import {createExpressMiddleware, createWebpackMiddleware, skipRequireExtensions} from "create-react-server";

skipRequireExtensions(); // this may be omitted but then you need to manually teach Node to ignore non-js files

const port = process.env.PORT || 3000;

const options = {
    createRouter: createRouter,
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
    const middleware = createWebpackMiddleware(compiler, config);

    config.devServer.setup = function(app) {
        app.use(middleware(options));
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

## Use with React Helmet

Take a look at React Helmet's [readme note about server side rendering](https://github.com/nfl/react-helmet#server-usage).
In a few words you have to add `rewind()` call to your implementation of `template` option:

```js
import {rewind} from "react-helmet";

const options = {
    ...,
    template: ({template, html, req}) => {

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

    }
};
```

Check out the ready-to-use example in [examples/webpack-blocks](https://github.com/kirill-konshin/create-react-server/tree/master/examples/webpack-blocks)
folder.