<template>
    <div class="kiwi-nicklist">
        <div class="kiwi-nicklist-info">
            <input :placeholder="$t('person', {count: sortedUsers.length})" v-model="user_filter" ref="user_filter">
            <i class="fa fa-search" @click="$refs.user_filter.focus()"></i>
        </div>
        <ul class="kiwi-nicklist-users">
            <li
                v-for="user in sortedUsers"
                :key="user.nick"
                class="kiwi-nicklist-user"
                v-bind:class="[
                    userMode(user) ? 'kiwi-nicklist-user--mode-' + userMode(user) : '',
                    user.away ? 'kiwi-nicklist-user--away' : ''
                ]"
            >
                <span class="kiwi-nicklist-user-prefix">{{userModePrefix(user)}}</span><span
                    class="kiwi-nicklist-user-nick"
                    @click="openUserbox(user, $event)"
                    v-bind:style="nickStyle(user.nick)"
                >{{user.nick}}</span>

                <div class="tooltip">
                    <div class="tooltipNick">{{ user.nick }}</div>
                    <div class="tooltipInfo">{{ user.age }} {{ (user.gender == 'F') ? 'Femme' : 'Homme' }}<br>{{ user.location }}</div>
                </div>

            </li>
        </ul>
    </div>
</template>


<script>

import state from '@/libs/state';
import Logger from '@/libs/Logger';
import * as TextFormatting from '@/helpers/TextFormatting';
import * as Misc from '@/helpers/Misc';

let log = Logger.namespace('Nicklist');

// Hot function, so it's here for easier caching
function strCompare(a, b) {
    if (a === b) {
        return 0;
    }
    return a > b ?
        1 :
        -1;
}

export default {
    data: function data() {
        return {
            userbox_user: null,
            user_filter: '',
        };
    },
    props: ['network', 'buffer', 'users'],
    computed: {
        sortedUsers: function sortedUsers() {
            // Get a list of network prefixes and give them a rank number
            let netPrefixes = this.network.ircClient.network.options.PREFIX;
            let prefixOrders = Object.create(null);
            netPrefixes.forEach((prefix, idx) => {
                prefixOrders[prefix.mode] = idx;
            });

            // A few things here:
            // * Since vuejs will sort in-place and update views when .sort is called
            //   on an array, clone it first so that we have a plain array to sort
            // * Keep a map of lowercased nicks to we don't need to call .toLowerCase()
            //   on each one all the time. This is a hot function!
            let nickMap = Object.create(null);
            let users = [];
            let bufferUsers = this.buffer.users;
            let nickFilter = this.user_filter.toLowerCase();
            /* eslint-disable guard-for-in */
            for (let lowercaseNick in bufferUsers) {
                let user = bufferUsers[lowercaseNick];
                nickMap[user.nick] = lowercaseNick;
                if (!nickFilter || lowercaseNick.indexOf(nickFilter) !== -1) {
                    users.push(user);
                }
            }

            let bufferId = this.buffer.id;
            return users.sort((a, b) => {
                let bufferA = a.buffers[bufferId];
                let bufferB = b.buffers[bufferId];

                if (!bufferA) {
                    let msg = 'Nicklist.sortedUsers() User A does not have the buffer in its list!';
                    log.error(msg, a.nick, a.buffers);
                    return -1;
                }
                if (!bufferB) {
                    let msg = 'Nicklist.sortedUsers() User B does not have the buffer in its list!';
                    log.error(msg, b.nick, b.buffers);
                    return 1;
                }

                let modesA = bufferA.modes;
                let modesB = bufferB.modes;

                // Neither user has a prefix, compare text
                if (
                    modesA.length === 0 &&
                    modesB.length === 0
                ) {
                    return strCompare(nickMap[a.nick], nickMap[b.nick]);
                }

                // Compare via prefixes..
                if (
                    modesA.length > 0 &&
                    modesB.length === 0
                ) {
                    return -1;
                }

                if (
                    modesA.length === 0 &&
                    modesB.length > 0
                ) {
                    return 1;
                }

                // Both users have a prefix so find the highest ranking one
                let aP = prefixOrders[modesA[0]];
                let bP = prefixOrders[modesB[0]];
                if (aP > bP) {
                    return 1;
                } else if (aP < bP) {
                    return -1;
                }

                // Prefixes are the same, resort to comparing text
                return strCompare(nickMap[a.nick], nickMap[b.nick]);
            });
        },
        useColouredNicks: function useColouredNicks() {
            return this.buffer.setting('coloured_nicklist');
        },
    },
    methods: {
        nickStyle: function nickStyle(nick) {
            let styles = {};
            if (this.useColouredNicks) {
                styles.color = TextFormatting.createNickColour(nick);
            }
            return styles;
        },
        userModePrefix: function userModePrefix(user) {
            return Misc.userModePrefix(user, this.buffer);
        },
        userMode: function userMode(user) {
            return Misc.userMode(user, this.buffer);
        },
        openQuery: function openQuery(user) {
            let buffer = state.addBuffer(this.buffer.networkid, user.nick);
            state.setActiveBuffer(buffer.networkid, buffer.name);
        },
        openUserbox: function openUserbox(user, mouseEvent) {
            state.$emit('userbox.show', user, {
                top: mouseEvent.clientY,
                left: mouseEvent.clientX,
                buffer: this.buffer,
            });
        },
    },
};
</script>


