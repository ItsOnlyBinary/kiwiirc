<template>
    <div class="kiwi-statenetwork" :class="{ 'kiwi-network--active': isActiveNetwork, 'kiwi-network--highlight': hasHighlight }">
        <div class="kiwi-network--header" @click="setActiveBuffer(network.serverBuffer())">
            <svg-icon icon="fa-solid fa-server" />
            <a class="kiwi-network--name">
                {{ network.name || $t('network') }}
            </a>
            <div class="kiwi-button--small" @click.stop="clickUnreadCount">
                <template v-if="networkUnreadCount > 0">
                    {{ networkUnreadCount > 99 ? '99+': networkUnreadCount }}
                </template>
                <!-- svg icons: fas-plus, fas-minus -->
                <svg-icon v-else :icon="['fa-solid', isCollapsed ? 'fa-plus' : 'fa-minus']" />
            </div>
        </div>
        <transition-expand>
            <div v-if="channelFilter.show" class="kiwi-filter" @focusout="onChannelFilterBlur">
                <input
                    v-model="channelFilter.text"
                    v-focus
                    :placeholder="$t('filter_channels')"
                    type="text"
                    @keyup.esc="channelFilter.show = false"
                >
            </div>
        </transition-expand>
        <transition-expand>
            <div v-if="!isCollapsed" class="kiwi-buffers">
                <div
                    v-for="(itemBuffers, type) in buffersFilteredByType"
                    :key="type"
                    :data-type="type"
                    class="kiwi-buffers--group"
                >
                    <div v-if="type !== 'other'" class="kiwi-buffers--header" @click="sectionsToggle(type)">
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
                        <div class="kiwi-buffers--type">
                            {{ type === 'channels' ? $t('channels') : $t('messages') }}
                        </div>
                        <template v-if="type === 'channels'">
                            <div class="kiwi-button--tiny" @click.stop="toggleAddChannel">
                                <svg-icon icon="fa-solid fa-plus" fixed-width />
                            </div>
                            <div class="kiwi-button--tiny" @click.stop="channelFilter.show = !channelFilter.show">
                                <svg-icon icon="fa-solid fa-search" fixed-width />
                            </div>

                        </template>
                    </div>

                    <transition-expand>
                        <div v-if="type === 'other' || sectionsExpanded[type]">
                            <StateBuffer
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
        </transition-expand>
    </div>
</template>
<script setup>
import { computed, reactive, ref, watch } from 'vue';

import StateBuffer from '@/components/StateBuffer';

import getState from '@/libs/state';
import NetworkState from '@/libs/state/NetworkState';
import { orderBuffers } from '@/libs/bufferTools';

// eslint-disable-next-line no-unused-vars
const { network, sidebarState, activePrompt } = defineProps({
    network: {
        type: NetworkState,
        required: true,
    },
    sidebarState: {
        type: Object,
        required: true,
    },
    activePrompt: {
        type: Object,
        required: true,
    },
});

const isCollapsed = ref(false);
const isActiveNetwork = computed(() => network === getState().getActiveNetwork());
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

const networkUnreadCount = computed(() => {
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
    state.setActiveBuffer(buffer.networkid, buffer.name);
    if (state.ui.is_narrow) {
        state.$emit('statebrowser.hide');
    }
};

const clickUnreadCount = () => {
    if (networkUnreadCount.value === 0) {
        isCollapsed.value = !isCollapsed.value;
    } else {
        setActiveBuffer(network.serverBuffer());
    }
};

const channelFilter = reactive({
    show: false,
    text: '',
});

const channelFilterClose = () => {
    Object.assign(channelFilter, {
        show: false,
        text: '',
    });
};

// let onChannelFilterBlurTimeout = 0;
const onChannelFilterBlur = () => {
    const state = getState();
    if (state.ui.interacting) {
        watch(
            () => state.ui.interacting,
            () => channelFilterClose(),
            { once: true }
        );
    } else {
        channelFilterClose();
    }
    // Hacky, but if we remove the channel filter UI at this blur event and the user
    // clicked a link in this filter UI, then the click event will not hit the target
    // link as it has been removed before the event reaches it.
    // if (onChannelFilterBlurTimeout) {
    //     clearTimeout(onChannelFilterBlurTimeout);
    //     onChannelFilterBlurTimeout = 0;
    // }
    // onChannelFilterBlurTimeout = setTimeout(() => {
    //     onChannelFilterBlurTimeout = 0;
    //     channelFilterClose();
    // }, 200);
};

const buffersFiltered = computed(() => {
    const trimmedFilter = channelFilter.text.trim();
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

const sectionsToggle = (type) => (sectionsExpanded[type] = !sectionsExpanded[type]);

</script>
<style lang="scss">
.kiwi-statenetwork {
    cursor: pointer;
    user-select: none;

    .kiwi-network--header {
        display: flex;
        column-gap: 7px;
        align-items: center;
        padding: 6px 8px;
        font-weight: 600;
        background-color: rgba(128, 128, 128, 0.2);
        border-left: 3px solid transparent;
    }

    .kiwi-network--name {
        flex-grow: 1;
        text-align: left;
    }

    &.kiwi-network--active .kiwi-network--header {
        border-left-color: var(--brand-primary);
    }

    .kiwi-button--small {
        width: auto;
        min-width: 33px;
        height: 24px;
        padding: 4px;
        font-size: 0.8em;
        border: 1px solid grey;
        border-radius: 6px;
    }

    .kiwi-buffers--header {
        display: flex;
        column-gap: 4px;
        align-items: center;
        padding: 4px 6px 4px 4px;
        font-size: 0.8em;
        text-transform: uppercase;
    }

    .kiwi-buffers--type {
        flex-grow: 1;
    }

    .kiwi-button--tiny {
        padding: 0 2px;
        cursor: pointer;
        border-radius: 6px;
    }
}
</style>
