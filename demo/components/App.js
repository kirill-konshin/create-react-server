import React, {Component} from "react";
import {connect} from "react-redux";
import {barAction} from "../redux/actions";
import Helmet from "./Helmet";

class App extends Component {

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

App = connect(state => state, {barAction})(App);

export default App;