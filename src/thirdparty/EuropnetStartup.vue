<template>
    <div class="kiwi-welcome-europnet" :class="[
        closing ? 'kiwi-welcome-europnet--closing' : '',
        backgroundImage ? '' : 'kiwi-welcome-europnet--no-bg',
    ]" :style="backgroundStyle">
        <div class="kiwi-welcome-europnet-section kiwi-welcome-europnet-section-connection">
            <template v-if="!network || network.state === 'disconnected'">
                <form @submit.prevent="formSubmit" class="u-form kiwi-welcome-europnet-form">
                    <h2 v-html="greetingText"></h2>
                    <div class="kiwi-welcome-europnet-error" v-if="network && (network.last_error || network.state_error)">We couldn't connect to the server :( <span>{{network.last_error || readableStateError(network.state_error)}}</span></div>
                    <div class="kiwi-welcome-europnet-group nick">
                        <span class="kiwi-welcome-europnet-picto"><i class="fa fa-user"></i></span>
                        <input type="text" class="kiwi-welcome-europnet-nick" :placeholder="$t('nick')" v-model="nick" />
                    </div>
                    <label v-if="showPass" class="kiwi-welcome-europnet-have-password">
                        <input type="checkbox" v-model="show_password_box" /> {{$t('password_have')}}
                    </label>
                    <input v-if="show_password_box" class="kiwi-welcome-europnet-password input-text--reveal-value" :label="$t('password')" v-model="password" type="password" />
                    <div class="kiwi-welcome-europnet-group age">
                        <span class="kiwi-welcome-europnet-picto"><i class="fa fa-info-circle"></i></span>
                        <input type="number" class="kiwi-welcome-europnet-age" min="13" max="99" :placeholder="$t('agl_age')" v-model="age" /><div class="age-text">&nbsp;&nbsp;{{$t('agl_age_years_old')}}</div>
                    </div>
                    <div class="kiwi-welcome-europnet-group gender">
                        <span class="kiwi-welcome-europnet-picto"><i class="fa fa-female"></i><i class="fa fa-male"></i></span>
                        <div class="kiwi-welcome-europnet-group-genders">
                            <input type="radio" id="gender_m" value="M" v-model="gender">
                            <label class="gender_m" for="gender_m">{{$t('agl_gender_male')}}</label>
                            <input type="radio" id="gender_f" value="F" v-model="gender">
                            <label class="gender_f" for="gender_f">{{$t('agl_gender_female')}}</label>
                            <input type="radio" id="gender_u" value="U" v-model="gender">
                            <label class="gender_u" for="gender_u">{{$t('agl_gender_other')}}</label>
                        </div>
                    </div>
                    <div class="kiwi-welcome-europnet-group location">
                        <span class="kiwi-welcome-europnet-picto"><i class="fa fa-map-marker"></i></span>
                        <input type="text" class="kiwi-welcome-europnet-location" :placeholder="$t('agl_location')" v-model="location" />
                    </div>
                    <div class="kiwi-welcome-europnet-group channel">
                        <span class="kiwi-welcome-europnet-picto"><i class="fa fa-slack"></i></span>
                        <input type="text" v-if="showChannel" class="kiwi-welcome-europnet-channel" v-model="channel" />
                    </div>
                    <button
                        class="u-button u-button-primary u-submit kiwi-welcome-europnet-start"
                        type="submit"
                        v-html="buttonText"
                        :disabled="!readyToStart"
                    ></button>
                </form>
            </template>
            <template v-else-if="network.state !== 'connected'">
                <i class="fa fa-spin fa-spinner" aria-hidden="true"></i>
            </template>
        </div>
        <p class='help'></p>
        <div class="kiwi-welcome-europnet-section kiwi-welcome-europnet-section-info" :style="backgroundStyle">
            <div class="kiwi-welcome-europnet-section-info-content" v-if="infoContent" v-html="infoContent"></div>
        </div>
    </div>
</template>

<script>

import _ from 'lodash';
import * as Misc from '@/helpers/Misc';
import state from '@/libs/state';

