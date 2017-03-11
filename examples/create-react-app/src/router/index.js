import React from "react";
import {Router, Route} from "react-router";
import NotFound from '../components/NotFound';

export default function(history) {

    return <Router history={history}>

        <Route path='/' getComponent={() => (new Promise((res) => {
            require.ensure([], () => {
                res(require('../components/App').default);
            })
        }))}/>

        <Route path='*' component={NotFound}/>

    </Router>;

}