import React from "react";
import {render} from "react-dom";
import {Provider} from "react-redux";
import {browserHistory, match, Router} from "react-router";

import createRouter from "./router";
import createStore from "./redux/createStore";

const rootEl = document.getElementById('app');
const store = createStore(window.__PRELOADED_STATE__);

function renderRoutes(routes, store, mountNode) {

    match({history: browserHistory, routes}, (error, redirectLocation, renderProps) => {

        render((
            <Provider store={store}>
                <Router {...renderProps} />
            </Provider>
        ), mountNode);

    });

}

renderRoutes(createRouter(browserHistory), store, rootEl);

if (module.hot) {
    module.hot.accept('./router', () => {
        const nextRoutes = require('./router').default;
        renderRoutes(nextRoutes(browserHistory), store, rootEl);
    });
}