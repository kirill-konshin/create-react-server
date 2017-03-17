import "es6-promise/auto";
import "isomorphic-fetch";
import React from "react";
import {render} from "react-dom";
import {BrowserRouter} from "react-router-dom";
import createApp from "./app";

const Root = () => (
    <BrowserRouter>
        {createApp({state: window.__INITIAL__STATE__, props: window.__INITIAL__PROPS__})}
    </BrowserRouter>
);

render((<Root/>), document.getElementById('root'));

if (module.hot) module.hot.accept();

