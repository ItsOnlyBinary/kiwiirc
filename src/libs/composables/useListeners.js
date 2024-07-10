import { onBeforeUnmount } from 'vue';

export default function useListeners() {
    const listeningEvents = [];

    const listen = (source, event, fn) => {
        const off = () => {
            const eventIdx = listeningEvents.indexOf(off);
            if (eventIdx > -1) {
                listeningEvents.splice(eventIdx, 1);
            }
            (source.removeEventListener ?? source.$off ?? source.off).call(source, event, fn);
        };
        listeningEvents.push(off);

        (source.addEventListener ?? source.$on ?? source.on).call(source, event, fn);
        return off;
    };

    const listenOnce = (source, event, fn) => {
        const off = () => {
            (source.removeEventListener ?? source.$off ?? source.off).call(source, event, fn);
        };
        listeningEvents.push(off);

        const onceFn = (...args) => {
            if (source.removeEventListener) {
                source.removeEventListener(event, onceFn);
            }
            const eventIdx = listeningEvents.indexOf(off);
            if (eventIdx > -1) {
                listeningEvents.splice(eventIdx, 1);
            }
            fn.call(this, ...args);
        };

        (source.addEventListener ?? source.$once ?? source.once).call(source, event, onceFn);
        return off;
    };

    const push = (off) => {
        listeningEvents.push(off);
    };

    const clearAll = () => {
        while (listeningEvents.length) {
            listeningEvents.shift()();
        }
    };

    onBeforeUnmount(() => {
        clearAll();
    });

    return {
        listen,
        listenOnce,
        clearAll,
        push,
        get length() {
            return listeningEvents.length;
        },
    };
}
