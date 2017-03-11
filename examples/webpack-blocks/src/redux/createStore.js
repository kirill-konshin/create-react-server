import {applyMiddleware, compose, createStore} from "redux";
import createLogger from "redux-logger";
import thunk from "redux-thunk";
import promiseMiddleware from "redux-promise-middleware";
import reducers from "./reducers";

export default function configureStore(initialState) {

    const isBrowser = (typeof window !== 'undefined');

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

    const store = createStore(
        reducers,
        initialState,
        compose(
            applyMiddleware(...middlewares),
            isBrowser && window['devToolsExtension'] ? window['devToolsExtension']() : f => f
        )
    );

    //TODO Persist something to localStorage as example

    if (module.hot) {
        module.hot.accept('./reducers', () => {
            const nextReducers = require('./reducers').default;
            store.replaceReducer(nextReducers);
        });
    }

    return store;

}
