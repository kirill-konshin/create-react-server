import Helmet from "react-helmet";

export default ({template, html, error}) => {

    //@see https://github.com/nfl/react-helmet#server-usage
    const head = Helmet.renderStatic();

    const errorHtml = error
        ? `<div id="server-error"><h1>Server Error</h1><pre>${error.stack || error}</pre></div>`
        : '';

    return template
        .replace(
            `<div id="root"></div>`,
            `${errorHtml}<div id="root">${html}</div>`
        )
        .replace(
            /<title>.*?<\/title>/g,
            head.title.toString()
        )
        .replace(
            /<html>/g,
            '<html ' + head.htmlAttributes.toString() + '>'
        );

};