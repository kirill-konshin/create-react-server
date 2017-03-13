import React, {Component} from "react";
import {connect} from "react-redux";
import {withWrapper} from "../../../../wrapper";
import {barAction} from "../redux";
import Helmet from "./Helmet";

const Loading = ({state}) => (<div>{state}...</div>);

export class App extends Component {

    /**
     * This function is used for server-side rendering
     * @param location
     * @param params
     * @param query
     * @param store
     * @return {Promise}
     */
    static async getInitialProps({location, query, params, store}) {

        console.log('getInitialProps');

        await store.dispatch(barAction());

        return {custom: 'custom'};

    };

    render() {

        const {foo, bar, custom, initialError} = this.props;

        if (initialError) return <pre>Initial Error: {initialError.stack}</pre>;

        if (bar === 'initial' || bar === 'loading') return <Loading state={bar}/>;

        return (
            <div className="container">
                <Helmet title='Index'/>
                <h1>Index</h1>
                <div>Foo {foo}, Bar {bar}, Custom {custom}</div>
            </div>
        );

    }

}

App = connect(state => state)(App);

export default withWrapper(App);