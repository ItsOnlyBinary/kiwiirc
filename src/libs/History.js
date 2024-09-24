'kiwi public';

import getState from './state';

export class History {
    constructor(baseURL) {
        /**
         * @type {{ enter: () => Promise<void>, leave: () => Promise<void>}[]}
         */
        this.handlers = [];
        this.history = window.history;
        this.currentPage = 0;
        this.prepared = false;
        this.baseURL = baseURL;
    }

    go(n) {
        if (this.currentPage + n <= 0) {
            this.setPage(0, true);
            return;
        }
        this.log('go', n);
        this.log('source', new Error().stack);
        this.history.go(n);
    }

    log(...args) {
        window.kiwi.log.debug('[history]', ...args);
    }

    prepare() {
        if (!this.prepared) {
            // eslint-disable-next-line
            window.addEventListener('popstate', (e) => {
                const page = e?.state?.page;
                if (page === 0 && this.currentPage === 0) {
                    this.history.go();
                    return;
                }
                this.log('popstate', e);
                const state = getState();
                const net = state.getActiveNetwork();
                const buf = state.getActiveBuffer();
                const serverBuffer = net.serverBuffer();
                if (
                    !state.activeComponent &&
                    page < this.currentPage &&
                    buf === serverBuffer
                ) {
                    this.setPage(0, true);
                    this.history.go();
                    return;
                } else if (page === undefined) {
                    this.setPage(0, true);
                    return;
                }
                this.setPage(page);
            });
            this.prepared = true;
        }
    }

    setPage(page, setUrl = false) {
        this.prepare();
        this.log('source', new Error().stack);
        this.log('setting page', page);
        const previousHandler = this.handlers[this.currentPage];
        const handler = this.handlers[page];
        if (page !== undefined) {
            this.currentPage = page;
        }
        if (setUrl) {
            this.doReplace(handler);
        }
        previousHandler && previousHandler.leave();
        handler && handler.enter();
    }

    getUrl({
        path,
        query,
        hash,
    }) {
        const url = new URL(this.baseURL);
        if (path) {
            url.pathname = [
                ...url.pathname.split('/'),
                ...path.split('/'),
            ].filter(Boolean).join('/');
        } else {
            url.pathname = window.location.pathname;
        }
        if (query) {
            Object.entries(query).forEach((e) => {
                url.searchParams.set(e[0], e[1].toString());
            });
        } else if (!path) {
            url.search = window.location.search;
        }
        if (hash) {
            url.hash = hash;
        } else if (!path) {
            url.hash = window.location.hash;
        }
        if (url.pathname.charAt(url.pathname.length - 1) !== '/') {
            url.pathname += '/';
        }
        return url;
    }

    push({
        enter,
        leave,
        path,
        query,
        hash,
    }) {
        // eslint-disable-next-line
        this.log('pushing.....', ...arguments);
        const url = this.getUrl({ path, query, hash });
        if ('' + url === '' + window.location) {
            this.doReplace({ enter, leave, url });
            return;
        }
        if (this.currentPage < this.handlers.length - 1) {
            this.handlers.splice(this.currentPage + 1);
        }
        const page = this.handlers.length;
        this.history.pushState({
            page,
        }, '', url);
        this.handlers.push({ enter, leave, url });
        this.setPage(page);
    }

    replace({
        enter,
        leave,
        path,
        query,
        hash,
    }) {
        // eslint-disable-next-line
        this.log('replacing.....', ...arguments);
        const url = this.getUrl({ path, query, hash });
        if ('' + url === '' + window.location) {
            return;
        }
        this.doReplace({ enter, leave, url });
    }

    doReplace({
        enter,
        leave,
        url,
    }) {
        const page = this.currentPage;
        this.history.replaceState({
            page,
        }, '', url);
        const previousHandler = this.handlers[page];
        const handler = { enter, leave, url };
        this.handlers[page] = handler;
        previousHandler && previousHandler.leave();
        handler.enter();
    }
}
