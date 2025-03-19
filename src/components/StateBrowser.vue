<template>
    <div class="kiwi-statebrowser">
        <StateButtons />
        <StateUser />
        <div class="kiwi-plugins">
            <component
                :is="plugin.component"
                v-for="plugin in pluginElements"
                :key="plugin.id"
                v-bind="plugin.props"
                :networks="networks"
                :sidebar-state="sidebarState"
                class="kiwi-plugin"
            />
        </div>
        <div class="kiwi-scroll">
            <StateNetwork
                v-for="network in visibleNetworks"
                :key="network.id"
                :network="network"
                :sidebar-state="sidebarState"
                :active-prompt="activePrompt"
            />
        </div>
        <a v-if="!isRestricted" class="kiwi-network--add" @click="clickAddNetwork">
            <span>{{ $t('add_network') }}</span>
            <svg-icon icon="fa-solid fa-plus" />
        </a>
    </div>
</template>

<script setup>
import { computed, reactive } from 'vue';

import getState from '@/libs/state';
import GlobalApi from '@/libs/GlobalApi';
import StateButtons from '@/components/StateButtons';
import StateUser from '@/components/StateUser.vue';
import StateNetwork from '@/components/StateNetwork';

import * as TextFormatting from '@/helpers/TextFormatting';
import { processNickRandomNumber } from '@/helpers/Misc';

const { networks, sidebarState } = defineProps({
    networks: {
        type: Object,
        required: true,
    },
    sidebarState: {
        type: Object,
        required: true,
    },
});

const activePrompt = reactive({
    type: undefined,
    value: undefined,
});

const visibleNetworks = computed(() => networks.filter((network) => !network.hidden));

const pluginElements = GlobalApi.singleton().stateBrowserPlugins;

const isRestricted = computed(() => !!getState().getSetting('settings.restricted'));

const clickAddNetwork = () => {
    const state = getState();
    const nick = processNickRandomNumber(state.setting('startupOptions.nick'));
    const network = state.addNetwork(TextFormatting.t('network'), nick, {});
    network.showServerBuffer('settings');
};
</script>

<style lang="scss">
.kiwi-statebrowser {
    display: flex;
    flex-direction: column;
    line-height: 1.2em;

    .kiwi-scroll {
        flex-grow: 1;
    }

    .kiwi-network--add {
        display: flex;
        align-items: center;
        min-height: 43px;
        padding: 0 12px;
        font-weight: 600;
        white-space: nowrap;
        border-top: 1px solid grey;
        transition: background-color 0.3s;

        > span {
            flex-grow: 1;
        }

        > svg {
            font-size: 1.1em;
        }
    }
}
</style>
