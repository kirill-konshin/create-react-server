import React from "react";
import MemoryFileSystem from "memory-fs";
import {errorTemplate, middleware, renderHTML, waitForTemplate} from "./utils";
import {createStore} from "redux";
import {Route, Switch, Redirect, withRouter} from "react-router-dom";
import {connect, Provider} from "react-redux";
import {withWrapper, WrapperProvider} from "./wrapper";
import "./test";

// ------------------------------------------------------------------------------------------------------------------ //

const reducer = (state = {foo: 'initial'}, {type, payload}) => {
    if (type === 'FOO') return {foo: payload};
    return state;
};

const template = '<html><head></head><body><div id="app"><!--html--></div></body></html>';

const simpleErrorTemplate = (error) => (error.stack);

const defaultOptions = {
    initialPropsKey: 'iProps',
    initialStateKey: 'iState',
    template: ({template, html, error}) => {
        if (!!error) return simpleErrorTemplate(error);
        return template.replace('<!--html-->', html);
    }
};

const getRes = () => {
    const res = {
        redirect: jest.fn((status) => { res.statusCode = status; }),
        send: jest.fn(),
        status: jest.fn(),
        statusCode: 0,
        statusMessage: ''
    };
    return res;
};

const getReq = (url = '/') => ({url: url});

const getMiddleware = (options, req, res) => middleware({...defaultOptions, ...options}, template, req, res);

// ------------------------------------------------------------------------------------------------------------------ //

test('utils.waitForTemplate', async() => {

    const options = {
        fs: new MemoryFileSystem(),
        templatePath: '/foo'
    };

    options.fs.writeFileSync('/foo', 'bar', 'utf-8');
    expect(await waitForTemplate(options)).toBe('bar');

    options.fs.writeFileSync('/foo', 'baz', 'utf-8');
    expect(await waitForTemplate(options)).toBe('baz');

});

// ------------------------------------------------------------------------------------------------------------------ //

test('utils.errorTemplate', () => {

    expect(errorTemplate({error: {message: 'message', stack: 'stack'}}))
        .toBe('<h1>500 Server Error</h1><pre>stack</pre>');

    expect(errorTemplate({error: 'string'}))
        .toBe('<h1>500 Server Error</h1><pre>string</pre>');

});

// ------------------------------------------------------------------------------------------------------------------ //

test('utils.renderHTML', async() => {

    const options = {
        initialStateKey: 'initialStateKey',
        initialPropsKey: 'initialPropsKey',
        template: jest.fn(({template, html}) => (template.replace('<!--html-->', html)))
    };

    const template = '<html><head></head><body><div id="app"><!--html--></div></body></html>';
    const expected = '<html><head>' +
                     '<script type="text/javascript">window["initialStateKey"] = {"baz":"qux"};</script>' +
                     '<script type="text/javascript">window["initialPropsKey"] = {"foo":"bar"};</script>' +
                     '</head><body><div id="app">html</div></body></html>';

    const config = {
        component: 'component',
        html: 'html',
        initialProps: {foo: 'bar'},
        store: {getState: () => ({baz: 'qux'})},
        req: 'req',
        res: 'res',
        template: template
    };

    expect(await renderHTML(config, options)).toBe(expected);

    expect(options.template.mock.calls[0][0].component).toEqual('component');
    expect(options.template.mock.calls[0][0].html).toEqual('html');
    expect(options.template.mock.calls[0][0].initialProps).toEqual({foo: 'bar'});
    expect(options.template.mock.calls[0][0].store.getState()).toEqual({baz: 'qux'});
    expect(options.template.mock.calls[0][0].req).toEqual('req');
    expect(options.template.mock.calls[0][0].template).toEqual(
        '<html><head>' +
        '<script type="text/javascript">window["initialStateKey"] = {"baz":"qux"};</script>' +
        '<script type="text/javascript">window["initialPropsKey"] = {"foo":"bar"};</script>' +
        '</head><body><div id="app"><!--html--></div></body></html>'
    );

});

// ------------------------------------------------------------------------------------------------------------------ //

test('utils.middleware success with store', async() => {

    let Page = ({foo, custom}) => (<span>{foo}</span>);
    Page.getInitialProps = ({store}) => {
        store.dispatch({type: 'FOO', payload: 'dispatched'});
    };
    Page = connect(state => state)(Page);
    Page = withWrapper(Page);

    const app = ({state, props}) => (
        <Provider store={createStore(reducer, state)}>
            <WrapperProvider initialProps={props}>
                <Switch>
                    <Route exact path="/" component={Page}/>
                    <Redirect from="/redirect" to="/"/>
                </Switch>
            </WrapperProvider>
        </Provider>
    );

    const expected = (
        '<html><head>' +
        '<script type="text/javascript">window["iState"] = {"foo":"dispatched"};</script>' +
        '<script type="text/javascript">window["iProps"] = {};</script>' +
        '</head><body><div id="app">' +
        '<span data-reactroot="" data-reactid="1" data-react-checksum="1511724113">dispatched</span>' +
        '</div></body></html>'
    );

    const req1 = getReq();
    const res1 = getRes();
    await getMiddleware({app}, req1, res1);
    expect(res1.send.mock.calls[0][0]).toEqual(expected);

    const req2 = getReq('/redirect');
    const res2 = getRes();
    await getMiddleware({app}, req2, res2);
    expect(res2.redirect.mock.calls[0][0]).toEqual(301);
    expect(res2.statusCode).toEqual(301);

});

