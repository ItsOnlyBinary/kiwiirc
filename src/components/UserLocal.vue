<template>
    <div
        class="kiwi-userlocal"
        :class="{
            'kiwi-userlocal--compact': !showInfo,
            [!showEdit ? 'kiwi-userlocal--extended' : 'kiwi-userlocal--edit' ]: showInfo,
        }"
    >
        <div v-if="!showInfo" class="kiwi-userlocal-container" @click="toggleInfo">
            <AwayStatusIndicator
                v-if="network && network.state === 'connected'"
                :network="network"
                :user="user"
            />
            <template v-if="user">
                <span class="kiwi-nick">
                    {{ user.nick }}
                </span>
                <svg-icon icon="fa-solid fa-caret-up" />
            </template>
        </div>
        <div v-else-if="!showEdit" ref="container" v-resizeobserver="updateHeight" class="kiwi-userlocal-container">
            <div class="kiwi-userlocal-top">
                <div class="kiwi-userlocal-nick">
                    <AwayStatusIndicator
                        v-if="network && network.state === 'connected'"
                        :network="network"
                        :user="user"
                    />
                    <span class="kiwi-nick">
                        {{ user.nick }}
                    </span>
                </div>
                <div class="kiwi-userlocal-buttons">
                    <svg-icon icon="fa-solid fa-user" @click="openProfile()" />
                    <svg-icon icon="fa-solid fa-pencil" @click="openEdit()" />
                    <svg-icon icon="fa-solid fa-xmark" @click="toggleInfo()" />
                </div>
            </div>
            <div class="kiwi-userlocal-host">
                {{ user.username }}@&ZeroWidthSpace;{{ user.host }}
                <template v-if="modeString">
                    (&nbsp;{{ modeString }}&nbsp;)
                </template>
            </div>
        </div>
        <div v-else class="kiwi-userlocal-container">
            <div v-if="errorMessage" class="kiwi-userlocal-error">{{ errorMessage }}</div>
            <input-prompt
                v-focus
                :label="$t('enter_new_nick')"
                :block="true"
                @submit="startNickChange"
                @cancel="closeNickChange"
            />
        </div>
    </div>
</template>
<script setup>
import { computed, ref, useTemplateRef } from 'vue';

import getState from '@/libs/state';
import useListeners from '@/libs/composables/useListeners';
import NetworkState from '@/libs/state/NetworkState';
import * as TextFormatting from '@/helpers/TextFormatting';

import AwayStatusIndicator from './AwayStatusIndicator';

const { network } = defineProps({
    network: {
        type: NetworkState,
    },
});

const user = computed(() => network.currentUser());

const modeString = computed(() => {
    const modes = user.value.modes;
    if (!modes.length) {
        return '';
    }

    return modes.reduce((acc, item) => acc + item.mode, '+');
});

const containerElement = useTemplateRef('container');
const maxHeight = ref(0);
const showInfo = ref(false);
const showEdit = ref(false);
const toggleInfo = () => {
    showInfo.value = !showInfo.value;
};

const openProfile = () => {
    getState().$emit('userbox.show', user.value);
};

const openEdit = () => {
    showEdit.value = !showEdit.value;
};

const updateHeight = () => {
    maxHeight.value = containerElement.value.getBoundingClientRect().height - 10 + 'px';
};

const eventListeners = useListeners();
const errorMessage = ref('');

const closeNickChange = () => {
    eventListeners.clearAll();
    showEdit.value = false;
};

const listenForNickEvents = (done) => {
    eventListeners.listen(network.ircClient, 'nick', (event) => {
        // eslint-disable-next-line no-unreachable
        if (event.new_nick !== user.value.nick) {
            return;
        }
        closeNickChange();
    });
    eventListeners.listen(network.ircClient, 'nick in use', (event) => {
        errorMessage.value = TextFormatting.t('error_nick_in_use', { nick: event.nick });
        eventListeners.clearAll();
        done();
    });
    eventListeners.listen(network.ircClient, 'nick invalid', (event) => {
        errorMessage.value = TextFormatting.t('error_nick_invalid', { nick: event.nick });
        eventListeners.clearAll();
        done();
    });

    // Maybe the nick change will result in an event we are not listening for above
    const timeout = setTimeout(() => {
        errorMessage.value = TextFormatting.t('error_unexpected');
        eventListeners.clearAll();
        done();
    }, 4000);
    eventListeners.push(() => clearTimeout(timeout));
};

const startNickChange = (newNick, done) => {
    if (eventListeners.length) {
        // nick change already in progress
        return;
    }

    const newNickClean = newNick.trim();
    if (newNickClean.length === 0) {
        errorMessage.value = TextFormatting.t('error_empty_nick');
        done();
        return;
    }
    if (newNickClean.match(/(^[0-9])|(\s)/)) {
        errorMessage.value = TextFormatting.t('error_no_number');
        done();
        return;
    }
    if (newNickClean === user.value.nick) {
        errorMessage.value = TextFormatting.t('error_nick_in_use', { cleanNewNick: newNickClean });
        done();
        return;
    }
    errorMessage.value = '';
    listenForNickEvents(done);
    network.ircClient.changeNick(newNickClean);
};
</script>
<style lang="scss">
.kiwi-userlocal {
    .kiwi-userlocal-container {
        display: flex;
        min-height: 40px;
        overflow: hidden;
        overflow-wrap: break-word;
    }

    .kiwi-nick {
        max-width: 10vw;
        overflow:hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &.kiwi-userlocal--compact {
        border-top: 1px solid var(--comp-border);

        .kiwi-userlocal-container {
            align-items: center;
            font-weight: 600;
            line-height: 1em;
            cursor: pointer;
        }

        .kiwi-awaystatusindicator {
            margin: 0 8px;
        }

        .svg-inline--fa {
            padding: 4px;
            margin: 0 4px;
        }
    }

    &.kiwi-userlocal--extended,
    &.kiwi-userlocal--edit {
        position: relative;
        width: 300px;
        /* stylelint-disable-next-line value-keyword-case */
        max-height: v-bind(maxHeight);

        .kiwi-userlocal-container {
            position: absolute;
            bottom: 0;
            box-sizing: border-box;
            flex-direction: column;
            width: 300px;
            padding: 8px;
            background-color: white;
            border: 1px solid var(--comp-border);
            border-radius: 0 5px 0 0;
        }

        .kiwi-userlocal-top {
            display: flex;
        }

        .kiwi-userlocal-nick {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: 600;
        }

        .kiwi-userlocal-buttons {
            display: flex;
            column-gap: 2px;
            margin-right: 2px;

            > svg {
                height: 14px;
                padding: 4px;
                cursor: pointer;
                opacity: 0.7;

                &.fa-xmark {
                    height: 20px;
                    padding: 0;
                }

                &:hover {
                    opacity: 1;
                }
            }
        }
    }
}

@media screen and (max-width: 769px) {
    .kiwi-userlocal.kiwi-userlocal--compact {
        .kiwi-nick {
            display: none;
        }

        .kiwi-awaystatusindicator {
            margin: 0 4px 0 8px;
        }

        .svg-inline--fa {
            margin: 0;
        }
    }
}
</style>
