import "es6-promise/auto";
import "isomorphic-fetch";
import React from "react";
import {render} from "react-dom";
import {browserHistory} from "react-router";
import {Provider} from "react-redux";
import {WrapperProvider} from "../../../wrapper";

import createRouter from "./router";
import createStore from "./redux";

const mountNode = document.getElementById('root');
const store = createStore(window.__INITIAL__STATE__);

const Root = () => (
    <Provider store={store}>
        <WrapperProvider initialProps={window.__INITIAL__PROPS__}>
            {createRouter(browserHistory)}
        </WrapperProvider>
    </Provider>
);

render((<Root/>), mountNode);

if (module.hot) module.hot.accept();