<style>
    .kiwi-nicklist {
        overflow: hidden;
        box-sizing: border-box;
        overflow-y: auto;
    }

    .kiwi-nicklist-info {
        font-size: 0.9em;
        text-align: center;
        display: flex;
        padding-bottom: 1em;
        border-width: 0 0 1px 0;
        border-style: solid;
    }

    .kiwi-nicklist-info input {
        flex: 1;
        border: 0;
        background: 0 0;
        padding: 10px 0 10px 20px;
        margin: 0;
        outline: 0;
        text-align: center;
    }

    i.fa-search {
        position: relative;
        z-index: 1;
        left: -25px;
        top: 1px;
        color: #cfcfcf;
        cursor: pointer;
        width: 0;
        line-height: 50px;
    }

    .kiwi-nicklist-info i.fa-search {
        flex: 1;
        margin-right: 25px;
    }

    .search input {
        outline: 0;
    }

    .kiwi-nicklist-users {
        list-style: none;
        padding: 0 20px;
        line-height: 1.2em;
    }

    .kiwi-nicklist-user {
        padding: 3px 0;
        position: relative;
    }

    .kiwi-nicklist-user-nick {
        font-weight: bold;
        cursor: pointer;
    }

    /* Tooltip text */
    .kiwi-nicklist-user .tooltip {
        visibility: hidden;
        width: 200px;
        max-width: 276px;
        background-color: #fff;
        text-align: left;
        padding: 1px;
        border-radius: 6px;

        /* Position the tooltip text */
        position: absolute;
        bottom: 125%;
        left: 0;
        margin-left: -60px;

        /* Fade in tooltip */
        opacity: 0;
        transition: opacity 0.3s;
        background-clip: padding-box;
        border: 1px solid rgba(0, 0, 0, 0.2);
        box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
        white-space: normal;
        z-index: 1;
    }

    .kiwi-nicklist-user div.tooltip div.tooltipNick {
        background-color: #eee;
        border-bottom: 1px solid #ebebeb;
        border-radius: 5px 5px 0 0;
        font-size: 14px;
        font-weight: 400;
        line-height: 18px;
        margin: 0;
        padding: 8px 14px;
        z-index: 1;
    }

    .kiwi-nicklist-user div.tooltip div.tooltipInfo {
        padding: 9px 14px;
    }

    /* Tooltip arrow */
    .kiwi-nicklist-user .tooltip::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
    }

    /* Show the tooltip text when you mouse over the tooltip container */
    .kiwi-nicklist-user:hover .tooltip {
        visibility: visible;
        opacity: 1;
    }
</style>
