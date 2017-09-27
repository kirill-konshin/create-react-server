import React from "react";
import {Provider} from "react-redux";
import {Route, Switch} from "react-router";
import {WrapperProvider} from "create-react-server/wrapper";
import NotFound from "./components/NotFound";
import App from "./components/App";
import Page from "./components/Page";
import createStore from "./store";

export default ({state, props, req}) => {

    if (!state && req) {
        state = {
            'foo': req.url + ':' + Date.now()
        };
    }

    return (
        <Provider store={createStore(state)}>
            <WrapperProvider initialProps={props}>
                <Switch>
                    <Route exact path="/" component={App}/>
                    <Route path="/page" component={Page}/>
                    <Route component={NotFound}/>
                </Switch>
            </WrapperProvider>
        </Provider>
    );

};
