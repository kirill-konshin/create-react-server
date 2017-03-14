import React from "react";
import {IndexRoute, Route} from "react-router";
import NotFound from './components/NotFound';

export default function() {

    return <Route path="/">

        <IndexRoute getComponent={() => (new Promise((res) => {
            require.ensure([], () => {
                res(require('./components/App').default);
            })
        }))}/>

        <Route path='/page' getComponent={() => (new Promise((res) => {
            require.ensure([], () => {
                res(require('./components/Page').default);
            })
        }))}/>

        <Route path='*' component={NotFound}/>

    </Route>;

}