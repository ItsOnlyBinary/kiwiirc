<template>
    <div class="kiwi-statebrowser-wrap">
        <Transition name="kiwi-statebrowser">
            <div
                v-show="$state.ui.show_statebrowser || $state.ui.is_narrow"
                ref="statebrowser"
                class="kiwi-statebrowser"
                :class="{
                    'kiwi-statebrowser--multi': networks.length > 1,
                }"
            >
                <StateBrowserActions />
                <StateBrowserUser />
                <div class="kiwi-statebrowser-plugins">
                    <component
                        :is="plugin.component"
                        v-for="plugin in pluginElements"
                        :key="plugin.id"
                        v-bind="plugin.props"
                        :networks="networks"
                        :sidebar-state="sidebarState"
                        class="kiwi-statebrowser-plugin"
                    />
                </div>
                <div class="kiwi-statebrowser-scroll">
                    <StateBrowserNetwork
                        v-for="network in visibleNetworks"
                        :key="network.id"
                        :networks="networks"
                        :network="network"
                    />
                </div>
                <a
                    v-if="!isRestricted"
                    class="kiwi-statebrowser-add"
                    role="button"
                    @click="clickAddNetwork"
                >
                    <span>{{ $t('add_network') }}</span>
                    <svg-icon icon="fa-solid fa-plus" />
                </a>
            </div>
        </Transition>
        <div
            class="kiwi-statebrowser-toggle kiwi-stateactions-button"
            :class="{
                'kiwi-statebrowser-toggle--unread': unreadCount > 0,
                'kiwi-statebrowser-toggle--highlight': hasHighlight,
            }"
            role="button"
            tabindex="0"
            @click="$state.ui.show_statebrowser = !$state.ui.show_statebrowser"
        >
            <SvgIcon class="kiwi-statebrowser-toggle-left" icon="fa-solid fa-angles-left" />
            <SvgIcon class="kiwi-statebrowser-toggle-bars" icon="fa-solid fa-bars" />
            <span class="kiwi-statebrowser-toggle-count">
                {{ unreadCount > 99 ? '99+': unreadCount }}
            </span>
        </div>
    </div>
</template>

<script setup>
import { computed, inject, provide, reactive, useTemplateRef } from 'vue';

import getState from '@/libs/state';
import GlobalApi from '@/libs/GlobalApi';
import useListeners from '@/libs/composables/useListeners';

import StateBrowserActions from '@/components/StateBrowserActions';
import StateBrowserUser from '@/components/StateBrowserUser';
import StateBrowserNetwork from '@/components/StateBrowserNetwork';

import * as TextFormatting from '@/helpers/TextFormatting';
import { processNickRandomNumber } from '@/helpers/Misc';

const sidebarState = inject('SidebarState');

const { networks } = defineProps({
    networks: {
        type: Object,
        required: true,
    },
});

const stateBrowserElement = useTemplateRef('statebrowser');

const eventListeners = useListeners();

const activePrompt = reactive({
    type: undefined,
    value: undefined,
    set(type, value) {
        this.type = type;
        this.value = value;
    },
    toggle(type, value) {
        this.isActive(type.value)
            ? this.clear()
            : this.set(type, value);
    },
    isActive(type, value) {
        return this.type === type && this.value === value;
    },
    clear() {
        this.type = undefined;
        this.value = undefined;
    },
});
provide('StateBrowserActivePrompt', activePrompt);

eventListeners.listen(getState(), 'document.clicked', (event) => {
    if (!activePrompt.type) {
        // Prompt is not open
        return;
    }
    const ignoreEls = [
        ...stateBrowserElement.value.querySelectorAll('.kiwi-statebrowser-prompt'),
    ];

    if (ignoreEls.some((el) => el.contains(event.target) || el === event.target)) {
        return;
    }

    activePrompt.clear();
});

const pluginElements = GlobalApi.singleton().stateBrowserPlugins;

const visibleNetworks = computed(() => networks.filter((network) => !network.hidden));

