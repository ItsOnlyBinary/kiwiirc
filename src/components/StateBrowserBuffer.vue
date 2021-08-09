<template>
    <div class="kiwi-statebrowser-channel-wrapper">
        <div
            :data-name="buffer.name.toLowerCase()"
            :class="{
                'kiwi-statebrowser-channel-active': isActiveBuffer(),
                'kiwi-statebrowser-channel-notjoined': buffer.isChannel() &&
                    !buffer.joined
            }"
            class="kiwi-statebrowser-channel"
        >
            <div
                class="kiwi-statebrowser-channel-name"
                @click="$emit('selected')"
            >
                <away-status-indicator
                    v-if="buffer.isQuery() && awayNotifySupported()"
                    :network="network" :user="network.userByName(buffer.name)"
                />{{ buffer.name }}
            </div>
            <div class="kiwi-statebrowser-buffer-actions">
                <div class="kiwi-statebrowser-channel-labels">
                    <div
                        v-if="buffer.flags.unread && showMessageCounts(buffer)"
                        :class="[
                            buffer.flags.highlight ?
                                'kiwi-statebrowser-channel-label--highlight' :
                                ''
                        ]"
                        class="kiwi-statebrowser-channel-label"
                    >
                        {{ buffer.flags.unread > 999 ?
                            "999+": buffer.flags.unread }}
                    </div>
                </div>

                <div
                    class="kiwi-statebrowser-close-button"
                    @click="maybePromptClose()"
                >
                    <i class="fa fa-times" aria-hidden="true" />
                </div>
            </div>
        </div>
        <transition-expand>
            <div v-if="showPrompt" class="kiwi-statebrowser-buffer-close">
                <span>{{ $t('prompt_leave_channel') }}</span>
                <input-confirm
                    :flip-connotation="true"
                    class="kiwi-statebrowser-buffer-close-prompt"
                    @ok="closeBuffer()"
                    @submit="showPrompt=false"
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
    props: ['buffer'],
    data() {
        return {
            showPrompt: false,
        };
    },
    computed: {
        network() {
            return this.buffer.getNetwork();
        },
    },
    methods: {
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
        showMessageCounts(buffer) {
            return !this.buffer.setting('hide_message_counts');
        },
        maybePromptClose() {
            if (this.buffer.setting('prompt_leave')) {
                this.showPrompt = !this.showPrompt;
                return;
            }

            this.closeBuffer();
        },
        closeBuffer() {
            this.$state.removeBuffer(this.buffer);
        },
    },
};
</script>

<style>
.kiwi-statebrowser-channel-wrapper {
    width: 100%;
    box-sizing: border-box;
}
</style>
