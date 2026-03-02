<template>
    <div
        class="kiwi-statenetwork"
        :class="{
            'kiwi-statenetwork--active': isActiveNetwork,
            'kiwi-statenetwork--unread': unreadCount > 0,
            'kiwi-statenetwork--highlight': hasHighlight,
        }"
        :data-status="network.state"
    >
        <div class="kiwi-statenetwork-header" role="button" @click="clickServerHeader">
            <svg-icon icon="fa-solid fa-server" class="kiwi-statenetwork-header-icon" />
            <a class="kiwi-statenetwork-name">
                {{ network.name || $t('network') }}
            </a>
            <div class="kiwi-statenetwork-button" role="button" @click="clickCollapseNetwork">
                <span class="kc--hidden">99+</span>
                <span v-if="unreadCount > 0" class="kiwi-statenetwork-button-count">
                    {{ unreadCount > 99 ? '99+': unreadCount }}
                </span>
                <!-- svg icons: fas-plus, fas-minus -->
                <svg-icon
                    :icon="['fa-solid', isCollapsed ? 'fa-plus' : 'fa-minus']"
                    class="kiwi-statenetwork-button-icon"
                />
            </div>
        </div>
        <TransitionExpand>
            <div v-if="network.state !== 'connected'" class="kiwi-statenetwork-status">
                <template v-if="network.state_error">
                    <svg-icon icon="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                    <a class="kc-link" role="button" @click="clickServerHeader">
                        {{ $t('state_configure') }}
                    </a>
                </template>
                <template v-else-if="!network.connection.server">
                    <a class="kc-link" role="button" @click="clickServerHeader">
                        {{ $t('state_configure') }}
                    </a>
                </template>
                <template v-else-if="network.state === 'disconnected'">
                    {{ $t('state_disconnected') }}
                    <a class="kc-link" role="button" @click="network.connect()">
                        {{ $t('connect') }}
                    </a>
                </template>
                <template v-else-if="network.state === 'connecting'">
                    {{ $t('connecting') }}
                </template>
            </div>
        </TransitionExpand>
        <TransitionExpand>
            <div v-if="channelTools.isActive('filter')" class="kiwi-statenetwork-tool" @focusout="onToolBlur">
                <input
                    v-model="channelTools.filter"
                    v-focus
                    :placeholder="$t('filter_channels')"
                    :aria-label="$t('filter_channels')"
                    type="text"
                    class="kc-input"
                    @keyup.esc="channelTools.clear()"
                >
                <a
                    role="button"
                    class="kc-link"
                    @click="showNetworkChannels"
                    v-text="$t('find_more_channels')"
                />
            </div>
            <div v-else-if="channelTools.isActive('search')" class="kiwi-statenetwork-tool" @focusout="onToolBlur">
                <input
                    v-model="channelTools.search"
                    v-focus
                    :placeholder="$t('state_join')"
                    :aria-label="$t('state_join')"
                    type="text"
                    class="kc-input"
                    @keydown="onToolKeyDown"
                >
                <AutoComplete
                    ref="autocomplete"
                    class="kiwi-statenetwork-autocomplete"
                    items-per-page="5"
                    :items="suggestedChannelsList"
                    :filter="channelTools.search"
                    :fuzzy-filter="true"
                    @selected="onNewChannelSelected"
                />
            </div>
        </TransitionExpand>
        <TransitionExpand>
            <div v-if="!isCollapsed" class="kiwi-statenetwork-buffers">
                <div
                    v-for="(itemBuffers, type, idx) in buffersFilteredByType"
                    :key="type"
                    :data-type="type"
                    class="kiwi-statenetwork-buffers-group"
                >
                    <div
                        v-if="showBufferGroups && !channelTools.isActive('filter') && type !== 'other'
                            || idx === 0 && (!showBufferGroups || channelTools.isActive('filter'))"
                        class="kiwi-statenetwork-buffers-header"
                        role="button"
                        @click="sectionsToggle(type)"
                    >
                        <template
                            v-if="showBufferGroups && type === 'channels'
                                || idx == 0 && (!showBufferGroups || channelTools.isActive('filter'))"
                        >
                            <div
                                class="kiwi-statenetwork-button kiwi-statenetwork-button--filter"
                                role="button"
                                @click.stop="channelTools.toggle('filter', network)"
                            >
                                <svg-icon icon="fa-solid fa-search" fixed-width />
                            </div>
                            <div
                                class="kiwi-statenetwork-button kiwi-statenetwork-button--search"
                                role="button"
                                @click.stop="channelTools.toggle('search', network)"
                            >
                                <svg-icon icon="fa-solid fa-plus" fixed-width />
                            </div>
                        </template>
                        <template v-if="showBufferGroups && !channelTools.isActive('filter')">
                            <div class="kiwi-statenetwork-buffers-name">
                                {{ type === 'channels' ? $t('channels') : $t('messages') }}
                            </div>
                            <!-- svg icons: fas-caret-down, fas-caret-right -->
                            <svg-icon
                                :icon="[
                                    'fa-solid',
                                    sectionsExpanded[type]
                                        ? 'fa-caret-down'
                                        : 'fa-caret-right'
                                ]"
                                fixed-width
                            />
                        </template>
                    </div>

                    <transition-expand>
                        <div v-if="type === 'other' || sectionsExpanded[type]">
                            <StateBrowserBuffer
                                v-for="buffer in itemBuffers"
                                :key="buffer.name"
                                :buffer="buffer"
                                @selected="setActiveBuffer(buffer)"
                            />
                        </div>
                    </transition-expand>
                </div>
            </div>
        </TransitionExpand>
    </div>
