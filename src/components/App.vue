<template>
    <div
        :class="{
            'kiwi-wrap--statebrowser-drawopen': stateBrowserDrawOpen,
            'kiwi-wrap--monospace': $state.setting('useMonospace'),
            'kiwi-wrap--touch': $state.ui.is_touch,
        }"
        :data-activebuffer="buffer ? buffer.name.toLowerCase() : ''"
        class="kiwi-wrap kiwi-theme-bg"
        @click="emitDocumentClick"
        @paste.capture="emitBufferPaste"
    >
        <template v-if="!hasStarted || (!fallbackComponent && networks.length === 0)">
            <component :is="startupComponent" @start="startUp" />
        </template>
        <template v-else>
            <state-browser :networks="networks" :sidebar-state="sidebarState" />
            <div
                :class="{
                    'kiwi-workspace--disconnected': network && network.state !== 'connected'
                }"
                class="kiwi-workspace"
                @click="hideStateBrowser()"
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
                        <template #after>
                            <div class="kiwi-messagelist-controls">
                                <div ref="scrollToBottom" class="control scroll-to-bottom" @click="scrollToBottom">
                                    <svg-icon icon="fa-solid fa-arrow-down" class="icon" />
                                    Jump to Bottom
                                </div>
                            </div>
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

import { markRaw, toRef, watch } from 'vue';

import '@/res/globalStyle.css';
import Tinycon from 'tinycon';

