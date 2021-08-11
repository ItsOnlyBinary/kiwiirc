<template>
    <div
        :class="{ 'kiwi-statebrowser-network--active': isActiveNetwork }"
        class="kiwi-statebrowser-network"
    >
        <div class="kiwi-statebrowser-network-header">
            <div class="kiwi-statebrowser-network-icon">
                <i class="fa fa-server" aria-hidden="true" />
                <i
                    :class="[collapsed?'fa-caret-right':'fa-caret-down']"
                    class="fa"
                    aria-hidden="true"
                    @click="collapsed=!collapsed"
                />
            </div>

            <a
                class="kiwi-statebrowser-network-name u-link"
                @click="setActiveBuffer(serverBuffer)"
            >{{ network.name }}</a>

            <div
                v-if="serverUnread && showMessageCounts(serverBuffer)"
                class="kiwi-statebrowser-unread"
                :class="{ 'kiwi-statebrowser-unread--highlight': serverHighlight }"
            >{{ serverUnread > 999 ? "999+": serverUnread }}</div>
        </div>

        <div v-if="channel_filter_display" class="kiwi-statebrowser-buffers-filter">
            <input
                v-model="channel_filter"
                v-focus
                :placeholder="$t('filter_channels')"
                type="text"
                @blur="onChannelFilterInputBlur"
                @keyup.esc="closeFilterChannel"
            >
            <span
                class="u-link"
                @click="closeFilterChannel(); showNetworkChannels(network)"
            >{{ $t('find_more_channels') }}</span>
        </div>

        <div v-if="channel_add_display" class="kiwi-statebrowser-buffers-add">
            <form
                class="kiwi-statebrowser-newchannel"
                @submit.prevent="submitNewChannelForm"
            >
                <!-- TODO REVIST -->
                <div
                    v-focus
                    :class="[
                        channel_add_input_has_focus ?
                            'kiwi-statebrowser-newchannel-inputwrap--focus' :
                            ''
                    ]"
                    class="kiwi-statebrowser-newchannel-inputwrap"
                >
                    <input
                        v-model="channel_add_input"
                        :placeholder="$t('state_join')"
                        type="text"
                        @focus="onNewChannelInputFocus"
                        @blur="onNewChannelInputBlur"
                    >
                </div>
            </form>
        </div>

        <div
            :class="{ 'kiwi--collapsed': collapsed }"
            class="kiwi-statebrowser-network-collapsable"
        >
            <transition-expand>
                <div v-if="network.state !== 'connected'" class="kiwi-statebrowser-network-status">
                    <template v-if="network.state_error">
                        <i class="fa fa-exclamation-triangle" aria-hidden="true" />
                        <a class="u-link" @click="showNetworkSettings(network)">
                            {{ $t('state_configure') }}
                        </a>
                    </template>
                    <template v-else-if="!network.connection.server">
                        <a class="u-link" @click="showNetworkSettings(network)">
                            {{ $t('state_configure') }}
                        </a>
                    </template>
                    <template v-else-if="network.state === 'disconnected'">
                        {{ $t('state_disconnected') }}
                        <a class="u-link" @click="network.ircClient.connect()">
                            {{ $t('connect') }}
                        </a>
                    </template>
                    <template v-else-if="network.state === 'connecting'">
                        {{ $t('connecting') }}
                    </template>
                </div>
            </transition-expand>
            <div
                v-for="(itemBuffers, type) in filteredBuffersByType"
                :key="type"
                :data-name="type"
                class="kiwi-statebrowser-buffers"
            >
                <div
                    v-if="!channel_filter_display && showBufferGroups && type !== 'other'"
                    class="kiwi-statebrowser-group"
                >
                    <div class="kiwi-statebrowser-group-header" @click="toggleSection(type)">
                        <i
                            class="fa kiwi-statebrowser-group-toggle"
                            :class="[
                                (show_channels && type === 'channels') ||
                                    (show_queries && type === 'queries') ?
                                        'fa-caret-down' :
                                        'fa-caret-right'
                            ]"
                        />
                        <span
                            class="kiwi-statebrowser-group-name"
                        >{{ type === 'channels' ? $t('channels') : $t('messages') }}</span>
                    </div>

                    <template v-if="type === 'channels'">
                        <div
                            :class="{ active: !!channel_add_display }"
                            class="kiwi-statebrowser-button"
                            @click="toggleAddChannel()"
                        ><i class="fa fa-plus" aria-hidden="true" /></div>
                        <div
                            :class="{ active: !!channel_filter_display }"
                            class="kiwi-statebrowser-button"
                            @click="onSearchChannelClick()"
                        ><i class="fa fa-search" aria-hidden="true" /></div>
                    </template>

                    <template v-else-if="type === 'queries' && itemBuffers.length > 1">
                        <div
                            class="kiwi-statebrowser-button-close kiwi-statebrowser-group-close"
                            @click.stop.prevent="promptClose()"
                        >
                            <i class="fa fa-times" aria-hidden="true" />
                        </div>
                    </template>

                    <div
                        v-if="!show_channels &&
                            type === 'channels' &&
                            channelActivity.unread > 0"
                        class="kiwi-statebrowser-unread"
                        :class="{ 'kiwi-statebrowser-unread--highlight': serverHighlight }"
                    >{{ channelActivity.unread> 999 ? "999+": channelActivity.unread }}</div>
                    <div
                        v-else-if="!show_queries &&
                            type === 'queries' &&
                            queryActivity.unread > 0"
                        class="kiwi-statebrowser-unread"
                        :class="{ 'kiwi-statebrowser-unread--highlight': serverHighlight }"
                    >{{ queryActivity.unread > 999 ? "999+": queryActivity.unread }}</div>
                </div>
                <transition-expand v-if="type === 'queries'">
                    <div v-if="showPromptClose" class="kiwi-statebrowser-buffer-close">
                        <span>{{ $t('prompt_close_queries') }}</span>
                        <input-confirm
                            :flip-connotation="true"
                            class="kiwi-statebrowser-buffer-close-prompt"
                            @ok="closeQueries(itemBuffers)"
                            @submit="promptClose()"
                        />
                    </div>
                </transition-expand>
                <transition-expand>
                    <div
                        v-if="itemBuffers.length && (
                            (show_channels && type === 'channels') ||
                            (show_queries && type === 'queries') ||
                            type === 'other'
                        )"
                        class="kiwi-statebrowser-buffers-container"
                    >
                        <buffer
                            v-for="buffer in itemBuffers"
                            :key="buffer.name"
                            :buffer="buffer"
                            :active-prompt="activePrompt"
                            @selected="setActiveBuffer(buffer)"
                        />
                    </div>
                </transition-expand>
            </div>
        </div>
    </div>