</template>
<script setup>
import { computed, inject, reactive, ref, useTemplateRef } from 'vue';

import StateBrowserBuffer from '@/components/StateBrowserBuffer';

import getState from '@/libs/state';
import NetworkState from '@/libs/state/NetworkState';
import AutoComplete from '@/components/AutoComplete';
import { orderBuffers } from '@/libs/bufferTools';
import { extractBuffers } from '../helpers/Misc';

const { networks, network } = defineProps({
    networks: {
        type: Array,
        required: true,
    },
    network: {
        type: NetworkState,
        required: true,
    },
});

const activePrompt = inject('StateBrowserActivePrompt');

const autocompleteElement = useTemplateRef('autocomplete');

const isActiveNetwork = computed(() => network === getState().getActiveNetwork());

const isCollapsed = ref(false);
const hasHighlight = computed(() => {
    if (!isCollapsed.value) {
        return network.serverBuffer().flag('highlight');
    }
    return network.buffers.some((buffer) => {
        if (buffer.isSpecial()) {
            return false;
        }
        return buffer.flag('highlight');
    });
});

const unreadCount = computed(() => {
    if (!isCollapsed.value) {
        return network.serverBuffer().flag('unread');
    }

    return network.buffers.reduce((acc, buffer) => {
        if (buffer.isSpecial()) {
            return acc;
        }
        return acc + buffer.flag('unread');
    }, 0);
});

const setActiveBuffer = (buffer) => {
    const state = getState();
    state.$emit('active.component', null);
    state.setActiveBuffer(network.id, buffer.name);
    if (state.ui.is_narrow) {
        state.$emit('statebrowser.hide');
    }
};

const clickServerHeader = () => {
    const buffer = network.serverBuffer();

    buffer.getMessages().length
        ? network.showServerBuffer('messages')
        : network.showServerBuffer('settings');
};

const clickCollapseNetwork = (event) => {
    if (networks.length > 1) {
        event.stopPropagation();
        isCollapsed.value = !isCollapsed.value;
    }
};