import StateBrowser from '@/components/StateBrowser';
import AppSettings from '@/components/AppSettings';
import Container from '@/components/Container';
import ControlInput from '@/components/ControlInput';
import MediaViewer from '@/components/MediaViewer';
import AvatarCommon from '@/components/UserAvatarCommon';
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
    },
    mounted() {
        this.trackWindowDimensions();
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
                if (component) {
                    this.activeComponent = null;
                    this.$state.history.push({
                        enter: () => {
                            this.activeComponent = component;
                            this.activeComponentProps = props;
                        },
                        leave: () => {
                            this.activeComponent = null;
                        },
                        query: {
                            view: '',
                        },
                    });
                } else if (this.activeComponent && this.$state.history.currentPage) {
                    // this.state.history.currentPage &&
                    this.$state.history.go(-1);
                } else {
                    this.activeComponent = null;
                }
                this.$state.activeComponent = this.activeComponent;
            });
            this.listen(this.$state, 'active.component.toggle', (component, props) => {
                if (component === this.activeComponent) {
                    this.$state.history.go(-1);
                } else if (component) {
                    this.$state.history.push({
                        enter: () => {
                            this.activeComponent = component;
                            this.activeComponentProps = props;
                        },
                        leave: () => {
                            this.activeComponent = null;
                        },
                        query: {
                            view: '',
                        },
                    });
                }
                this.$state.activeComponent = this.activeComponent;
            });
        },
        watchForThemes() {
            this.listen(this.$state, 'theme.change', () => {
                this.$state.clearNickColours();
            });
        },
        hideStateBrowser() {
            if (!this.stateBrowserDrawOpen) return;
            if (this.$state.ui.is_touch) {
                this.$state.history.go(-1);
            } else {
                this.stateBrowserDrawOpen = false;
            }
            this.$state.stateBrowserDrawOpen = this.stateBrowserDrawOpen;
        },
        showStateBrowser() {
            if (this.stateBrowserDrawOpen) return;
            if (this.$state.ui.is_touch) {
                this.$state.history.push({
                    enter: () => { this.stateBrowserDrawOpen = true; },
                    leave: () => { this.stateBrowserDrawOpen = false; },
                    query: {
                        statebrowser: 'open',
                    },
                });
            } else {
                this.stateBrowserDrawOpen = true;
            }
            this.$state.stateBrowserDrawOpen = this.stateBrowserDrawOpen;
        },
        initStateBrowser() {
            this.listen(this.$state, 'statebrowser.toggle', () => {
                const setting = !this.stateBrowserDrawOpen;
                setting ? this.showStateBrowser() : this.hideStateBrowser();
            });
            this.listen(this.$state, 'statebrowser.show', () => {
                this.showStateBrowser();
            });
            this.listen(this.$state, 'statebrowser.hide', () => {
                this.hideStateBrowser();
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
                this.mediaviewerComponent = opts.component
                    ? markRaw(opts.component)
                    : opts.component;
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

            watch(toRef(this.$state, 'ui.favicon_counter'), (newVal) => {
                if (newVal) {
                    Tinycon.setBubble(newVal);
                } else {
                    Tinycon.reset();
                }
            });

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
            window.onbeforeunload = () => {
                if (this.$state.setting('warnOnExit')) {
                    return this.$t('window_unload');
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
        scrollToBottom() {
            if (this.$state?.ml?.scrollToBottom instanceof Function) {
                this.$state.$emit('messagelist.scrollto-bottom');
                setTimeout(() => {
                    if (this.$refs.scrollToBottom) {
                        this.$refs.scrollToBottom.classList.remove('active');
                    }
                }, 50);
            }
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

<style lang="less">
html, body, #kiwiirc {
    height: 100%;
    margin: 0;
    padding: 0;
}

.kiwi-wrap {
    font-size: 90%;
    line-height: 1.6em;
    font-family: 'Source Sans Pro', Helvetica, sans-serif;
    -webkit-font-smoothing: antialiased;
    height: 100%;
    overflow: hidden;
}

/* .kiwi-workspace has ::before and ::after 4px above itself for the connection status */
.kiwi-workspace {
    position: relative;
    margin-left: 220px;
    left: 0;
    top: 4px;
    display: flex;
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

.kiwi-statebrowser {
    position: absolute;
    top: 0;
    left: 0;
    width: 220px;
    bottom: 0;
    z-index: 11; /* Must be at least 1 higher than the workspace :after z-index; */
    transition: left 0.145s, margin-left 0.145s;
}

.kiwi-container {
    flex-grow: 1;

    /* The nicklist scroller needs some type of height set on it's parent, but since we use flexbox
       it starts conflicting on firefox. Luckily flexbox ignores this 5% and resizes it as we intend
       anyway. */
    height: 5%;
}
.kiwi-container-content {
    position: relative;
}
.kiwi-messagelist-controls {
    pointer-events: none;
    width: 100%;
    position: absolute;
    top: 90%;
    z-index: 1;
    display: flex;
    justify-content: center;
}

.kiwi-messagelist-controls .control {
    pointer-events: all;
    background: var(--brand-primary);
    color: white;
    padding: 4px;
    border-radius: 16px;
    padding-left: 16px;
    padding-right: 16px;
    border: 1px solid var(--brand-default-fg);
}
.kiwi-messagelist-controls .control.scroll-to-bottom .icon {
    margin-right: 8px;
}
.kiwi-messagelist-controls .control.scroll-to-bottom {
    opacity: 0;
    margin-top: 64px;
    transition: all ease-in-out 0.3s;
}
.kiwi-messagelist-controls .control.scroll-to-bottom.active {
    opacity: 1;
    margin-top: 0;
    top: 90%;
}
.kiwi-main-mediaviewer {
    max-height: 70%;
    overflow: auto;
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
}

/* Small screen will cause the statebrowser to act as a drawer */
@media screen and (max-width: 769px) {
    .kiwi-workspace {
        left: 0;
        margin-left: 0;
    }

    .kiwi-statebrowser {
        left: -220px;
    }

    .kiwi-wrap--statebrowser-drawopen .kiwi-statebrowser {
        left: 0;
    }

    .kiwi-wrap--statebrowser-drawopen .kiwi-workspace {
        left: 75%;
        transition: left 0.1s;
        transition-delay: 0s;
    }
}
</style>
