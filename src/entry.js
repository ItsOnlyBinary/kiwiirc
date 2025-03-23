/* eslint-disable */
// const originalRequire = __webpack_require__;

// let proxyId = 0;
// const createProxy = (obj) => {
//     const id = ++proxyId;
//     return new Proxy(obj, {
//         // get(target, prop, receiver) {
//         //     console.log(`${id} require get`, prop);
//         //     if (['object', 'function'].includes(typeof target[prop])) {
//         //         return createProxy(target[prop]);
//         //     }
//         //     return target[prop];
//         // },
//         apply(target, thisArg, argumentsList) {
//             const result = Reflect.apply(target, thisArg, argumentsList);
//             if (argumentsList[0].indexOf('./src') === 0) {
//                 console.log(`${id} require apply`, argumentsList);
//                 console.log(`${id} require result`, result);
//             }
//             return result;
//         },
//     });
// }

// // Override __webpack_require__ to point to the proxy
// __webpack_require__ = createProxy(originalRequire);
// console.log('import');
// console.dir(import, { depth: null, showHidden: true });

import('@/main.js');
