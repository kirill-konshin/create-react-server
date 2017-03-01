import path from "path";
import Express from "express";
import webpack from "webpack";
import Server from "webpack-dev-server";
import striptags from "striptags";
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

        template = template.replace(
            `<div id="app"></div>`,
            `<div id="app">${html}</div>`
        );

        const match = /<h1[^>]*>(.*?)<\/h1>/gi.exec(html);

        if (match) {
            const title = match[1];
            template = template.replace(
                /<title>.*?<\/title>/g,
                '<title>' + striptags(match[1]) + '</title>'
            );
        }

        return template;

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

