import React from "react";
import {render} from "react-dom";
import {Provider} from "react-redux";
import {browserHistory, match, Router} from "react-router";
import {WrapperProvider} from "../../../wrapper"; // this should be create-react-server/wrapper

// Create React App does not allow to create common library outside its' src dir, so we import from there
import createRoutes from "../../create-react-app/src/routes";
import createStore from "../../create-react-app/src/store";

const rootEl = document.getElementById('app');
const store = createStore(window.__INITIAL__STATE__);

function renderRoutes(routes, store, mountNode) {

    match({history: browserHistory, routes}, (error, redirectLocation, renderProps) => {

        render((
            <Provider store={store}>
                <WrapperProvider initialProps={window.__INITIAL__PROPS__}>
                    <Router {...renderProps} />
                </WrapperProvider>
            </Provider>
        ), mountNode);

    });

}

renderRoutes(createRoutes(browserHistory), store, rootEl);

if (module.hot) {
    module.hot.accept('../../create-react-app/src/routes', () => {
        const nextRoutes = require('../../create-react-app/src/routes').default;
        renderRoutes(nextRoutes(browserHistory), store, rootEl);
    });
}