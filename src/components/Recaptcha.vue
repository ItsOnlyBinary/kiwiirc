<template>
    <div>
        <div
            v-if="recaptchaSiteId"
            :data-sitekey="recaptchaSiteId"
            class="g-recaptcha"
        />
    </div>
</template>

<script>

'kiwi public';

export default {
    data() {
        return {
            recaptchaSiteId: '',
        };
    },
    created() {
        let options = this.$state.settings.startupOptions;
        this.recaptchaSiteId = options.recaptchaSiteId || '';

        this.$state.$on('network.connecting', (event) => {
            event.network.ircClient.once('socket connected', () => {
                let captchaResponse = this.captchaResponse();
                event.network.ircClient.raw('CAPTCHA', captchaResponse);
            });
        });
    },
    mounted() {
        if (!this.recaptchaSiteId) {
            return;
        }
        let scr = document.createElement('script');
        scr.src = 'https://www.google.com/recaptcha/api.js';
        scr.defer = true;
        this.$el.appendChild(scr);
    },
    methods: {
        captchaResponse() {
            let gEl = this.$el.querySelector('#g-recaptcha-response');
            return gEl ?
                gEl.value :
                '';
        },
    },
};
</script>
