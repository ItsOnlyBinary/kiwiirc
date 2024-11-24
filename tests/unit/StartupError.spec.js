import { createApp } from 'vue';
import StartupError from '@/components/StartupError';

describe('StartupError.vue', () => {
    it('should render correct contents', () => {
        const app = createApp(
            StartupError,
            { error: 'some error' }
        );

        app.mixin({
            computed: {
                $t() {
                    return (key, options) => key;
                },
            },
        });

        const el = document.createElement('div');
        app.mount(el);

        expect(el.querySelector('span.kiwi-error-text').textContent).toEqual('some error');
    });
});
