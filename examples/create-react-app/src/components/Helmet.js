import React from "react";
import Helmet from "react-helmet";

export default (props) => (
    <Helmet defaultTitle='Wat?' titleTemplate="%s | Demo" {...props} />
);