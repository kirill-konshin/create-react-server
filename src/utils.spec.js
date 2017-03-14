import React from "react";
import MemoryFileSystem from "memory-fs";
import {errorTemplate, renderHTML, waitForTemplate} from "./utils";
import "./test";

test('waitForTemplate', async() => {

    const options = {
        fs: new MemoryFileSystem(),
        templatePath: '/foo'
    };

    options.fs.writeFileSync('/foo', 'bar', 'utf-8');
    expect(await waitForTemplate(options)).toBe('bar');

    options.fs.writeFileSync('/foo', 'baz', 'utf-8');
    expect(await waitForTemplate(options)).toBe('baz');

});

test('errorTemplate', () => {

    expect(errorTemplate({error: {code: 400, message: 'message', stack: 'stack'}}))
        .toBe('<h1>400 Server Error</h1><pre>stack</pre>');

    expect(errorTemplate({error: 'string'}))
        .toBe('<h1>undefined Server Error</h1><pre>string</pre>');

});

test('renderHTML', async() => {

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