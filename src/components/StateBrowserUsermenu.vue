<template>
    <div
        :class="{'kiwi-statebrowser-usermenu--open': is_usermenu_open}"
        class="kiwi-statebrowser-usermenu"
    >
        <div
            v-if="!$state.setting('hideSettings')"
            :title="$t('kiwi_settings')"
            class="kiwi-statebrowser-usermenu-button kiwi-button-left"
            @click="clickAppSettings"
        >
            <i class="fa fa-cog" aria-hidden="true" />
        </div>
        <div
            :class="[isConnected ?
                'kiwi-statebrowser-usermenu-avatar--connected' :
                'kiwi-statebrowser-usermenu-avatar--disconnected'
            ]"
            class="kiwi-statebrowser-usermenu-avatar"
            @click="is_usermenu_open=!is_usermenu_open"
        >
            <avatar
                v-if="getUser"
                :user="getUser"
                size="large"
            />
            <away-status-indicator
                v-if="network && network.state === 'connected'"
                :network="network"
                :user="getUser"
                :toggle="false"
            />
        </div>
        <div v-if="is_usermenu_open" class="kiwi-statebrowser-usermenu-body">
            <span>{{ $t('state_remembered') }}</span>
            <a class="u-button u-button-warning" @click="clickForget">{{ $t('state_forget') }}</a>
            <div
                class="kiwi-statebrowser-usermenu-button kiwi-button-right"
                @click="is_usermenu_open=false"
            ><i class="fa fa-times" aria-hidden="true" /></div>
        </div>
        <div
            v-else
            class="kiwi-statebrowser-usermenu-network"
        >{{ networkName }}</div>
    </div>
</template>
<script>

'kiwi public';

import * as TextFormatting from '@/helpers/TextFormatting';
import AppSettings from './AppSettings';
import Avatar from './Avatar';
import AwayStatusIndicator from './AwayStatusIndicator';

export default {
    components: {
        AwayStatusIndicator,
        Avatar,
    },
    props: ['network'],
    data() {
        return {
            is_usermenu_open: false,
        };
    },
    computed: {
        networkName() {
            let name = TextFormatting.t('no_network');
            if (this.network) {
                name = this.network.name;
            }
            return name;
        },
        getUser() {
            return this.network && this.network.currentUser() ?
                this.network.currentUser() :
                null;
        },
        isConnected() {
            return this.network && this.network.state === 'connected';
        },
    },
    methods: {
        clickForget() {
            let msg = 'This will delete all stored networks and start fresh. Are you sure?';
            /* eslint-disable no-restricted-globals, no-alert */
            let confirmed = confirm(msg);
            if (!confirmed) {
                return;
            }

            this.$state.persistence.forgetState();
            window.location.reload();
        },
        clickAppSettings: function clickAppSettings() {
            this.$state.$emit('active.component.toggle', AppSettings);
        },
    },
};

</script>

<style lang="less">
.kiwi-statebrowser-usermenu {
    width: 100%;
    padding: 2em 0 1em 0;

    .kiwi-statebrowser-usermenu-button {
        position: absolute;
        top: 0;
        width: 32px;
        line-height: 32px;
        text-align: center;
        cursor: pointer;
        font-weight: 800;
        font-size: 20px;
        opacity: 0.8;

        &:hover {
            opacity: 1;
        }

        &.kiwi-button-left {
            left: 0;
            border-bottom-right-radius: 14px;
        }

        &.kiwi-button-right {
            right: 0;
            border-bottom-left-radius: 14px;
            background-color: var(--brand-error);
        }
    }

    .kiwi-statebrowser-usermenu-avatar {
        position: relative;
        width: 80px;
        height: 80px;
        margin: 0 auto 0.4em auto;
        font-size: 2.8em;

        .kiwi-avatar-inner {
            border-width: 3px;
        }

        .kiwi-awaystatusindicator {
            position: absolute;
            top: 4px;
            right: 0;
            width: 14px;
            height: 14px;
            border: 1px solid;
        }
    }

    .kiwi-statebrowser-usermenu-body {
        padding: 0 10px;
        text-align: center;

        > span {
            display: block;
            font-size: 0.8em;
            margin-bottom: 8px;
        }
    }

    .kiwi-statebrowser-usermenu-network {
        text-align: center;
    }
}
</style>
