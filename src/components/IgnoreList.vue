<template>
    <div class="kiwi-ignorelist-container">
        <h3>{{ $t('ignore_list') }}</h3>
        <table v-if="onlineIgnoredUsers.length > 0" class="kiwi-ignorelist-table">
            <tr>
                <th colspan="2">Online</th>
            </tr>
            <tr v-for="user in onlineIgnoredUsers" :key="user.nick">
                <td>{{ user.nick }}</td>
                <td>
                    <a class="u-link" @click="user.ignore = false;
                                              network.ignored_list =
                                                  network.ignored_list.filter((n) => n !==
                                                      user.nick)"
                    >
                        Remove
                    </a>
                </td>
            </tr>
        </table>
        <table v-if="offlineIgnoredUsers.length > 0" class="kiwi-ignorelist-table">
            <tr>
                <th colspan="2">Offline</th>
            </tr>
            <tr v-for="user in offlineIgnoredUsers" :key="user">
                <td>{{ user }}</td>
                <td>
                    <a class="u-link" @click="network.ignored_list =
                        network.ignored_list.filter((n) => n !== user)"
                    >
                        Remove
                    </a>
                </td>
            </tr>
        </table>
        <span v-if="onlineIgnoredUsers.length === 0 && offlineIgnoredUsers.length === 0"
              class="kiwi-ignorelist-empty">{{ $t('ignore_list_empty') }}</span>
    </div>
</template>

<script>
'kiwi public';

import _ from 'lodash';

export default {
    props: ['network'],
    computed: {
        onlineIgnoredUsers() {
            return _.filter(this.network.users, (u) => u.ignore);
        },
        offlineIgnoredUsers() {
            return _.filter(this.network.ignored_list, (n) => !this.network.userByName(n));
        },
    },
};
</script>

<style>

.kiwi-ignorelist-container {
    max-width: 400px;
    width: auto;
    display: block;
    box-sizing: border-box;
    margin: 20px auto 20px auto;
}

.kiwi-ignorelist-container h3 {
    width: 100%;
    line-height: 45px;
    padding: 0 10px;
    box-sizing: border-box;
    text-align: center;
}

.kiwi-ignorelist-container table {
    width: 100%;
}

.kiwi-ignorelist-container table tr:last-of-type td {
    border-bottom: none;
}

.kiwi-ignorelist-table td:nth-child(1) {
    min-width: 250px;
    padding: 0 20px;
}

.kiwi-ignorelist-table td:nth-child(2) {
    text-align: center;
}

.kiwi-ignorelist-empty {
    padding-left: 20px;
}

</style>
