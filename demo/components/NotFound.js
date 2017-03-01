import React from "react";
import {Link} from "react-router";
import Helmet from "./Helmet";

export default class NotFound extends React.Component {

    static notFound = true; // this is needed for server side renderer to understand that route was not found

    render() {

        return (
            <div>
                <Helmet title="Page Not Found"/>
                <h1>Page Not Found</h1>
                <p>Go to <Link to="/">index page</Link>.</p>
            </div>
        );

    }

}