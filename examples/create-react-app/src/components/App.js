import React, {Component} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {withWrapper} from "create-react-server/wrapper";
import {barAction} from "../store";
import jpg from "../images/js.jpg";
import png from "../images/js.png";
import Helmet from "./Helmet";

console.log(jpg);

const Loading = ({state}) => (<div>Loading: {state}...</div>);

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

        console.log('getInitialProps before dispatch', store.getState().bar);

        await store.dispatch(barAction());

        console.log('getInitialProps after dispatch', store.getState().bar);

        return {custom: 'custom' + Date.now()};

    };

    getPropsAgain(){
        this.props.getInitialProps();
    }

    render() {

        const {foo, bar, custom, initialError} = this.props;

        if (initialError) return <pre>Initial Error: {initialError.stack}</pre>;

        if (bar === 'initial' || bar === 'loading') return <Loading state={bar}/>;

        return (
            <div>
                <Helmet title='Index'/>
                <h1>Index</h1>
                <div>Foo {foo}, Bar {bar}, Custom {custom}</div>
                <button onClick={this.getPropsAgain.bind(this)}>Get Props Again</button>
                <hr/>
                <Link to="/page">Open page</Link>
                <hr/>
                <img src={jpg} width="50" height="50" alt="JPG"/>
                <img src={png} width="50" height="50" alt="PNG"/>
            </div>
        );

    }

}

App = connect(state => state)(App);

export default withWrapper(App);