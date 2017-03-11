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