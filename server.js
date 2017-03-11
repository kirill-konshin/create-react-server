import path from "path";
import Express from "express";
import webpack from "webpack";
import Server from "webpack-dev-server";
import {rewind} from "react-helmet";
import createRouter from "./demo/router";
import createStore from "./demo/redux/createStore";
import config from "./webpack.config";
import {createExpressMiddleware, createWebpackMiddleware, skipRequireExtensions} from "./src/index";

skipRequireExtensions();

const port = process.env.PORT || 3000;

function isDevServer() {
    return process.env.NODE_ENV !== 'production';
}

const options = {
    createRouter: (history) => (createRouter(history)),
    createStore: ({req, res}) => (createStore({
        foo: req.url + ':' + Date.now()
    })),
    initialStateKey: '__PRELOADED_STATE__',
    template: ({template, html, req}) => {

        //@see https://github.com/nfl/react-helmet#server-usage
        const head = rewind();

        return template
            .replace(
                `<div id="app"></div>`,
                `<div id="app">${html}</div>`
            )
            .replace(
                /<title>.*?<\/title>/g,
                head.title.toString()
            )
            .replace(
                /<html>/g,
                '<html ' + head.htmlAttributes.toString() + '>'
            );

    },
    templatePath: path.join(config.output.path, 'index.html'),
    outputPath: config.output.path,
    debug: true
};

if (isDevServer()) {

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

