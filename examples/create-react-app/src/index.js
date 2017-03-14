import "es6-promise/auto";
import "isomorphic-fetch";
import React from "react";
import {render} from "react-dom";
import {browserHistory, Router} from "react-router";
import {Provider} from "react-redux";
import {WrapperProvider} from "../../../wrapper"; // this should be create-react-server/wrapper

import createRoutes from "./routes";
import createStore from "./store";

const Root = () => (
    <Provider store={createStore(window.__INITIAL__STATE__)}>
        <WrapperProvider initialProps={window.__INITIAL__PROPS__}>
            <Router history={browserHistory}>
                {createRoutes()}
            </Router>
        </WrapperProvider>
    </Provider>
);

render((<Root/>), document.getElementById('root'));

if (module.hot) module.hot.accept();

