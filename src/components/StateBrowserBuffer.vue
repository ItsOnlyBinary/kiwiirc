<template>
    <div
        class="kiwi-statebuffer"
        :class="{
            'kiwi-statebuffer--joined': !buffer.isChannel() || buffer.joined,
            'kiwi-statebuffer--active': isActiveBuffer,
            'kiwi-statebuffer--unread': unreadCount > 0,
            'kiwi-statebuffer--highlight': buffer.flag('highlight'),
        }"
        :data-buffer="buffer.name.toLowerCase()"
    >
        <div class="kiwi-statebuffer-header" role="button" @click="$emit('selected')">
            <svg-icon v-if="buffer.isSpecial()" icon="fa-regular fa-star" />
            <AwayStatusIndicator
                v-else-if="buffer.isQuery() && awayNotifySupported()"
                :network="network"
                :user="network.userByName(buffer.name)"
            />
            <span class="kiwi-statebuffer-name">{{ buffer.name }}</span>
            <div class="kiwi-statenetwork-button" role="button" @click.stop="clickCloseBuffer">
                <span class="kc--hidden">99+</span>
                <span v-if="unreadCount > 0" class="kiwi-statenetwork-button-count">
                    {{ unreadCount > 99 ? '99+': unreadCount }}
                </span>
                <svg-icon icon="fa-solid fa-xmark" class="kiwi-statenetwork-button-icon" />
            </div>
        </div>
        <TransitionExpand>
            <div v-if="showPromptClose" class="kiwi-statebrowser-prompt">
                <InputConfirm
                    :label="
                        buffer.isChannel()
                            ? $t('prompt_leave_channel')
                            : $t('prompt_close_query')
                    "
                    @submit="clickCloseBuffer"
                />
            </div>
        </TransitionExpand>
    </div>
</template>

<script setup>
import { computed, inject } from 'vue';

import AwayStatusIndicator from '@/components/AwayStatusIndicator';

import getState from '@/libs/state';
import BufferState from '@/libs/state/BufferState';

defineEmits(['selected']);

const activePrompt = inject('StateBrowserActivePrompt');

const { buffer } = defineProps({
    buffer: {
        type: BufferState,
        required: true,
    },
});

const network = buffer.getNetwork();
const isActiveBuffer = computed(() => buffer === getState().getActiveBuffer());
const awayNotifySupported = () => network.value.ircClient.network.cap.isEnabled('away-notify');

const unreadCount = computed(() => {
    if (buffer.setting('hide_message_counts')) {
        return 0;
    }
    return buffer.flag('unread');
});

const showPromptClose = computed(() => activePrompt.type === 'buffer' && activePrompt.value === buffer);
const clickCloseBuffer = (result) => {
    if (result === 'yes') {
        getState().removeBuffer(buffer);
        return;
    }

    const setting = buffer.setting('prompt_leave');
    if (setting === 'none' || (
        setting !== 'all' && (
            (buffer.isChannel() && setting !== 'channels') ||
            (buffer.isQuery() && setting !== 'queries') ||
            (buffer.isSpecial() && setting !== 'queries')
        )
    )) {
        // Prompt feature is disabled, just close the buffer
        getState().removeBuffer(buffer);
        return;
    }

    if (showPromptClose.value) {
        // Prompt is currently visible so close it
        activePrompt.clear();
    } else {
        activePrompt.set('buffer', buffer);
    }
};
</script>

<style lang="scss">
@use '/src/res/styles/uiFunctions' as ui;

.kiwi-statebuffer {
    &-header {
        display: flex;
        column-gap: 8px;
        align-items: center;
        padding: 6px 8px;
        cursor: pointer;
        border-left: 3px solid transparent;

        .kiwi-statenetwork-button {
            padding: 2px 4px;

            .kiwi-statebuffer--unread & {
                background-color: var(--brand-neutral);

                &-count {
                    opacity: 1;
                }

                &-icon {
                    opacity: 0;
                }
            }

            .kiwi-statebuffer--highlight & {
                background-color: var(--brand-negative);
            }
        }

        &:hover .kiwi-statenetwork-button {
            background-color: initial;

            &-count {
                opacity: 0;
            }

            &-icon {
                opacity: 1;
            }

            &:hover {
                background-color: var(--brand-negative);
            }
        }
    }

    &--active &-header {
        background-color: rgba(128, 128, 128, 0.08);
        border-left-color: var(--brand-primary);

        .kiwi-statenetwork-button-icon {
            opacity: 1;
        }
    }

    &-name {
        flex-grow: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 600;
    }
}
</style>