test('utils.middleware success with custom initial state', async() => {

    const req = getReq();
    const res = getRes();

    let Page = ({foo, custom}) => (<span>{foo}</span>);
    Page = connect(state => state)(Page);
    Page = withWrapper(Page);

    await getMiddleware({
        app: ({state, props}) => (
            <Provider store={createStore(reducer, {foo: 'override'})}>
                <WrapperProvider initialProps={props}>
                    <Route exact path="/" component={Page}/>
                </WrapperProvider>
            </Provider>
        ),
    }, req, res);

    expect(res.send.mock.calls[0][0]).toEqual(
        '<html><head>' +
        '<script type="text/javascript">window["iState"] = {"foo":"override"};</script>' +
        '<script type="text/javascript">window["iProps"] = {};</script>' +
        '</head><body><div id="app">' +
        '<span data-reactroot="" data-reactid="1" data-react-checksum="839848856">override</span>' +
        '</div></body></html>'
    );

});

test('utils.middleware no store success', async() => {

    const req = getReq();
    const res = getRes();

    let NoStoreComponent = ({foo}) => (<div>{foo}</div>);
    NoStoreComponent.getInitialProps = () => ({foo: 'initial'});
    NoStoreComponent = withWrapper(NoStoreComponent);

    await getMiddleware({
        app: ({state, props}) => (
            <WrapperProvider initialProps={props}>
                <Route exact path="/" component={NoStoreComponent}/>
            </WrapperProvider>
        ),
    }, req, res);

    expect(res.send.mock.calls[0][0]).toEqual(
        '<html><head>' +
        '<script type="text/javascript">window["iState"] = undefined;</script>' +
        '<script type="text/javascript">window["iProps"] = {"foo":"initial"};</script>' +
        '</head><body><div id="app">' +
        '<div data-reactroot="" data-reactid="1" data-react-checksum="-228912572">initial</div>' +
        '</div></body></html>'
    );

});

test('utils.middleware 404', async() => {

    const req = getReq();
    const res = getRes();

    let NoStoreComponent = ({foo}) => (<div>{foo}</div>);
    NoStoreComponent.getInitialProps = () => ({foo: 'initial'});
    NoStoreComponent = withWrapper(NoStoreComponent);

    await getMiddleware({
        app: ({state, props}) => (
            <WrapperProvider initialProps={props}>
                <Route exact path="/" component={NoStoreComponent}/>
            </WrapperProvider>
        ),
    }, req, res);

    expect(res.send.mock.calls[0][0]).toEqual(
        '<html><head>' +
        '<script type="text/javascript">window["iState"] = undefined;</script>' +
        '<script type="text/javascript">window["iProps"] = {"foo":"initial"};</script>' +
        '</head><body><div id="app">' +
        '<div data-reactroot="" data-reactid="1" data-react-checksum="-228912572">initial</div>' +
        '</div></body></html>'
    );

});


test('utils.middleware 500 when bad component', async() => {

    const req = getReq();
    const res = getRes();

    let BadComponent = () => { throw new Error('Bad Component'); };

    await getMiddleware({
        app: ({state, props}) => (
            <WrapperProvider initialProps={props}>
                <Route exact path="/" component={BadComponent}/>
            </WrapperProvider>
        ),
    }, req, res);

    expect(res.send.mock.calls[0][0]).toContain('Error: Bad Component');

});

test('utils.middleware 500 when error in template', async() => {

    const req = getReq();
    const res = getRes();

    let BadComponent = () => { throw new Error('Bad Component'); };

    await getMiddleware({
        template: () => (null),
        app: ({state, props}) => (
            <WrapperProvider initialProps={props}>
                <Route exact path="/" component={BadComponent}/>
            </WrapperProvider>
        ),
    }, req, res);

    expect(res.send.mock.calls[0][0]).toContain('<h1>500 Server Error</h1>');
    expect(res.send.mock.calls[0][0]).toContain('Return type of options.template() has to be a string');

});

test('utils.middleware 500 when bad initialProps', async() => {

    const req = getReq();
    const res = getRes();

    let BadInitialProps = ({initialError}) => (<div>{initialError && initialError.message}</div>);
    BadInitialProps.getInitialProps = () => { throw new Error('Bad Initial Props'); };
    BadInitialProps = withWrapper(BadInitialProps);
    BadInitialProps = withRouter(BadInitialProps); // adding withRouter to make life harder

    await getMiddleware({
        app: ({state, props}) => (
            <WrapperProvider initialProps={props}>
                <Route exact path="/" component={BadInitialProps}/>
            </WrapperProvider>
        ),
    }, req, res);

    expect(res.send.mock.calls[0][0]).toBe(
        '<html><head>' +
        '<script type="text/javascript">window["iState"] = undefined;</script>' +
        '<script type="text/javascript">window["iProps"] = {"initialError":"Bad Initial Props"};</script>' +
        '</head><body><div id="app">' +
        '<div data-reactroot="" data-reactid="1" data-react-checksum="-1262873217">Bad Initial Props</div>' +
        '</div></body></html>'
    );

});

test.skip('utils.middleware unwrapped');
test.skip('utils.middleware wrapped and no getInitialProps and no state');