<template>
    <div class="kiwi-statebrowser">
        <state-browser-usermenu :network="getNetwork" />
        <div class="kiwi-statebrowser-tools">
            <div
                v-for="plugin in pluginUiElements"
                :key="plugin.id"
                v-rawElement="{
                    el: plugin.el,
                    props: {
                        kiwi: {
                            statebrowser: self,
                        }
                    }
                }"
                class="kiwi-statebrowser-tool"
            />
        </div>
        <div
            :class="{ 'kiwi-statebrowser-networks--multiple': networksToShow.length > 1 }"
            class="kiwi-statebrowser-networks"
        >
            <state-browser-network
                v-for="network in networksToShow"
                :key="network.id"
                :network="network"
                :sidebar-state="sidebarState"
                :active-prompt="activePrompt"
            />
        </div>
        <div
            v-if="!isRestrictedServer"
            class="kiwi-statebrowser-add-network"
            @click="clickAddNetwork"
        >
            <span>{{ $t('add_network') }}</span>
            <i class="fa fa-plus" aria-hidden="true" />
        </div>
    </div>
</template>

<script>
'kiwi public';

import GlobalApi from '@/libs/GlobalApi';
import StateBrowserNetwork from './StateBrowserNetwork';
import StateBrowserUsermenu from './StateBrowserUsermenu';
import BufferSettings from './BufferSettings';

export default {
    components: {
        BufferSettings,
        StateBrowserNetwork,
        StateBrowserUsermenu,
    },
    props: ['networks', 'sidebarState'],
    data() {
        return {
            self: this,
            pluginUiElements: GlobalApi.singleton().stateBrowserPlugins,
            activePrompt: {
                type: undefined,
                value: undefined,
            },
        };
    },
    computed: {
        getNetwork() {
            return this.$state.getActiveNetwork();
        },
        isRestrictedServer() {
            return !!this.$state.settings.restricted;
        },
        networksToShow() {
            return this.networks.filter((net) => !net.hidden);
        },
    },
    methods: {
        clickAddNetwork: function clickAddNetwork() {
            let nick = 'Guest' + Math.floor(Math.random() * 100);
            let network = this.$state.getNetworkFromAddress('');
            if (typeof network === 'undefined') {
                network = this.$state.addNetwork('Network', nick, {});
            }
            network.showServerBuffer('settings');
        },
    },
};
</script>

<style lang="less">
.kiwi-statebrowser {
    display: flex;
    flex-direction: column;

    .kiwi-statebrowser-networks {
        flex-grow: 1;
    }

    .kiwi-statebrowser-add-network {
        display: flex;
        align-items: center;
        height: 38px;
        padding: 0 10px;
        font-weight: 600;
        border-top: 1px solid rgba(128, 128, 128, 0.4);
        transition: all 0.2s;

        &:hover {
            background-color: var(--brand-primary);
        }

        > span {
            flex-grow: 1;
        }

        > i {
            margin-right: 10px;
        }
    }

    /* Common styles used in subcomponents */
    .kiwi-statebrowser-unread {
        min-width: 26px;
        border-radius: 6px;
        padding: 0 0.4em;
        font-size: 0.8em;
        font-weight: 600;
        text-align: center;
        box-sizing: border-box;
        background-color: var(--brand-primary);
    }

    .kiwi-statebrowser-button,
    .kiwi-statebrowser-button-close {
        width: 26px;
        border-radius: 6px;
        text-align: center;
        transition: all 0.2s;

        &:hover {
            background-color: var(--brand-primary);
        }
    }

    .kiwi-statebrowser-button-close {
        display: none;

        &:hover {
            background-color: var(--brand-error);
        }
    }
}

@media screen and (max-width: 769px) {
    .kiwi-wrap.kiwi-wrap--statebrowser-drawopen .kiwi-statebrowser {
        width: 75%;
    }
}
</style>
