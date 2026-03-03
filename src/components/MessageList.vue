<template>
    <div
        :key="`messagelist-${buffer.name}`"
        ref="messagelist"
        class="kiwi-messagelist"
        :class="{
            'kiwi-messagelist--showtyping': buffer.setting('share_typing'),
        }"
    >
        <transition name="kiwi-messagelist-scrollbtn">
            <button
                v-if="!auto_scroll"
                class="kiwi-messagelist-scroll-bottom"
                @click="scrollToBottom"
            >
                <svg-icon icon="fa-solid fa-angles-down" />
            </button>
        </transition>

        <VList
            ref="scroller"
            v-slot="{ item }"
            :data="messages"
            class="kiwi-messagelist-scroller"
        >
            <template v-if="item.type === 'message'">
                <component
                    :is="item.message.template"
                    v-if="item.message.render() && item.message.template"
                    :key="'template'+item.key"
                    v-bind="item.message.templateProps"
                    :buffer="buffer"
                    :message="item.message"
                    :ml="thisMl"
                    :is-unread="isUnread(item.message)"
                    :is-repeat="item.isRepeat"
                    :is-hover="isHoveringOverMessage(item.message)"
                    :is-info-open="isInfoOpen(item.message)"
                    :is-blur="isBlur(item.message)"
                    @hover-nick="setHoverNick"
                />
                <message-list-message-modern
                    v-else-if="listType === 'modern'"
                    :key="'modern'+item.key"
                    :message="item.message"
                    :ml="thisMl"
                    :is-unread="isUnread(item.message)"
                    :is-repeat="item.isRepeat"
                    :is-hover="isHoveringOverMessage(item.message)"
                    :is-info-open="isInfoOpen(item.message)"
                    :is-blur="isBlur(item.message)"
                    @hover-nick="setHoverNick"
                />
                <message-list-message-inline
                    v-else-if="listType === 'inline'"
                    :key="'inline'+item.key"
                    :message="item.message"
                    :ml="thisMl"
                    :is-unread="isUnread(item.message)"
                    :is-repeat="item.isRepeat"
                    :is-hover="isHoveringOverMessage(item.message)"
                    :is-info-open="isInfoOpen(item.message)"
                    :is-blur="isBlur(item.message)"
                    @hover-nick="setHoverNick"
                />
                <message-list-message-compact
                    v-else-if="listType === 'compact'"
                    :key="'compact'+item.key"
                    :message="item.message"
                    :ml="thisMl"
                    :is-unread="isUnread(item.message)"
                    :is-repeat="item.isRepeat"
                    :is-hover="isHoveringOverMessage(item.message)"
                    :is-info-open="isInfoOpen(item.message)"
                    :is-blur="isBlur(item.message)"
                    @hover-nick="setHoverNick"
                />
            </template>

            <!-- Day separator -->
            <div
                v-else-if="item.type === 'day'"
                :key="'b'+item.key"
                class="kiwi-messagelist-seperator"
            >
                <span>{{ (new Date(item.date)).toDateString() }}</span>
            </div>

            <!-- Scrollback loader (top of list) -->
            <div v-else-if="item.type === 'scrollback'" :key="'a'+item.key" class="kiwi-messagelist-scrollback">
                <a
                    v-if="!buffer.flag('is_requesting_chathistory')"
                    class="u-link"
                    @click="buffer.requestScrollback()"
                >
                    {{ $t('messages_load') }}
                </a>
                <a v-else>{{ $t('messages_loading') }}</a>
            </div>

            <!-- Unread marker -->
            <div
                v-else-if="item.type === 'unread'"
                :key="'c'+item.key"
                class="kiwi-messagelist-seperator"
            >
                <span>{{ $t('unread_messages') }}</span>
            </div>

            <div v-if="item.type === 'joining'" :key="'e'+item.key" class="kiwi-messagelist-joinloader">
                <LoadingAnimation />
            </div>

            <buffer-key
                v-else-if="item.type === 'bufferkey'"
                :key="'f'+item.key"
                :buffer="buffer"
                :network="buffer.getNetwork()"
            />
        </VList>
    </div>
</template>

<script setup lang="js">
import { computed } from 'vue';
import { VList } from 'virtua/vue';

import NetworkState from '@/libs/state/NetworkState';
import BufferState from '@/libs/state/BufferState';
import MessageListMessageCompact from './MessageListMessageCompact';
import MessageListMessageModern from './MessageListMessageModern';
import MessageListMessageInline from './MessageListMessageInline';
import LoadingAnimation from './LoadingAnimation';
import BufferKey from './BufferKey';

import * as bufferTools from '@/libs/bufferTools';

const { network, buffer } = defineProps({
    network: {
        type: NetworkState,
        required: true,
    },
    buffer: {
        type: BufferState,
        required: true,
    },
});

const shouldShowHistoryTools = computed(() => {
    if (network.state !== 'connected') {
        return false;
    }

    if (!buffer.isChannel() && !buffer.isQuery()) {
        return false;
    }

    const isSupported = network.ircClient.chathistory.isSupported();
    const isAvailable = buffer.flags.chathistory_available;

    return isSupported && isAvailable;
});

const shouldShowDayMarkers = (messages) => {
    let dayNum = null;
    return messages.some((m) => {
        if (dayNum == null) {
            dayNum = m.day_num;
        }
        return (m.day_num != null && m.day_num !== dayNum);
    });
};

const shouldShowUnreadMarker = (messages, idx) => {
    const lastRead = buffer.last_read;
    if (!lastRead || idx <= 1) {
        return false;
    }

    const current = messages[idx];
    const previous = messages[idx - 1];

    if (previous.time < lastRead && current.time > lastRead) {
        return true;
    }

    return false;
};

const isRepeat = (messages, idx) => {
    if (idx <= 1) {
        return false;
    }

    const current = messages[idx];
    const previous = messages[idx - 1];

    if (current.nick !== previous.nick) {
        return false;
    }

    if (current.type !== previous.type) {
        return false;
    }

    if (current.type === 'traffic') {
        return false;
    }

    if (current.time - previous.time >= 60000) {
        return false;
    }

    return true;
};

const messages = computed(() => {
    const items = [];
    const embeds = [];
    const dayMarkers = [];

    const orderedMsgs = bufferTools.orderedMessages(buffer);
    const showDayMarkers = shouldShowDayMarkers(orderedMsgs);
    if (shouldShowHistoryTools.value) {
        items.push({ type: 'scrollback', key: 'scrollback' });
    }

    let dayLast = null;
    orderedMsgs.forEach((message, idx) => {
        if (showDayMarkers && (!dayLast || message.day_num !== dayLast)) {
            dayLast = message.day_num;

            dayMarkers.unshift(items.length);
            items.push({
                type: 'day',
                key: `day-${message.day_num}`,
                date: message.time,
            });
        }

        if (shouldShowUnreadMarker(orderedMsgs, idx)) {
            items.push({
                type: 'unread',
                key: 'unread',
            });
        }

        if (message.embed.payload) {
            embeds.push(items.length);
        }

        items.push({
            type: 'message',
            key: `msg-${message.id}`,
            message,
            idx,
            isRepeat: isRepeat(orderedMsgs, idx),
        });
    });

    return {
        items,
        embeds,
        dayMarkers,
    };
});

</script>

<style lang="scss">
.kiwi-messagelist {
    // todo
}
</style>