const isRestricted = computed(() => !!getState().getSetting('settings.restricted'));
const clickAddNetwork = () => {
    const state = getState();
    const nick = processNickRandomNumber(state.setting('startupOptions.nick'));
    const network = state.addNetwork(TextFormatting.t('network'), nick, {});
    network.showServerBuffer('settings');
};

const hasHighlight = computed(
    () => networks.some((network) => network.buffers.some((buffer) => {
        if (buffer.isSpecial()) {
            return false;
        }
        return buffer.flag('highlight');
    }))
);

const unreadCount = computed(() => {
    let count = 0;
    networks.forEach((network) => {
        count += network.buffers.reduce((acc, buffer) => {
            if (buffer.isSpecial()) {
                return acc;
            }
            return acc + buffer.flag('unread');
        }, 0);
    });
    return count;
});
</script>

<style lang="scss">
@use '/src/res/styles/uiFunctions' as ui;

.kiwi-statebrowser-wrap {
    position: relative;
    flex-shrink: 0;
    color: var(--comp-statebrowser-fg);
    user-select: none;

    .kiwi-wrap--show-statebrowser & {
        width: var(--statebrowser-width);
    }

    .kiwi-wrap--compact & {
        position: absolute;
        top: 0;
        bottom: 0;
        left: calc((var(--statebrowser-width) * -1) - 1px);
        width: var(--statebrowser-width);
        transition: ui.transition(left);
    }

    .kiwi-wrap--compact.kiwi-wrap--show-statebrowser & {
        left: 0;
    }
}

.kiwi-statebrowser {
    position: relative;
    float: right;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    line-height: 1em;
    opacity: 1;

    > * {
        flex-shrink: 0;
    }

    &-prompt {
        background-color: rgb(128, 128, 128, 0.2);
    }

    &-scroll {
        flex: 1 1;
        overflow-y: auto;
        scrollbar-width: thin;
    }

    &-add {
        display: flex;
        align-items: center;
        min-height: 38px;
        padding: 0 12px;
        font-weight: 600;
        white-space: nowrap;
        cursor: pointer;
        border-top: 1px solid grey;
        transition: ui.transition(background-color);

        > span {
            flex-grow: 1;
        }

        > svg {
            flex-shrink: 0;
            font-size: 1.1em;
        }
    }

    &-toggle {
        position: absolute;
        top: 10px;
        right: -44px;
        z-index: 12;
        display: flex;
        width: 38px;
        font-size: 1.1em;
        font-weight: 700;
        background-color: var(--brand-primary);
        transition: ui.transition(top, right, color);

        &-left,
        &-bars,
        &-count {
            position: absolute;
            opacity: 0;
            transition: ui.transition(opacity);
        }

        &-left,
        &-bars {
            height: 24px;
        }

        .kiwi-wrap:not(.kiwi-wrap--show-statebrowser) & {
            &--highlight {
                background-color: var(--brand-neutral);
            }

            &-bars {
                opacity: 1;
            }

            &--unread {
                .kiwi-statebrowser-toggle-count {
                    opacity: 1;
                }

                .kiwi-statebrowser-toggle-bars {
                    opacity: 0;
                }
            }
        }

        .kiwi-wrap--show-statebrowser & {
            top: 2px;
            right: 2px;

            &-left {
                opacity: 1;
            }

            &:hover .kiwi-statebrowser-toggle-left {
                animation: ui.transition(kiwi-shake) 2;
            }
        }

        @keyframes kiwi-shake {
            0% {
                transform: translateX(0);
            }

            50% {
                transform: translateX(-4px);
            }

            100% {
                transform: translateX(4px);
            }
        }
    }

    .kiwi-wrap:not(.kiwi-wrap--compact) & {
        top: 0;
        bottom: 0;
        left: 0;
        opacity: 1;
        transition: ui.transition(opacity, left);

        &-enter-from,
        &-leave-to {
            position: absolute;
            left: calc((var(--statebrowser-width) * -1) - 1px);
            width: 0;
            min-width: 0;
            opacity: 0;
        }

        &-leave-active {
            position: relative;
            width: var(--statebrowser-width);
            min-width: var(--statebrowser-width);
        }
    }
}
</style>
