<template>
    <div class="kiwi-statebuttons">
        <div class="kiwi-button--small" title="Leave chat" @click.stop="clickLeave">
            <svg-icon icon="fa-solid fa-right-from-bracket" />
        </div>
        <div class="kiwi-button--small" :title="$t('kiwi_settings')" @click.stop="clickOpenSettings">
            <svg-icon icon="fa-solid fa-cog" />
        </div>
    </div>
    <TransitionExpand>
        <div v-if="promptType === 'leave'">
            <span>{{ $t('state_forget') }}</span>
            <input-confirm
                :flip-connotation="true"
                @ok="leaveSession(true)"
                @cancel="leaveSession(false)"
            />
        </div>
        <component :is="promptComponent" v-if="promptComponent" v-bind="promptProps" />
    </TransitionExpand>
</template>

<script setup>
import { ref } from 'vue';

import getState from '@/libs/state';
import AppSettings from '@/components/AppSettings';

const promptType = ref('');
const promptComponent = ref(null);
const promptProps = ref(null);

const leaveSession = (clearState) => {
    if (clearState) {
        getState().persistence.forgetState();
    }
    getState().ui.warn_on_exit = false;
    window.location.reload();
    promptType.value = '';
};

const clickLeave = () => {
    if (promptType.value === 'leave') {
        return;
    }
    if (!getState().persistence.isPersisting) {
        leaveSession(false);
        return;
    }
    promptType.value = 'leave';
};

const clickOpenSettings = () => {
    getState().$emit('active.component.toggle', AppSettings);
};

</script>

<style lang="scss">
.kiwi-statebuttons {
    padding: 2px 34px 2px 2px;

    .kiwi-button--small {
        border: 1px solid grey;
    }
}
</style>
