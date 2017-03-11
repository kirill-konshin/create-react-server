import {applyMiddleware, compose, createStore, combineReducers} from "redux";
import createLogger from "redux-logger";
import thunk from "redux-thunk";
import promiseMiddleware from "redux-promise-middleware";

function foo(state = 'foo', {type, payload}) {
    return state;
}

function bar(state = 'bar', {type, payload}) {
    switch (type) {
        case 'BAR_SUCCESS':
            return payload;
        case 'BAR_PENDING':
            return 'loading';
        default:
            return state;
    }
}

export function barAction() {
    return {
        type: 'BAR',
        payload: new Promise((res, rej) => {
            setTimeout(() => {
                res(Date.now());
            }, 250);
        })
    }
}

const isBrowser = (typeof window !== 'undefined');

export default function configureStore(initialState) {

    let middlewares = [
        promiseMiddleware({
            promiseTypeSuffixes: ['PENDING', 'SUCCESS', 'ERROR']
        }),
        thunk
    ];

    if (isBrowser) {
        middlewares.push(createLogger({
            collapsed: true
        }));
    }

    return createStore(
        combineReducers({
            foo,
            bar
        }),
        initialState,
        compose(
            applyMiddleware(...middlewares),
            isBrowser && window['devToolsExtension'] ? window['devToolsExtension']() : f => f
        )
    );

}