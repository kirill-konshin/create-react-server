import React, {Component} from "react";
import {connect} from "react-redux";
import {barAction} from "../redux";
import Helmet from "./Helmet";

export class App extends Component {

    /**
     * This function is used for server-side rendering
     * @param location
     * @param params
     * @param history
     * @param store
     * @return {Promise}
     */
    static async getInitialProps({location, params, history, store}) {
        return await store.dispatch(barAction());
    };

    render() {
        const {foo, bar} = this.props;
        return (
            <div className="container">
                <Helmet title='Index'/>
                <h1>Index</h1>
                <div>Foo {foo}, Bar {bar}</div>
            </div>
        );
    }

}

export default connect(state => state, {barAction})(App);