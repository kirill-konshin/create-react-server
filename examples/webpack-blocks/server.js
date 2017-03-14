import path from "path";
import Express from "express";
import webpack from "webpack";
import Server from "webpack-dev-server";
import {createExpressMiddleware, createWebpackMiddleware, skipRequireExtensions} from "../../src/index"; // this should be create-react-server
import config from "./webpack.config";

// Create React App does not allow to create common library outside its' src dir, so we import from there
import template from "../create-react-app/template";
import createRoutes from "../create-react-app/src/routes";
import createStore from "../create-react-app/src/store";

skipRequireExtensions();

const port = process.env.PORT || 3000;

function isDevServer() {
    return process.env.NODE_ENV !== 'production';
}

const options = {
    createRoutes: () => (createRoutes()),
    createStore: ({req, res}) => (createStore({
        foo: req.url + ':' + Date.now()
    })),
    template: template,
    outputPath: config.output.path,
    templatePath: path.join(config.output.path, 'index.html'),
    debug: true
};

if (isDevServer()) {

    const compiler = webpack(config);

    config.devServer.setup = (app) => {
        app.use(createWebpackMiddleware(compiler, config)(options));
    };

    new Server(compiler, config.devServer).listen(port, '0.0.0.0', listen);

} else {

    // this can also be replaced with createExpressServer({...options, listen})
    const app = Express();
    app.use(createExpressMiddleware(options));
    app.use(Express.static(config.output.path));
    app.listen(port, listen);

}

function listen(err) {
    if (err) throw err;
    console.log('Listening %s', port);
}

