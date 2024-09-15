'kiwi public';

import getState from './state';

export class History {
    constructor(baseUrl) {
        /**
         * @type {{ enter: () => Promise<void>, leave: () => Promise<void>}[]}
         */
        this.handlers = [];
        this.history = window.history;
        this.currentPage = 0;
        this.prepared = false;
        this.baseUrl = baseUrl;
    }

    go(n) {
        this.log('go', n);
        return this.history.go(n);
    }

    log(...args) {
        window.kiwi.log.debug('[history]', ...args);
    }

    prepare() {
        if (!this.prepared) {
            // eslint-disable-next-line
            window.addEventListener('popstate', (e) => {
                const page = e?.state?.page;
                this.log('popstate', e);
                if (page === undefined) {
                    this.currentPage = 0;
                    this.history.replaceState({}, '', this.baseUrl + '/');
                    const state = getState();
                    const net = state.getActiveNetwork();
                    const buf = state.getActiveBuffer();
                    const serverBuffer = net.serverBuffer();
                    if (!state.activeComponent && buf === serverBuffer) {
                        this.history.go();
                        return;
                    }
                    state.$emit('active.component');
                    state.setActiveBuffer(net.id, serverBuffer.name || '*', false);
                    // e.preventDefault();
                    return;
                }
                this.setPage(page);
            });
            this.prepared = true;
        }
    }

    setPage(page) {
        this.prepare();
        this.log('setting page', page);
        const previousHandler = this.handlers[this.currentPage];
        const handler = this.handlers[page];
        if (page !== undefined) {
            this.currentPage = page;
        }
        previousHandler && previousHandler.leave();
        handler && handler.enter();
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
        const url = new URL(this.baseUrl);
        if (path) {
            url.pathname = [
                ...url.pathname.split('/'),
                ...path.split('/'),
            ].filter(Boolean).join('/');
        }
        if (query) {
            Object.entries(query).forEach((e) => {
                url.searchParams.set(e[0], e[1].toString());
            });
        }
        if (hash) {
            url.hash = hash;
        }
        if (url.pathname.charAt(url.pathname.length - 1) !== '/') {
            url.pathname += '/';
        }
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
        this.handlers.push({ enter, leave, path: '' + url });
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
        const url = new URL(this.baseUrl);
        if (path) {
            url.pathname = [
                ...url.pathname.split('/'),
                ...path.split('/'),
            ].filter(Boolean).join('/');
        }
        if (query) {
            Object.entries(query).forEach((e) => {
                url.searchParams.set(e[0], e[1].toString());
            });
        }
        if (hash) {
            url.hash = hash;
        }
        if (url.pathname.charAt(url.pathname.length - 1) !== '/') {
            url.pathname += '/';
        }
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
        const handler = { enter, leave, path: '' + url };
        this.handlers[page] = handler;
        previousHandler && previousHandler.leave();
        handler.enter();
    }
}
