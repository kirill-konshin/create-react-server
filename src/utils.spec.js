import {renderFullPage, waitForTemplate, errorTemplate} from "./utils";
import MemoryFileSystem from "memory-fs";
import React from "react";

test('waitForTemplate', async() => {

    const options = {
        fs: new MemoryFileSystem(),
        templatePath: '/foo'
    };

    options.fs.writeFileSync('/foo', 'bar', 'utf-8');

    // actual version
    expect(await waitForTemplate(options)).toBe('bar');

    options.fs.writeFileSync('/foo', 'baz', 'utf-8');

    // cached version
    expect(await waitForTemplate(options)).toBe('bar');

});

test('errorTemplate', () => {

    expect(errorTemplate({html: 'foo'})).toBe('foo');

    expect(errorTemplate({code: 400, error: {message: 'message', stack: 'stack'}}))
        .toBe('<h1>400 Server Error</h1><h2>message</h2><pre>stack</pre>');

    expect(errorTemplate({code: 400, error: 'string'}))
        .toBe('<h1>400 Server Error</h1><h2>string</h2><pre>string</pre>');

});

test('renderFullPage', async() => {

    const options = {
        fs: new MemoryFileSystem(),
        templatePath: '/foo',
        initialStateKey: 'initialStateKey',
        template: jest.fn(({template, html}) => (template.replace('<!--html-->', html)))
    };

    const config = {
        component: 'component',
        html: 'html',
        initialProps: {foo: 'bar'},
        store: {getState: () => ({baz: 'qux'})},
        req: 'req',
        res: 'res'
    };

    const template = '<html><head></head><body><div id="app"><!--html--></div></body></html>';
    const expected = '<html><head>' +
                     '<script type="text/javascript">window["initialStateKey"] = {"baz":"qux"};</script>' +
                     '</head><body><div id="app">html</div></body></html>';

    options.fs.writeFileSync('/foo', template, 'utf-8');

    expect(await renderFullPage(config, options)).toBe(expected);

    expect(options.template.mock.calls[0][0].component).toEqual('component');
    expect(options.template.mock.calls[0][0].html).toEqual('html');
    expect(options.template.mock.calls[0][0].initialProps).toEqual({foo: 'bar'});
    expect(options.template.mock.calls[0][0].store.getState()).toEqual({baz: 'qux'});
    expect(options.template.mock.calls[0][0].req).toEqual('req');
    expect(options.template.mock.calls[0][0].template).toEqual(template);

});