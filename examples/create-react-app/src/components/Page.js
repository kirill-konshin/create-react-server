import React, {Component} from "react";
import {Link} from "react-router-dom";
import Helmet from "./Helmet";
import {withWrapper} from "create-react-server/wrapper";

export class Page extends Component {

    render() {

        return (
            <div>
                <Helmet title='Page'/>
                <h1>Page</h1>
                <hr/>
                <Link to="/">Open index</Link>
            </div>
        );

    }

}

export default withWrapper(Page);