<template>
    <div
        :data-name="buffer.name.toLowerCase()"
        :class="{
            'kiwi-statebrowser-buffer--active': isActiveBuffer,
            'kiwi-statebrowser-buffer--notjoined': buffer.isChannel() &&
                !buffer.joined
        }"
        class="kiwi-statebrowser-buffer"
    >
        <div class="kiwi-statebrowser-buffer-inner">
            <away-status-indicator
                v-if="buffer.isQuery() && awayNotifySupported"
                :network="network" :user="network.userByName(buffer.name)"
            />
            <div
                class="kiwi-statebrowser-buffer-header"
                @click="$emit('selected')"
            >{{ buffer.name }}</div>
            <div
                v-if="buffer.flags.unread && showMessageCounts"
                class="kiwi-statebrowser-unread"
                :class="{ 'kiwi-statebrowser-unread--highlight': buffer.flags.highlight }"
            >{{ buffer.flags.unread > 999 ? "999+": buffer.flags.unread }}</div>
            <div
                class="kiwi-statebrowser-button-close"
                @click="maybePromptClose()"
            >
                <i class="fa fa-times" aria-hidden="true" />
            </div>
        </div>
        <transition-expand>
            <div v-if="showPromptClose" class="kiwi-statebrowser-buffer-close">
                <span>{{ $t('prompt_leave_channel') }}</span>
                <input-confirm
                    :flip-connotation="true"
                    class="kiwi-statebrowser-buffer-close-prompt"
                    @ok="closeBuffer()"
                    @submit="maybePromptClose()"
                />
            </div>
        </transition-expand>
    </div>
</template>

<script>

import AwayStatusIndicator from './AwayStatusIndicator';

export default {
    components: {
        AwayStatusIndicator,
    },
    props: ['buffer', 'activePrompt'],
    computed: {
        network() {
            return this.buffer.getNetwork();
        },
        isActiveBuffer() {
            let buffer = this.buffer;
            return (
                buffer.networkid === this.$state.ui.active_network &&
                buffer.name === this.$state.ui.active_buffer
            );
        },
        awayNotifySupported() {
            return this.network.ircClient.network.cap.isEnabled('away-notify');
        },
        showMessageCounts() {
            return !this.buffer.setting('hide_message_counts');
        },
        showPromptClose() {
            return (this.activePrompt &&
                this.activePrompt.type === 'buffer' &&
                this.activePrompt.value === this.buffer);
        },
    },
    methods: {
        maybePromptClose() {
            if (!this.buffer.setting('prompt_leave')) {
                // Prompt feature is disabled, just close the buffer
                this.closeBuffer();
                return;
            }

            console.log('maybePromptClose', this.showPromptClose, this.activePrompt);

            const prompt = this.activePrompt;
            if (this.showPromptClose) {
                // Prompt is currently visible so close it
                prompt.type = undefined;
                prompt.value = undefined;
            } else {
                prompt.type = 'buffer';
                prompt.value = this.buffer;
            }
        },
        closeBuffer() {
            this.$state.removeBuffer(this.buffer);
        },
    },
};
</script>

<style lang="less">
.kiwi-statebrowser-buffer {
    @buffer_padding: 10px;

    cursor: pointer;

    &:hover {
        .kiwi-statebrowser-buffer-header {
            text-decoration: underline;
        }

        .kiwi-statebrowser-button-close {
            display: block;
        }

        .kiwi-statebrowser-unread {
            display: none;
        }
    }

    .kiwi-statebrowser-buffer-inner {
        display: flex;
        align-items: center;
        padding: 0.2em @buffer_padding 0.2em @buffer_padding;
        cursor: pointer;

        &::before {
            font-family: fontAwesome, Helvetica, Arial, Verdana, Tahoma, sans-serif;
            margin-right: 8px;
        }

        .kiwi-awaystatusindicator {
            margin-right: 8px;
        }

        .kiwi-statebrowser-buffer-header {
            flex-grow: 1;
            font-weight: 600;
        }
    }

    &.kiwi-statebrowser-buffer--active {
        background-color: rgba(128, 128, 128, 0.1);

        .kiwi-statebrowser-buffer-inner {
            @active_border: 3px;

            border-left: @active_border solid var(--brand-primary);
            padding-left: @buffer_padding - @active_border;
        }

        .kiwi-statebrowser-button-close {
            display: block;
        }

        .kiwi-statebrowser-unread {
            display: none;
        }
    }
}

.kiwi-statebrowser-buffer[data-name^="*"] .kiwi-statebrowser-buffer-inner::before {
    content: '\f006';
}
</style>
