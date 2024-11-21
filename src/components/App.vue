<template>
    <div
        :class="{
            'kiwi-wrap--statebrowser-drawopen': stateBrowserDrawOpen,
            'kiwi-wrap--monospace': $state.setting('useMonospace'),
            'kiwi-wrap--touch': $state.ui.is_touch,
            'kiwi-wrap--compact': $state.ui.is_narrow,
            'kiwi-wrap--show-statebrowser': $state.ui.show_statebrowser,
        }"
        :data-theme="currentThemeName"
        :data-activebuffer="buffer ? buffer.name.toLowerCase() : ''"
        class="kiwi-wrap kiwi-theme-bg"
        @click="emitDocumentClick"
        @paste.capture="emitBufferPaste"
    >
        <template v-if="!hasStarted || (!fallbackComponent && networks.length === 0)">
            <component :is="startupComponent" @start="startUp" />
        </template>
        <template v-else>
            <state-browser :networks="networks" />
            <div
                :class="{
                    'kiwi-workspace--disconnected': network && network.state !== 'connected',
                }"
                class="kiwi-workspace"
            >
                <div class="kiwi-workspace-background" />

                <template v-if="!activeComponent && network">
                    <container
                        :network="network"
                        :buffer="buffer"
                        :sidebar-state="sidebarState"
                    >
                        <template v-if="mediaviewerOpen" #before>
                            <media-viewer
                                :url="mediaviewerUrl"
                                :component="mediaviewerComponent"
                                :component-props="mediaviewerComponentProps"
                                :is-iframe="mediaviewerIframe"
                                class="kiwi-main-mediaviewer"
                                @close="$state.$emit('mediaviewer.hide', { source: 'user' });"
                            />
                        </template>
                    </container>
                    <control-input
                        v-if="buffer.show_input"
                        :network="network"
                        :buffer="buffer"
                        :sidebar-state="sidebarState"
                    />
                </template>
                <component
                    :is="fallbackComponent"
                    v-else-if="!activeComponent"
                    v-bind="fallbackComponentProps"
                />
                <component :is="activeComponent" v-else v-bind="activeComponentProps" />
            </div>
        </template>
        <AvatarCommon />
    </div>
</template>

<script>
'kiwi public';

import { markRaw, watch } from 'vue';

import '@/res/globalStyle.css';
import '@/res/styles/global.scss';
import Tinycon from 'tinycon';

import StateBrowser from '@/components/StateBrowser';
import AppSettings from '@/components/AppSettings';
import Container from '@/components/Container';
import ControlInput from '@/components/ControlInput';
import MediaViewer from '@/components/MediaViewer';
import AvatarCommon from '@/components/UserAvatarCommon';
import ThemeManager from '@/libs/ThemeManager';
import * as Notifications from '@/libs/Notifications';
import * as bufferTools from '@/libs/bufferTools';
import useSidebarState from '@/libs/SidebarState';
import Logger from '@/libs/Logger';

let log = Logger.namespace('App.vue');