const channelTools = reactive({
    filter: '',
    search: '',

    set(tool) {
        activePrompt.set(`tool-${tool}`, network);
        this.filter = '';
        this.search = '';
    },
    toggle(tool) {
        this.isActive(tool)
            ? this.clear()
            : this.set(tool);
    },
    isActive(tool) {
        return activePrompt.isActive(`tool-${tool}`, network);
    },
    clear() {
        activePrompt.clear();
        this.filter = '';
        this.search = '';
    },
});

const joinChannels = (channels) => {
    const state = getState();
    const buffers = extractBuffers(channels);
    const ignoreNames = ['#0', '0', '&0'];

    // Only switch to the first channel we join if multiple are being joined
    let hasSwitchedActiveBuffer = false;
    buffers.forEach((bufferObj) => {
        const chanName = bufferObj.name;
        if (ignoreNames.indexOf(chanName) > -1 || chanName.replace(/[#&]/g, '') === '') {
            return;
        }

        const newBuffer = state.addBuffer(network.id, chanName);
        if (newBuffer && !hasSwitchedActiveBuffer) {
            state.setActiveBuffer(network.id, newBuffer.name);
            hasSwitchedActiveBuffer = true;
        }

        if (bufferObj.key) {
            newBuffer.key = bufferObj.key;
        }

        if (network.isChannelName(chanName)) {
            newBuffer.join();
        }
    });

    channelTools.clear();
};

const onToolKeyDown = (event) => {
    const autoComplete = autocompleteElement.value;
    if (!autoComplete) {
        return;
    }

    if (event.key === 'Tab') {
        event.preventDefault();
        autoComplete.selectCurrentItem();
        return;
    }

    if (event.key === 'Escape') {
        channelTools.clear();
        return;
    }

    const item = autoComplete.selectedItem;
    if (event.key === 'Enter' && (!item || item.text === channelTools.search)) {
        joinChannels(channelTools.search);
        return;
    }

    autoComplete.handleOnKeyDown(event);
};

const onNewChannelSelected = (value, item, isClick) => {
    channelTools.search = value;
    if (isClick) {
        joinChannels(value);
    }
};

const suggestedChannelsList = computed(() => {
    const state = getState();

    const suggestedChannels = state.setting('suggestedChannels');
    if (Array.isArray(suggestedChannels)) {
        return suggestedChannels
            .filter((c) => !state.getBufferByName(network.id, c.channel))
            .map((c) => ({ text: c }));
    }

    if (network.channel_list_state === '') {
        network.maybeUpdateChannelList();
    }

    return network.channel_list
        .filter((c) => !state.getBufferByName(network.id, c.channel))
        .sort((a, b) => b.num_users - a.num_users)
        .map((c) => ({ text: c.channel, count: c.num_users, type: 'channel' }));
});

const showNetworkChannels = () => {
    const state = getState();
    channelTools.clear();
    network.showServerBuffer('channels');
    if (state.ui.is_narrow) {
        state.$emit('statebrowser.hide');
    }
};

const showBufferGroups = getState().settingComputed('buffers.show_buffer_groups');
const buffersFiltered = computed(() => {
    const trimmedFilter = channelTools.filter.trim();
    if (!trimmedFilter) {
        return orderBuffers(network.buffers);
    }

    const filterText = trimmedFilter.toLowerCase();
    const filteredBuffers = network.buffers.filter(
        (buffer) => buffer.name.toLowerCase().indexOf(filterText) > -1
    );

    return orderBuffers(filteredBuffers);
});

const buffersFilteredByType = computed(() => {
    const types = {
        other: [],
        channels: [],
        queries: [],
    };

    buffersFiltered.value.forEach((buffer) => {
        if (buffer.isChannel()) {
            types.channels.push(buffer);
        } else if (buffer.isQuery()) {
            types.queries.push(buffer);
        } else {
            types.other.push(buffer);
        }
    });

    Object.entries(types).forEach(([type, buffers]) => {
        // Always show channels type as it has join controls
        if (type !== 'channels' && !buffers.length) {
            delete types[type];
        }
    });

    return types;
});

const sectionsExpanded = reactive({
    channels: true,
    queries: true,
});

const sectionsToggle = (type) => sectionsExpanded[type] = !sectionsExpanded[type];

</script>
<style lang="scss">
@use '/src/res/styles/uiFunctions' as ui;

.kiwi-statenetwork {
    &-button {
        position: relative;
        box-sizing: border-box;
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        padding: 2px 4px;
        font-size: var(--font-size-85);
        line-height: 1em;
        border-radius: calc(0.2em + 2px);
        transition: ui.transition(background-color);

        &-count,
        &-icon,
        .kc-hidden {
            opacity: 0;
            transition: ui.transition(opacity);
        }

        .kc--hidden ~ &-count,
        .kc--hidden ~ &-icon {
            position: absolute;
        }
    }

    &-tool {
        border-bottom: 1px solid rgb(128, 128, 128, 0.3);

        .kc-input {
            display: block;
            width: 100%;
            padding: 12px 8px;
        }

        .kc-link {
            display: block;
            padding: 8px;
            font-size: var(--font-size-85);
            line-height: 1em;
            text-align: center;
            background-color: rgb(128, 128, 128, 0.1);
        }

        .kiwi-autocomplete {
            position: static;
            text-align: left;
            background: initial;
            border: initial;
            box-shadow: initial;

            &-item {
                padding: 4px 6px;
                white-space: nowrap;
                border-bottom: initial;
            }

            &-item-value {
                overflow: hidden;
                text-overflow: ellipsis;
            }

            &-item--selected {
                background-color: rgb(128, 128, 128, 0.3);
            }
        }
    }

    &-header {
        display: flex;
        column-gap: 8px;
        align-items: center;
        padding: 0 8px;
        font-weight: 600;
        cursor: pointer;
        background-color: rgb(128, 128, 128, 0.3);
        border-left: 3px solid transparent;

        &-icon {
            color: var(--brand-positive);

            .kiwi-statenetwork[data-status='connecting'] & {
                color: var(--brand-neutral);
            }

            .kiwi-statenetwork[data-status='disconnected'] & {
                color: var(--brand-negative);
            }
        }

        .kiwi-statenetwork--active & {
            border-left-color: var(--brand-primary);
        }

        .kiwi-statenetwork-button {
            padding: 4px;

            .kiwi-statebrowser--multi &-icon {
                opacity: 1;
            }

            .kiwi-statenetwork--unread & {
                background-color: var(--brand-neutral);

                &-count {
                    opacity: 1;
                }

                &-icon {
                    opacity: 0;
                }
            }

            .kiwi-statenetwork--highlight & {
                background-color: var(--brand-negative);
            }
        }

        &:hover {
            .kiwi-statebrowser--multi & .kiwi-statenetwork-button {
                background-color: initial;

                &-count {
                    opacity: 0;
                }

                &-icon {
                    opacity: 1;
                }

                &:hover {
                    background-color: var(--brand-primary);
                }
            }
        }
    }

    &-name {
        flex-grow: 1;
        padding: 10px 0;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    &-status {
        padding: 8px;
        font-size: var(--font-size-85);
        line-height: 1em;
        text-align: center;
        background-color: rgb(128, 128, 128, 0.2);
    }

    .kiwi-statenetwork-buffers {
        &-header {
            display: flex;
            flex-direction: row-reverse;
            column-gap: 4px;
            align-items: center;
            padding: 4px 8px 4px 4px;
            font-size: var(--font-size-85);
            text-transform: uppercase;
            cursor: pointer;

            .kiwi-statenetwork-button {
                border-radius: 4px;

                &:hover {
                    background-color: var(--brand-positive);
                }
            }
        }

        &-name {
            flex: 1 1;
        }
    }
}
</style>
