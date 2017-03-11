import "es6-promise/auto";
import "isomorphic-fetch";
import path from "path";
import express from "express";
import {rewind} from "react-helmet";
import {createExpressMiddleware, skipRequireExtensions} from "../../../src/index";
import createRouter from "./router";
import createStore from "./redux";

const port = process.env.PORT || 3000;
const app = express();
const outputPath = path.join(process.cwd(), 'build');

skipRequireExtensions();

app.use(createExpressMiddleware({
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

    },
    templatePath: path.join(outputPath, 'index.html'),
    outputPath: outputPath,
    debug: true
}));

app.use(express.static(outputPath));

app.listen(port, (err) => {
    if (err) throw err;
    console.log('Listening %s', port);
});