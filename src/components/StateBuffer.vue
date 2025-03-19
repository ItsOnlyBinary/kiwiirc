<template>
    <div
        class="kiwi-statebuffer"
        :data-buffer="buffer.name.toLowerCase()"
        :data-joined="!buffer.isChannel() || buffer.joined"
        :data-active="isActiveBuffer"
        :data-unread="unreadCount > 0"
    >
        <div class="kiwi-buffer" @click="$emit('selected')">
            <svg-icon v-if="buffer.isSpecial()" icon="fa-regular fa-star" />
            <AwayStatusIndicator
                v-else-if="buffer.isQuery() && awayNotifySupported()"
                :network="network" :user="network.userByName(buffer.name)"
            />
            <span class="kiwi-buffer--name">{{ buffer.name }}</span>
            <div class="kiwi-statebuffer--button" @click.stop="clickClose">
                <span class="kiwi--width">99+</span>
                <span v-if="unreadCount > 0" class="kiwi--count">
                    {{ unreadCount > 99 ? '99+': unreadCount }}
                </span>
                <svg-icon icon="fa-solid fa-xmark" />
            </div>
        </div>
        <transition-expand>
            <div v-if="showPromptClose" class="kiwi-statebuffer--prompt">
                <span>{{
                    buffer.isChannel()
                        ? $t('prompt_leave_channel')
                        : $t('prompt_close_query')
                }}</span>
                <input-confirm
                    :flip-connotation="true"
                    @ok="bufferClose()"
                    @submit="clickClose()"
                />
            </div>
        </transition-expand>
    </div>
</template>

<script setup>
import { computed } from 'vue';

import AwayStatusIndicator from '@/components/AwayStatusIndicator';

import getState from '@/libs/state';
import BufferState from '@/libs/state/BufferState';

// eslint-disable-next-line no-unused-vars
const { buffer, activePrompt } = defineProps({
    buffer: {
        type: BufferState,
        required: true,
    },
    activePrompt: {
        type: Object,
        required: true,
    },
});

const isActiveBuffer = computed(() => buffer === getState().getActiveBuffer());

const unreadCount = computed(() => {
    if (buffer.setting('hide_message_counts')) {
        return 0;
    }
    return buffer.flag('unread');
});
const showPromptClose = computed(() => activePrompt.type === 'buffer' && activePrompt.value === buffer);
const bufferClose = () => getState().removeBuffer(buffer);
const clickClose = () => {
    const setting = buffer.setting('prompt_leave');
    if (setting === 'none' || (
        setting !== 'all' && (
            (buffer.isChannel() && setting !== 'channels') ||
            (buffer.isQuery() && setting !== 'queries') ||
            (buffer.isSpecial() && setting !== 'queries')
        )
    )) {
        // Prompt feature is disabled, just close the buffer
        bufferClose();
        return;
    }
    if (showPromptClose.value) {
        // Prompt is currently visible so close it
        activePrompt.type = undefined;
        activePrompt.value = undefined;
    } else {
        activePrompt.type = 'buffer';
        activePrompt.value = buffer;
    }
};

</script>

<style lang="scss">
.kiwi-statebuffer {
    .kiwi-buffer {
        display: flex;
        column-gap: 8px;
        align-items: center;
        padding: 6px 8px;
        border-left: 3px solid transparent;
    }

    &[data-active='true'] .kiwi-buffer {
        border-left-color: var(--brand-primary);
    }

    .kiwi-buffer--name {
        flex-grow: 1;
    }
}

.kiwi-statebuffer--button {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2px 4px;
    font-size: 0.8em;
    background-color: transparent;
    border-radius: 6px;
    opacity: 0;
    transition: all 0.3s;

    .kiwi--width {
        visibility: hidden;
    }

    .kiwi--count {
        position: absolute;
    }

    > svg {
        position: absolute;
        display: none;
        height: 80%;
    }

    .kiwi-statebuffer[data-unread='true'] & {
        background-color: var(--brand-primary);
        opacity: 1;
    }

    .kiwi-statebuffer:hover &,
    .kiwi-statebuffer[data-active='true'] & {
        background-color: transparent;
        opacity: 1;

        .kiwi--count {
            display: none;
        }

        > svg {
            display: block;
        }
    }
}

.kiwi-statebuffer .kiwi-statebuffer--button:hover {
    background-color: red;
}
</style>
