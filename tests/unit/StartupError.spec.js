import { createApp } from 'vue';
import StartupError from '@/components/StartupError.vue';

describe('StartupError.vue', () => {
    it('should render correct contents', () => {
        const el = document.createElement('div');
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

        app.mount(el);

        expect(el.querySelector('.kiwi-wrap > div').textContent).toEqual('some error');
    });
});
