<template>
    <div class="kiwi-stateuser">
        <UserAvatar
            :user="activeUser"
            :network="activeNetwork"
            :allow-toggle="true"
            :force-show-status="true"
            size="large"
        />
        <div class="kiwi-network--name">
            {{ activeNetwork ? activeNetwork.name : $t('no_network') }}
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';

import UserAvatar from '@/components/UserAvatar';

import getState from '@/libs/state';

const activeNetwork = computed(() => getState().getActiveNetwork());

const activeUser = computed(() => {
    if (activeNetwork.value && activeNetwork.value.currentUser()) {
        return activeNetwork.value.currentUser();
    }
    return null;
});
</script>

<style lang="scss">
.kiwi-stateuser {
    .kiwi-avatar {
        display: block;
        width: 80px;
        height: 80px;
        margin: 8px auto 8px auto;
    }

    .kiwi-network--name {
        margin-bottom: 8px;
        text-align: center;
    }
}
</style>
