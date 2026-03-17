<template>
    <div class="kiwi-stateactions">
        <div
            class="kiwi-stateactions-button kiwi-stateactions-button--leave"
            title="Leave chat"
            role="button"
            @click.stop="clickLeave"
        >
            <svg-icon icon="fa-solid fa-right-from-bracket" />
        </div>
        <div
            class="kiwi-stateactions-button kiwi-stateactions-button--settings"
            :title="$t('kiwi_settings')"
            role="button"
            @click.stop="clickOpenSettings"
        >
            <svg-icon icon="fa-solid fa-cog" />
        </div>
        <component
            :is="plugin.component"
            v-for="plugin in pluginElements"
            :key="plugin.id"
            v-bind="plugin.props"
            class="kiwi-plugin"
        />
    </div>
    <TransitionExpand>
        <div v-if="activePrompt.type === 'leave'" class="kiwi-statebrowser-prompt">
            <InputConfirm
                :label="$t('prompt_close_query')"
                @submit="onSubmit"
            />
        </div>
        <div v-else-if="activePrompt.type === 'forget'" class="kiwi-statebrowser-prompt">
            <InputConfirm
                :label="$t('prompt_close_query')"
                :buttons="[
                    {
                        id: 'forget',
                        text: '_state_forget',
                        type: 'negative',
                    },
                    {
                        id: 'leave',
                        text: '_close',
                        type: 'neutral',
                    },
                    {
                        id: 'cancel',
                        text: '_cancel',
                        type: 'positive',
                    }
                ]"
                @submit="onSubmit"
            />
        </div>
        <div v-else-if="activePrompt.type === 'state-prompt'" class="kiwi-statebrowser-prompt">
            <component
                :is="activePrompt.component"
                v-bind="activePrompt.componentProps"
            />
        </div>
    </TransitionExpand>
</template>

<script setup>
import { inject } from 'vue';

import getState from '@/libs/state';
import AppSettings from '@/components/AppSettings';
import useListeners from '@/libs/composables/useListeners';
import GlobalApi from '@/libs/GlobalApi';

const activePrompt = inject('StateBrowserActivePrompt');

const eventListeners = useListeners();

eventListeners.listen(getState(), 'statebrowser.prompt', (event) => {
    // TODO
});

const pluginElements = GlobalApi.singleton().stateBrowserButtonPlugins;

const onSubmit = (result) => {
    activePrompt.clear();

    if (['no', 'cancel'].includes(result)) {
        return;
    }

    if (result === 'forget') {
        getState().persistence.forgetState();
    }

    getState().ui.warn_on_exit = false;
    window.location.reload();
};

const clickLeave = () => {
    if (['leave', 'forget'].includes(activePrompt.type)) {
        return;
    }
    if (!getState().persistence.isPersisting) {
        activePrompt.set('leave');
        return;
    }
    activePrompt.set('forget');
};

const clickOpenSettings = () => {
    getState().$emit('active.component.toggle', AppSettings);
};
</script>

<style lang="scss">
@use '/src/res/styles/uiFunctions' as ui;

.kiwi-stateactions {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    max-height: 30px;
    padding: 2px 44px 2px 2px;
    overflow: hidden;

    &-button {
        position: relative;
        box-sizing: border-box;
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        padding: 4px;
        cursor: pointer;
        background-color: rgba(128, 128, 128, 0.3);
        border-radius: 6px;

        &:hover {
            background-color: var(--brand-positive);
        }

        > svg:only-child {
            width: 100%;
            height: 100%;
        }

        &--leave {
            background-color: var(--brand-negative);
        }
    }
}
</style>