const ctor = {
    data: function data() {
        return {
            network: null,
            channel: '',
            nick: '',
            password: '',
            age: '',
            gender: 'U',
            location: '',
            showChannel: true,
            showPass: true,
            showNick: true,
            show_password_box: false,
            closing: false,
        };
    },
    computed: {
        greetingText: function greetingText() {
            let greeting = state.settings.startupOptions.greetingText;
            return typeof greeting === 'string' ?
                greeting :
                this.$t('start_greeting');
        },
        buttonText: function buttonText() {
            let greeting = state.settings.startupOptions.buttonText;
            return typeof greeting === 'string' ?
                greeting :
                this.$t('start_button');
        },
        readyToStart: function readyToStart() {
            let ready = this.channel && this.nick;
            // Nicks cannot start with [0-9- ]
            // ? is not a valid nick character but we allow it as it gets replaced
            // with a number.
            if (!this.nick.match(/^[a-z_\\[\]{}^`|][a-z0-9_\-\\[\]{}^`|]*$/i)) {
                ready = false;
            }

            return ready;
        },
        backgroundStyle() {
            let style = {};
            let options = state.settings.startupOptions;

            if (options.infoBackground) {
                style['background-image'] = `url(${options.infoBackground})`;
            }
            return style;
        },
        backgroundImage() {
            return state.settings.startupOptions.infoBackground || '';
        },
        infoContent: function infoContent() {
            return state.settings.startupOptions.infoContent || '';
        },
    },
    methods: {
        readableStateError(err) {
            return Misc.networkErrorMessage(err);
        },
        close: function close() {
            this.closing = true;
            this.$el.addEventListener('transitionend', (event) => {
                state.persistence.watchStateForChanges();
                this.$emit('start');
            }, false);
        },
        formSubmit: function formSubmit() {
            if (this.readyToStart) {
                this.startUp();
            }
        },
        startUp: function startUp() {
            let options = state.settings.startupOptions;

            let net;
            if (!this.network) {
                let netAddress = _.trim(options.server);

                // Check if we have this network already
                net = state.getNetworkFromAddress(netAddress);

                // If the network doesn't already exist, add a new one
                net = net || state.addNetwork('Network', this.nick, {
                    server: netAddress,
                    port: options.port,
                    tls: options.tls,
                    password: this.password,
                    encoding: _.trim(options.encoding),
                    direct: !!options.direct,
                    path: options.direct_path || '',
                    gecos: options.gecos,
                });

                this.network = net;
            } else {
                net = this.network;
            }

            // Only switch to the first channel we join if multiple are being joined
            let hasSwitchedActiveBuffer = false;
            let bufferObjs = Misc.extractBuffers(this.channel);
            bufferObjs.forEach(bufferObj => {
                let newBuffer = state.addBuffer(net.id, bufferObj.name);
                newBuffer.enabled = true;

                if (newBuffer && !hasSwitchedActiveBuffer) {
                    state.setActiveBuffer(net.id, newBuffer.name);
                    hasSwitchedActiveBuffer = true;
                }

                if (bufferObj.key) {
                    newBuffer.key = bufferObj.key;
                }
            });

            net.ircClient.connect();
            let onRegistered = () => {
                this.close();
                net.ircClient.off('registered', onRegistered);
                net.ircClient.off('close', onClosed);
            };
            let onClosed = () => {
                net.ircClient.off('registered', onRegistered);
                net.ircClient.off('close', onClosed);
            };
            net.ircClient.once('registered', onRegistered);
            net.ircClient.once('close', onClosed);
        },
        processNickRandomNumber: function processNickRandomNumber(nick) {
            // Replace ? with a random number
            let tmp = (nick || '').replace(/\?/g, () => Math.floor(Math.random() * 100).toString());
            return _.trim(tmp);
        },
    },
    created: function created() {
        let options = state.settings.startupOptions;

        this.nick = this.processNickRandomNumber(Misc.queryStringVal('nick') || options.nick || '');
        this.password = options.password || '';
        this.channel = window.location.hash || options.channel || '';
        this.showChannel = typeof options.showChannel === 'boolean' ?
            options.showChannel :
            true;
        this.showNick = typeof options.showNick === 'boolean' ?
            options.showNick :
            true;
        this.showPass = typeof options.showPassword === 'boolean' ?
            options.showPassword :
            true;

        if (options.autoConnect && this.nick && this.channel) {
            this.startUp();
        }
    },
};
export default ctor;
state.getStartups().europnetstartup = ctor;
</script>

