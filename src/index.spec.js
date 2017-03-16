import fetch from "node-fetch";
import Express from "express";
import MemoryFileSystem from "memory-fs";
import React from "react";
import {createStore} from "redux";
import {Redirect, Route, Switch} from "react-router";
import {connect, Provider} from "react-redux";
import {createExpressMiddleware} from "./index";
import {withWrapper, WrapperProvider} from "./wrapper";
import "./test";

// ------------------------------------------------------------------------------------------------------------------ //

jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;

const reducer = (state = {foo: 'initial'}, {type, payload}) => {
    if (type === 'FOO') return {foo: payload};
    return state;
};

const template = '<html><head></head><body><div id="app"><!--html--></div></body></html>';

const simpleErrorTemplate = (error) => ('[' + error.code + ']:' + error.stack);

const defaultOptions = {
    templatePath: '/foo',
    outputPath: '/bar',
    template: ({template, html, error}) => {
        if (!!error) return simpleErrorTemplate(error);
        return template.replace('<!--html-->', html);
    },
    debug: false
};

const createOptions = (options = {}) => {
    options = {
        ...defaultOptions,
        fs: new MemoryFileSystem(),
        ...options
    };
    options.fs.writeFileSync('/foo', template, 'utf-8');
    return options;
};

const serverTest = (options, test) => {
    return (new Promise((res) => {

        const app = Express();

        app.use(createExpressMiddleware(options));

        const server = app.listen(3333, () => {
            res(server);
        });

    })).then(async(server) => {

        try {
            await test(server);
            server.close();
        } catch (e) {
            server.close();
            throw e;
        }

    });
};

// ------------------------------------------------------------------------------------------------------------------ //

test('createExpressMiddleware e2e success', async() => {

    let Page = ({foo, custom}) => (<span>{foo + '|' + custom}</span>);
    Page.getInitialProps = ({store}) => {
        store.dispatch({type: 'FOO', payload: 'dispatched'});
        return {custom: 'initial'};
    };
    Page = connect(state => state)(Page);
    Page = withWrapper(Page);

    const options = createOptions({
        app: ({state, props}) => (
            <Provider store={createStore(reducer, state)}>
                <WrapperProvider initialProps={props}>
                    <Switch>
                        <Route exact path='/' component={Page}/>
                        <Redirect from="/redirect" to="/"/>
                    </Switch>
                </WrapperProvider>
            </Provider>
        )
    });

    return await serverTest(options, async(server) => {

        const expected = (
            '<html><head>' +
            '<script type="text/javascript">window["__INITIAL__STATE__"] = {"foo":"dispatched"};</script>' +
            '<script type="text/javascript">window["__INITIAL__PROPS__"] = {"custom":"initial"};</script>' +
            '</head><body><div id="app">' +
            '<span data-reactroot="" data-reactid="1" data-react-checksum="289216439">dispatched|initial</span>' +
            '</div></body></html>'
        );

        expect(await (await fetch('http://localhost:3333/')).text()).toBe(expected);
        expect(await (await fetch('http://localhost:3333/redirect')).text()).toBe(expected);

    });

});