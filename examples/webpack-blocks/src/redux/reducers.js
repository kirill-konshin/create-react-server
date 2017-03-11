import {combineReducers} from "redux";

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

export default combineReducers({
    foo,
    bar
});