</template>

<script>
'kiwi public';

import _ from 'lodash';
import * as Misc from '@/helpers/Misc';
import * as bufferTools from '@/libs/bufferTools';
import BufferSettings from './BufferSettings';
import StateBrowserBuffer from './StateBrowserBuffer';

export default {
    components: {
        BufferSettings,
        Buffer: StateBrowserBuffer,
    },
    props: ['network', 'sidebarState', 'activePrompt'],
    data: function data() {
        return {
            collapsed: false,
            channel_filter: '',
            channel_filter_display: false,
            channel_add_display: false,
            channel_add_input_has_focus: false,
            channel_add_input: '',
            show_channels: true,
            show_queries: true,
        };
    },
    computed: {
        serverBuffer() {
            return this.network.serverBuffer();
        },
        isActiveNetwork: function isActiveNetwork() {
            return this.$state.getActiveNetwork() === this.network;
        },
        totalNetworkCount() {
            return this.$state.networks.length;
        },
        serverUnread() {
            if (!this.collapsed) {
                return this.serverBuffer.flags.unread;
            }
            let totalUnread = 0;
            this.network.buffers.forEach((buffer) => {
                if (buffer.isSpecial()) {
                    return;
                }
                totalUnread += buffer.flags.unread;
            });
            return totalUnread;
        },
        serverHighlight() {
            if (!this.collapsed) {
                return this.serverBuffer.flags.highlight;
            }
            let highlight = false;
            this.network.buffers.forEach((buffer) => {
                if (buffer.isSpecial()) {
                    return;
                }
                if (buffer.flags.highlight) {
                    highlight = true;
                }
            });
            return highlight;
        },
        filteredBuffers() {
            let filter = this.channel_filter;
            let filtered = [];

            if (!filter) {
                filtered = this.network.buffers;
            } else {
                filtered = _.filter(this.network.buffers, (buffer) => {
                    let name = buffer.name.toLowerCase();
                    return name.indexOf(filter) > -1;
                });
            }

            return bufferTools.orderBuffers(filtered);
        },
        filteredBuffersByType() {
            let types = {
                other: [],
                channels: [],
                queries: [],
            };

            this.filteredBuffers.forEach((bufferObj) => {
                if (bufferObj.isChannel()) {
                    types.channels.push(bufferObj);
                } else if (bufferObj.isQuery()) {
                    types.queries.push(bufferObj);
                } else {
                    // This is buffers like *raw, *bnc, *status etc
                    types.other.push(bufferObj);
                }
            });

            Object.entries(types).forEach(([type, buffers]) => {
                // Always show channels type as it has join controls
                if (type !== 'channels' && !buffers.length) {
                    delete types[type];
                }
            });

            return types;
        },
        channelActivity() {
            return this.activityFromBuffers(this.filteredBuffersByType.channels);
        },
        queryActivity() {
            return this.activityFromBuffers(this.filteredBuffersByType.queries);
        },
        showBufferGroups() {
            return this.$state.setting('buffers.show_buffer_groups');
        },
        showPromptClose() {
            return (this.activePrompt &&
                this.activePrompt.type === 'queries' &&
                this.activePrompt.value === this.network);
        },
    },
    methods: {
        activityFromBuffers(buffers) {
            let totalUnread = 0;
            let highlight = false;
            buffers.forEach((buffer) => {
                if (buffer.isSpecial() || buffer.setting('hide_message_counts')) {
                    return;
                }
                totalUnread += buffer.flags.unread;
                if (!highlight && buffer.flags.highlight) {
                    highlight = true;
                }
            });
            return {
                highlights: highlight,
                unread: totalUnread,
            };
        },
        onNewChannelInputFocus() {
            // Auto insert the # if no value is already in. Easier for mobile users
            if (!this.channel_add_input) {
                this.channel_add_input = '#';
            }

            this.channel_add_input_has_focus = true;
        },
        onNewChannelInputBlur() {
            // Remove the # since we may have auto inserted it as they tabbed past
            if (this.channel_add_input === '#') {
                this.channel_add_input = '';
            }

            // If nothing was entered into the input box, hide it just to clean up the UI
            if (!this.channel_add_input) {
                this.channel_add_display = false;
            }

            this.channel_add_input_has_focus = false;
        },
        submitNewChannelForm() {
            let newChannelVal = this.channel_add_input;
            this.channel_add_input = '#';

            let network = this.network;
            let bufferObjs = Misc.extractBuffers(newChannelVal);

            // Only switch to the first channel we join if multiple are being joined
            let hasSwitchedActiveBuffer = false;
            bufferObjs.forEach((bufferObj) => {
                let chanName = bufferObj.name;
                let ignoreNames = ['#0', '0', '&0'];
                if (ignoreNames.indexOf(chanName) > -1 || chanName.replace(/[#&]/g, '') === '') {
                    return;
                }

                let newBuffer = this.$state.addBuffer(network.id, chanName);
                if (newBuffer && !hasSwitchedActiveBuffer) {
                    this.$state.setActiveBuffer(network.id, newBuffer.name);
                    hasSwitchedActiveBuffer = true;
                }

                if (bufferObj.key) {
                    newBuffer.key = bufferObj.key;
                }

                if (network.isChannelName(chanName)) {
                    network.ircClient.join(chanName, bufferObj.key);
                }
            });
        },
        onChannelFilterInputBlur() {
            // Hacky, but if we remove the channel filter UI at this blur event and the user
            // clicked a link in this filter UI, then the click event will not hit the target
            // link as it has been removed before the event reaches it.
            // this.$nextTick(() => {
            //     this.closeFilterChannel();
            // });
            setTimeout(() => {
                this.closeFilterChannel();
            }, 200);
        },
        showMessageCounts(buffer) {
            return !buffer.setting('hide_message_counts');
        },
        setActiveBuffer(buffer) {
            // Clear any active component to show the buffer again
            this.$state.$emit('active.component', null);
            this.$state.setActiveBuffer(buffer.networkid, buffer.name);
            if (this.$state.ui.is_narrow) {
                this.$state.$emit('statebrowser.hide');
            }
        },
        showNetworkSettings(network) {
            network.showServerBuffer('settings');
        },
        showNetworkChannels(network) {
            network.showServerBuffer('channels');
        },
        onSearchChannelClick() {
            // If we have no other buffers than the server buffer, take them straight
            // to the channel list for searching
            if (this.network.buffers.length > 1) {
                this.toggleFilterChannel();
            } else {
                this.network.showServerBuffer('channels');
            }
        },
        toggleAddChannel() {
            this.channel_add_display = !this.channel_add_display;
            this.channel_filter_display = false;
        },
        toggleFilterChannel() {
            this.channel_filter_display = !this.channel_filter_display;
            this.channel_add_display = false;
        },
        toggleSection(type) {
            if (type === 'channels') {
                this.show_channels = !this.show_channels;
            } else if (type === 'queries') {
                this.show_queries = !this.show_queries;
            }
        },
        promptClose() {
            console.log('promptClose', this.showPromptClose, this.activePrompt);
            const prompt = this.activePrompt;
            if (this.showPromptClose) {
                // Prompt is currently visible so close it
                prompt.type = undefined;
                prompt.value = undefined;
            } else {
                prompt.type = 'queries';
                prompt.value = this.network;
            }
        },
        closeQueries(buffers) {
            buffers.forEach((buffer) => {
                this.$state.removeBuffer(buffer);
            });
        },
        closeFilterChannel() {
            this.channel_filter = '';
            this.channel_filter_display = false;
        },
    },
};
</script>

<style lang="less">
.kiwi-statebrowser-network {
    @header_padding: 10px;

    margin-bottom: 10px;

    .kiwi-statebrowser-network-header {
        background-color: rgba(128, 128, 128, 0.2);
        height: 3em;
        display: flex;
        align-items: center;
        padding: 0 @header_padding;

        .kiwi-statebrowser-network-icon {
            width: 26px;
            position: relative;
            text-align: center;

            > .fa-caret-down,
            > .fa-caret-right {
                display: none;
                position: absolute;
                font-size: 1.6em;
                border-radius: 6px;
                width: 26px;
                top: 0;
                left: 0;
                transition: all 0.2s;

                &:hover {
                    background-color: var(--brand-primary);
                }
            }
        }

        .kiwi-statebrowser-network-name {
            flex-grow: 1;
            font-weight: 600;
            margin-left: 4px;
            color: var(--comp-statebrowser-fg);
        }
    }

    &.kiwi-statebrowser-network--active .kiwi-statebrowser-network-header {
        @active_border: 3px;

        border-left: @active_border solid var(--brand-primary);
        padding-left: @header_padding - @active_border;
    }

    .kiwi-statebrowser-buffers-filter,
    .kiwi-statebrowser-buffers-add {
        border-bottom: 1px solid rgba(128, 128, 128, 0.4);

        input {
            box-sizing: border-box;
            width: 100%;
            outline: none;
            border: none;
            border-radius: 0;
            padding: 0 0.6em;
            line-height: 3em;
            background-color: var(--brand-default-bg);
            color: var(--brand-default-fg);
        }

        > span {
            display: block;
            padding: 0.4em 0;
            font-size: 0.8em;
            text-align: center;
        }
    }

    .kiwi-statebrowser-network-collapsable {
        &.kiwi--collapsed {
            display: none;
        }
    }

    .kiwi-statebrowser-network-status {
        text-align: center;
        font-size: 0.9em;
        padding: 0.2em 0;
        background-color: rgba(128, 128, 128, 0.4);
    }

    .kiwi-statebrowser-group {
        display: flex;
        align-items: center;
        padding: 0.2em @header_padding 0.2em 0;
        cursor: pointer;

        .kiwi-statebrowser-group-header {
            flex-grow: 1;
            font-weight: 600;
        }

        .kiwi-statebrowser-group-name {
            text-transform: uppercase;
            font-size: 0.8em;
        }

        .kiwi-statebrowser-group-toggle {
            text-align: center;
            padding: 0;
            width: 1.5em;
        }

        .kiwi-statebrowser-group-close {
            display: block;
        }
    }

    .kiwi-statebrowser-buffer-close {
        text-align: center;
        font-size: 0.9em;
        background-color: rgba(128, 128, 128, 0.4);
    }
}

.kiwi-statebrowser-networks--multiple {
    .kiwi-statebrowser-network-header {
        &:hover .kiwi-statebrowser-network-icon {
            > .fa-server {
                visibility: hidden;
            }

            > .fa-caret-down,
            > .fa-caret-right {
                display: block;
            }
        }
    }
}

@media screen and (max-width: 769px) {
    .kiwi-statebrowser-networks--multiple {
        .kiwi-statebrowser-network-header {
            .kiwi-statebrowser-network-icon {
                > .fa-server {
                    visibility: hidden;
                }

                > .fa-caret-down,
                > .fa-caret-right {
                    display: block;

                    &:hover {
                        background-color: initial;
                    }
                }
            }
        }
    }
}
</style>