<style>
.kiwi-welcome-europnet {
    height: 100%;
    text-align: center;
    background-size: 0;
    background-position: bottom;
}

.kiwi-welcome-europnet h2 {
    font-size: 1.7em;
    text-align: center;
    padding: 0;
    margin: 0.5em 0 1em 0;
}

.kiwi-welcome-europnet-section {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 50%;
    padding: 1em;
    box-sizing: border-box;
    transition: right 0.3s, left 0.3s;
    overflow-y: auto;
}

.kiwi-welcome-europnet-section-connection {
    width: 50%;
    position: relative;
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.kiwi-welcome-europnet-form {
    width: 300px;
    background-color: #fff;
    border-radius: 0.5em;
    padding: 1em;
    border: 1px solid #ececec;
}

/** Right side */
.kiwi-welcome-europnet-section-info {
    right: 0;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100%;
    background-size: cover;
    background-position: bottom;
    border-left: 5px solid #86b32d;
}

.kiwi-welcome-europnet-section-info-content {
    background: rgba(255, 255, 255, 0.74);
    margin: 2em;
    color: #1b1b1b;
    font-size: 1.5em;
    padding: 2em;
    line-height: 1.6em;
}

/** Left side */
.kiwi-welcome-europnet-error {
    text-align: center;
    margin: 1em 0;
    padding: 0.3em;
}

.kiwi-welcome-europnet-error span {
    display: block;
    font-style: italic;
}

.kiwi-welcome-europnet-section-connection label {
    text-align: left;
    display: inline-block;
}

.kiwi-welcome-europnet-group input[type="text"],
.kiwi-welcome-europnet-group input[type="number"],
.kiwi-welcome-europnet-group-genders {
    width: 80%;
    height: 24px;
    font-size: 1em;
    padding: 0.21em 1em;
    padding-left: 0.5em;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    color: #555;
}

span.kiwi-welcome-europnet-picto,
.kiwi-welcome-europnet-group input[type="text"],
.kiwi-welcome-europnet-group input[type="number"],
.kiwi-welcome-europnet-group-genders {
    border: 1px solid #ccc;
    border-radius: 4px;
}

.kiwi-welcome-europnet .kiwi-welcome-europnet-have-password input[type="text"],
.kiwi-welcome-europnet-have-password {
    font-size: 0.8em;
    margin: 0.8em 0;
}

.kiwi-welcome-europnet-have-password {
    margin-top: 0;
}

.kiwi-welcome-europnet-group {
    display: flex;
    width: 100%;
    height: 2em;
    line-height: 1;
    margin: 0 0 8px 0;
}

.kiwi-welcome-europnet-nick {
    font-weight: bold;
}

.kiwi-welcome-europnet-group-genders {
    display: inline-block;
    font-size: 1em;
    width: 250px;
    padding: 0;
    padding-left: 0.5em;
    padding-top: 6px;
}

.kiwi-welcome-europnet-group input {
    -webkit-transition: border-color ease-in-out 0.15s, -webkit-box-shadow ease-in-out 0.15s;
    -o-transition: border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s;
    transition: border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s;
}

.kiwi-welcome-europnet-form input {
    padding: 0.5em;
}

.kiwi-welcome-europnet-group input:focus {
    border-color: #66afe9;
    outline: 0;
    -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 8px rgba(102, 175, 233, 0.6);
    box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 8px rgba(102, 175, 233, 0.6);
}

span.kiwi-welcome-europnet-picto {
    display: inline-block;
    width: 40px;
    height: 25px;
    font-size: 1.2em;
    padding-top: 5px;
    color: #555;
    text-align: center;
    background-color: #eee;
    border-right: none;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}

.kiwi-welcome-europnet-group input[type="number"].kiwi-welcome-europnet-age {
    width: 3em;
}

.kiwi-welcome-europnet-group .age-text {
    margin: 8px 0;
}

.kiwi-welcome-europnet-group-genders label {
    margin: 0;
}

.kiwi-welcome-europnet-group-genders .gender_m {
    color: #208bfc;
    font-weight: bold;
}

.kiwi-welcome-europnet-group-genders .gender_f {
    color: #f0f;
    font-weight: bold;
}

.kiwi-welcome-europnet-group-genders .gender_u {
    color: #999;
    font-weight: bold;
}

.kiwi-welcome-europnet-group i.fa-slack {
    -ms-transform: rotate(19deg);
    -webkit-transform: rotate(19deg);
    transform: rotate(19deg);
}

.kiwi-welcome-europnet-start {
    font-size: 1.1em;
    cursor: pointer;
}

.kiwi-welcome-europnet-start[disabled] {
    cursor: not-allowed;
}

.kiwi-welcome-europnet-form .u-submit {
    width: 100%;
    line-height: 50px;
    padding: 0;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 400;
    text-shadow: none;
    margin: 0;
    transition: all 0.2s;
    border: none;
    background-color: #86b32d;
}

/** Closing - the wiping away of the screen **/
.kiwi-welcome-europnet--closing .kiwi-welcome-europnet-section-connection {
    left: -50%;
}

.kiwi-welcome-europnet--closing .kiwi-welcome-europnet-section-info {
    right: -50%;
}

.kiwi-welcome-europnet .help {
    position: absolute;
    bottom: 0.2em;
    font-size: 0.8em;
    color: #666;
    width: 50%;
    text-align: center;
}

.kiwi-welcome-europnet .help a {
    text-decoration: underline;
    color: #666;
}

.kiwi-welcome-europnet .help a:hover {
    color: #a9d87a;
}

/* Styling the preloader */
.kiwi-welcome-europnet .fa-spinner {
    position: absolute;
    top: 50%;
    z-index: 999;
    font-size: 100px;
    margin-top: -0.5em;
    left: 50%;
    margin-left: -40px;
}

/** Smaller screen... **/
@media screen and (max-width: 850px) {
    .kiwi-welcome-europnet {
        font-size: 0.9em;
        position: relative;
        min-height: 100%;
    }

    .kiwi-welcome-europnet-section-connection {
        width: 100%;
        min-height: 400px;
    }

    .kiwi-welcome-europnet-section-info-content {
        margin: 1em;
    }

    .kiwi-welcome-europnet-form {
        left: auto;
        margin: 20px auto 20px auto;
        z-index: 100;
        position: relative;
        top: auto;
        align-self: flex-start;
    }

    .kiwi-welcome-europnet p.help {
        position: absolute;
        bottom: 20px;
        width: 100%;
        color: #fff;
        z-index: 100;
    }

    .kiwi-welcome-europnet p.help a {
        color: #fff;
    }

    .kiwi-welcome-europnet-section-info {
        position: static;
        width: 100%;
        border: none;
        min-height: 0;
    }

    .fa-spinner {
        position: absolute;
        left: 48%;
        top: 50%;
        margin-top: -50px;
        color: #fff;
    }

    .kiwi-welcome-europnet-section-connection {
        min-height: 400px;
    }

    .kiwi-welcome-europnet-section .kiwi-welcome-europnet-section-connection {
        position: static;
    }
}

/** Even smaller screen.. probably phones **/
@media screen and (max-width: 750px) {
    .kiwi-welcome-europnet {
        font-size: 0.9em;
        overflow-y: auto;
    }

    .kiwi-welcome-europnet-section-info-content {
        margin: 0.5em;
    }

    /** Closing - the wiping away of the screen **/
    .kiwi-welcome-europnet--closing .kiwi-welcome-europnet-section-connection {
        left: -100%;
    }

    .kiwi-welcome-europnet--closing .kiwi-welcome-europnet-section-info {
        left: -100%;
    }
}

@media screen and (max-width: 400px) {
    .kiwi-welcome-europnet-form {
        width: 90%;
    }
}

/** Background /border switching between screen sizes **/
.kiwi-welcome-europnet--no-bg .kiwi-welcome-europnet-section-info {
    background-color: rgb(51, 51, 51);
}

@media screen and (max-width: 850px) {
    /* Apply some flex so that the info panel fills the rest of the bottom screen */
    .kiwi-welcome-europnet {
        background-size: cover;
        display: flex;
        flex-direction: column;
    }

    .kiwi-welcome-europnet-section {
        overflow-y: visible;
    }

    .kiwi-welcome-europnet-section-info {
        background-size: 0;
        border-left: none;
        flex: 1 0;
        display: block;
    }

    .kiwi-welcome-europnet--no-bg .kiwi-welcome-europnet-section-info {
        border-top: 5px solid #86b32d;
    }
}
</style>