export default {
    components: {
        StateBrowser,
        Container,
        ControlInput,
        MediaViewer,
        AvatarCommon,
    },
    provide() {
        return {
            SidebarState: this.sidebarState,
        };
    },
    props: ['startupComponent'],
    data() {
        return {
            hasStarted: false,
            // When on mobile screens, the statebrowser turns into a drawer
            stateBrowserDrawOpen: false,
            // If set, will become the main view instead of a buffer/nicklist container
            activeComponent: null,
            activeComponentProps: {},
            // If set, will become the main view when no networks are available to be shown
            // and there is no active component set
            fallbackComponent: null,
            fallbackComponentProps: {},
            mediaviewerOpen: false,
            mediaviewerUrl: '',
            mediaviewerComponent: null,
            mediaviewerComponentProps: {},
            mediaviewerIframe: false,
            sidebarState: useSidebarState(),
        };
    },
    computed: {
        networks() {
            return this.$state.networks;
        },
        network() {
            return this.$state.getActiveNetwork();
        },
        buffer() {
            return this.$state.getActiveBuffer();
        },
        currentThemeName() {
            const theme = ThemeManager.instance().currentTheme();
            return theme ? theme.name.toLowerCase() : '';
        },
        fontSize() {
            return this.$state.setting('fontSize');
        },
        animationDuration() {
            return this.$state.setting('animationDuration');
        },
    },
    created() {
        this.listenForActiveComponents();
        this.watchForThemes();
        this.initStateBrowser();
        this.initMediaviewer();
        this.configureFavicon();

        this.listen(document, 'visibilitychange', this.onVisibilityChange);
        this.listen(document, 'keydown', (event) => this.onKeyDown(event));
        this.listen(window, 'focus', (event) => this.onFocus(event));
        this.listen(window, 'blur', (event) => this.onBlur(event));
        this.listen(window, 'touchstart', (event) => this.onTouchStart(event));

        this.listen(document, 'mousedown', () => (this.$state.ui.interacting = true));
        this.listen(document, 'mouseup', () => (this.$state.ui.interacting = false));
        this.listen(document, 'touchstart', () => (this.$state.ui.interacting = true));
        this.listen(document, 'touchend', () => (this.$state.ui.interacting = false));
    },
    mounted() {
        this.trackWindowDimensions();
        if (this.$state.ui.is_narrow) {
            this.$state.ui.show_statebrowser = false;
        }
    },
    methods: {
        // Triggered by a startup screen event
        startUp(opts) {
            log('startUp()');
            if (opts && opts.fallbackComponent) {
                this.fallbackComponent = opts.fallbackComponent;
            }
            if (opts && opts.fallbackComponentProps) {
                this.fallbackComponentProps = opts.fallbackComponentProps;
            }

            // Make sure a startup screen can't trigger these more than once
            if (!this.hasStarted) {
                this.warnOnPageClose();

                // Wait for a click or sending a message before asking for notification permission.
                // Not doing this on an input event will get it blocked by some browsers.
                let requestNotificationPermission = () => {
                    this.$state.$off('document.clicked', requestNotificationPermission);
                    this.$state.$off('input.raw', requestNotificationPermission);

                    Notifications.requestPermission(this.$state);
                    Notifications.listenForNewMessages(this.$state);
                };

                this.$state.$once('document.clicked', requestNotificationPermission);
                this.$state.$once('input.raw', requestNotificationPermission);
            }

            this.hasStarted = true;
        },
        listenForActiveComponents() {
            this.listen(this.$state, 'active.component', (component, props) => {
                this.activeComponent = null;
                if (component) {
                    this.activeComponentProps = props;
                    this.activeComponent = markRaw(component);
                }
            });
            this.listen(this.$state, 'active.component.toggle', (component, props) => {
                if (component === this.activeComponent) {
                    this.activeComponent = null;
                } else if (component) {
                    this.activeComponentProps = props;
                    this.activeComponent = markRaw(component);
                }
            });
        },
        watchForThemes() {
            this.listen(this.$state, 'theme.change', () => {
                this.$state.clearNickColours();
            });
        },
        initStateBrowser() {
            this.listen(this.$state, 'statebrowser.toggle', () => {
                this.stateBrowserDrawOpen = !this.stateBrowserDrawOpen;
            });
            this.listen(this.$state, 'statebrowser.show', () => {
                this.stateBrowserDrawOpen = true;
            });
            this.listen(this.$state, 'statebrowser.hide', () => {
                this.stateBrowserDrawOpen = false;
            });
        },
        initMediaviewer() {
            this.listen(this.$state, 'mediaviewer.show', (url) => {
                let opts = {};

                // The passed url may be a string or an options object
                if (typeof url === 'string') {
                    opts = { url: url };
                } else {
                    opts = url;
                }

                this.mediaviewerUrl = opts.url;
                this.mediaviewerComponent = opts.component ? markRaw(opts.component) : opts.component;
                this.mediaviewerComponentProps = opts.componentProps;
                this.mediaviewerIframe = opts.iframe;
                this.mediaviewerOpen = true;
            });

            this.listen(this.$state, 'mediaviewer.hide', () => {
                this.mediaviewerOpen = false;
            });
        },
        configureFavicon() {
            // favicon bubble
            Tinycon.setOptions({
                width: 7,
                height: 9,
                color: '#ffffff',
                background: '#b32d2d',
                fallback: true,
            });

            watch(
                () => this.$state.ui.favicon_counter,
                (newVal) => {
                    if (newVal) {
                        Tinycon.setBubble(newVal);
                    } else {
                        Tinycon.reset();
                    }
                }
            );

            this.listen(this.$state, 'message.new', (event) => {
                let message = event.message;
                if (!message.isHighlight || message.ignore || this.$state.ui.app_has_focus) {
                    return;
                }

                this.$state.ui.favicon_counter++;
            });
        },
        trackWindowDimensions() {
            // Track the window dimensions into the reactive ui state
            let trackWindowDims = () => {
                this.$state.ui.app_width = this.$el.clientWidth;
                this.$state.ui.app_height = this.$el.clientHeight;
                this.$state.ui.is_narrow = this.$el.clientWidth <= 769;
            };
            this.listen(window, 'resize', trackWindowDims);
            trackWindowDims();
        },
        warnOnPageClose() {
            window.onbeforeunload = (event) => {
                if (this.$state.ui.warn_on_exit && this.$state.setting('warnOnExit')) {
                    event.preventDefault();
                    event.returnValue = this.$t('window_unload');
                    return event.returnValue;
                }
                return undefined;
            };
            window.onunload = () => {
                this.$state.networks.forEach((net) => {
                    if (net.connection.direct && net.state === 'connected') {
                        net.ircClient.raw('QUIT', this.$state.setting('quitMessage') || 'Client Closed Connection');
                    }
                });
            };
        },
        emitBufferPaste(event) {
            // bail if no buffer is active, or the buffer is hidden by another component
            if (!this.$state.getActiveBuffer() || this.activeComponent !== null) {
                return;
            }

            // bail if the target is an input-like element
            if (
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLSelectElement ||
                event.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            this.$state.$emit('buffer.paste', event);
        },
        emitDocumentClick(event) {
            this.$state.$emit('document.clicked', event);
        },
        onTouchStart(event) {
            // Parts of the UI adjust themselves if we're known to be using a touchscreen
            this.$state.ui.is_touch = true;
        },
        onBlur(event) {
            this.$state.ui.app_has_focus = false;
        },
        onFocus(event) {
            this.$state.ui.app_has_focus = true;
            this.$state.ui.favicon_counter = 0;
        },
        onVisibilityChange(event) {
            const newState = (document.visibilityState === 'visible');

            const buffer = this.$state.getActiveBuffer();
            if (buffer) {
                buffer.isVisible = newState;
            }

            this.$state.ui.app_is_visible = newState;
        },
        onKeyDown(event) {
            this.$state.$emit('document.keydown', event);

            let meta = false;

            if (navigator.appVersion.indexOf('Mac') !== -1) {
                meta = event.metaKey;
            } else {
                // none english languages use ctrl + alt to access extended chars
                // make sure we do not interfere with that by only acting on ctrl
                meta = event.ctrlKey && !event.altKey;
            }

            if (meta && event.key === ']') {
                // meta + ]
                let buffer = bufferTools.getNextBuffer();
                if (buffer) {
                    this.$state.setActiveBuffer(buffer.networkid, buffer.name);
                }
                event.preventDefault();
            } else if (meta && event.key === '[') {
                // meta + [
                let buffer = bufferTools.getPreviousBuffer();
                if (buffer) {
                    this.$state.setActiveBuffer(buffer.networkid, buffer.name);
                }
                event.preventDefault();
            } else if (meta && event.key === 'o') {
                // meta + o
                this.$state.$emit('active.component.toggle', AppSettings);
                event.preventDefault();
            } else if (meta && event.key === 's') {
                // meta + s
                let network = this.$state.getActiveNetwork();
                if (network) {
                    network.showServerBuffer('settings');
                }
                event.preventDefault();
            }
        },
    },
};
</script>

<style lang="scss">
@use '/src/res/styles/uiFunctions' as ui;

.kiwi-wrap {
    --transition-time: v-bind(animationDuration);
    --statebrowser-width: 220px;
    --font-size-85: 0.85em;
    --font-size-110: 1.1em;

    font-size: v-bind(fontSize);
    line-height: 1.6em;
    font-family: 'Source Sans Pro', Helvetica, sans-serif;
    -webkit-font-smoothing: antialiased;
    height: 100%;
    overflow: hidden;
    display: flex;
}

@supports (font-size: round(nearest, 90%, 1px)) and (line-height: round(nearest, 1.6em, 1px)) {
    .kiwi-wrap {
        --font-size-85: round(nearest, 0.85em, 1px);
        --font-size-110: round(nearest, 1.1em, 1px);

        font-size: round(nearest, v-bind(fontSize), 1px);
        line-height: round(nearest, 1.6em, 1px);
    }
}

@supports (font-size: round(nearest, 90%, 1px)) and (line-height: round(nearest, 1.6em, 1px)) {
    .kiwi-wrap {
        font-size:  #{'round(nearest, 90%, 1px)'};
        line-height:  #{'round(nearest, 1.6em, 1px)'};
    }
}

/* .kiwi-workspace has ::before and ::after 4px above itself for the connection status */
.kiwi-workspace {
    position: relative;
    flex: 1 1;
    top: 4px;
    display: flex;
    width: 100%;
    flex-direction: column;
    height: calc(100% - 4px); // 4px is the top movement
    transition: left 0.2s, margin-left 0.2s;
}

.kiwi-workspace::before,
.kiwi-workspace::after {
    position: absolute;
    content: '';
    left: 0;
    right: auto;
    margin-top: -4px;
    width: 100%;
    height: 4px;
    z-index: 0;
    transition: width 0.3s;
}

.kiwi-workspace::after {
    right: 0;
    left: auto;
    width: 0;
}

.kiwi-workspace--disconnected::before {
    width: 0;
}

.kiwi-workspace--disconnected::after {
    width: 100%;
}

.kiwi-workspace-background {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    z-index: -1;
}

.kiwi-container {
    flex-grow: 1;

    /* The nicklist scroller needs some type of height set on it's parent, but since we use flexbox
       it starts conflicting on firefox. Luckily flexbox ignores this 5% and resizes it as we intend
       anyway. */
    height: 5%;
}

.kiwi-main-mediaviewer {
    max-height: 70vw;
    overflow: auto;
    border-bottom: 1px solid rgb(0, 0, 0, 0.3);
}

.kiwi-wrap--compact {
    --statebrowser-width: max(220px, min(70%, 280px));

    .kiwi-workspace {
        left: 0;
        margin-left: 0;
        transition: ui.transition(left);
    }

    &.kiwi-wrap--show-statebrowser .kiwi-workspace {
        left: var(--statebrowser-width);
    }
}
</style>
