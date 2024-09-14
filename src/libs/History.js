'kiwi public';

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

    prepare() {
        if (!this.prepared) {
            window.addEventListener('popstate', async(e) => {
                if (e.state) {
                    const page = e.state.page;
                    await this.setPage(page);
                }
            });
            this.prepared = true;
        }
    }

    async setPage(page) {
        this.prepare();
        const previousHandler = this.handlers[this.currentPage];
        const handler = this.handlers[page];
        this.currentPage = page;
        await previousHandler.leave();
        await handler.enter();
    }

    push({
        enter,
        leave,
        path,
    }) {
        const url = new URL(this.baseUrl);
        url.pathname += path;
        if (this.currentPage < this.handlers.length - 1) {
            this.handlers.splice(this.currentPage + 1);
        }
        const page = this.handlers.length;
        this.history.pushState({
            page,
        }, '', url);
        this.handlers.push({ enter, leave });
        return this.setPage(page);
    }

    async replace({ enter, leave, path }) {
        const url = new URL(this.baseUrl);
        url.pathname += path;
        const page = this.currentPage;
        this.history.replaceState({
            page,
        }, '', url);
        const previousHandler = this.handlers[page];
        const handler = { enter, leave };
        this.handlers[page] = handler;
        previousHandler && await previousHandler.leave();
        await handler.enter();
    }
}
