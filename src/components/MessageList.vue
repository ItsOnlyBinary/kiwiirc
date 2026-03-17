<template>
    <div
        :key="`messagelist-${buffer.name}`"
        ref="scrollerEl"
        v-resizeobserver="onListResize"
        class="kiwi-messagelist"
        :class="{
            'kiwi-messagelist--smoothscroll': smooth_scroll,
            'kiwi-messagelist--showtyping': buffer.setting('share_typing'),
        }"
        @click.self="onListClick"
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
            ref="vlist"
            v-slot="{ item }"
            :data="messages.items"
            :item-props="itemProps"
            :keep-mounted="keepMounted"
            class="kiwi-messagelist-vlist"
            @scroll="onVListScroll"
        >
            <!-- Scrollback loader (top of list) -->
            <div v-if="item.type === 'scrollback'" :key="'a'+item.key" class="kiwi-messagelist-scrollback">
                <a
                    v-if="!buffer.flag('is_requesting_chathistory')"
                    class="u-link"
                    @click="buffer.requestScrollback()"
                >
                    {{ $t('messages_load') }}
                </a>
                <a v-else>{{ $t('messages_loading') }}</a>
            </div>

            <!-- Day separator -->
            <div
                v-else-if="item.type === 'day'"
                :key="'b'+item.key"
                class="kiwi-messagelist-seperator"
            >
                <span>{{ (new Date(item.date)).toDateString() }}</span>
            </div>

            <!-- Unread marker -->
            <div
                v-else-if="item.type === 'unread'"
                :key="'c'+item.key"
                class="kiwi-messagelist-seperator"
            >
                <span>{{ $t('unread_messages') }}</span>
            </div>

            <!-- Message item -->
            <div
                v-else-if="item.type === 'message'"
                :key="'d'+item.key"
                :class="[
                    'kiwi-messagelist-item',
                    selectedMessages[item.message.id]
                        ? 'kiwi-messagelist-item--selected'
                        : '',
                ]"
            >
                <component
                    :is="item.message.template"
                    v-if="item.message.render() && item.message.template"
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
                    :message="item.message"
                    :ml="thisMl"
                    :is-unread="isUnread(item.message)"
                    :is-repeat="item.isRepeat"
                    :is-hover="isHoveringOverMessage(item.message)"
                    :is-info-open="isInfoOpen(item.message)"
                    :is-blur="isBlur(item.message)"
                    @hover-nick="setHoverNick"
                />
            </div>

            <!-- Joining loader (bottom of list) -->
            <transition v-else-if="item.type === 'joining'" name="kiwi-messagelist-joinloadertrans">
                <div v-if="item.type === 'joining'" :key="'e'+item.key" class="kiwi-messagelist-joinloader">
                    <LoadingAnimation />
                </div>
            </transition>

            <!-- Channel key prompt (bottom of list) -->
            <buffer-key
                v-else-if="item.type === 'bufferkey'"
                :key="'f'+item.key"
                :buffer="buffer"
                :network="buffer.getNetwork()"
            />
        </VList>
    </div>
</template>

<script>
'kiwi public';

import { debounce } from 'lodash';
import { watch, nextTick } from 'vue';
import strftime from 'strftime';
import { VList } from 'virtua/vue';
import Logger from '@/libs/Logger';
import * as bufferTools from '@/libs/bufferTools';
import MessageListMessageCompact from './MessageListMessageCompact';
import MessageListMessageModern from './MessageListMessageModern';
import MessageListMessageInline from './MessageListMessageInline';
import LoadingAnimation from './LoadingAnimation';
import BufferKey from './BufferKey';

let log = Logger.namespace('MessageList.vue');

// If we're scrolled up more than this many pixels, don't auto scroll down to the bottom
// of the message list
const BOTTOM_SCROLL_MARGIN = 60;

export default {
    components: {
        VList,
        MessageListMessageModern,
        MessageListMessageCompact,
        MessageListMessageInline,
        LoadingAnimation,
        BufferKey,
    },
    props: ['buffer'],
    data() {
        return {
            smooth_scroll: false,
            auto_scroll: true,
            force_smooth_scroll: null,
            hover_nick: '',
            message_info_open: null,
            selectedMessages: Object.create(null),
            activeSeparator: null,
        };
    },
    computed: {
        showRealNames() {
            return this.buffer.setting('show_realnames');
        },
        showTimestamps() {
            return this.buffer.setting('show_timestamps');
        },
        thisMl() {
            return this;
        },
        shouldAutoEmbed() {
            if (this.buffer.isChannel() && this.buffer.setting('inline_link_auto_previews')) {
                return true;
            }
            if (this.buffer.isQuery() && this.buffer.setting('inline_link_auto_previews_query')) {
                return true;
            }
            return false;
        },
        listType() {
            if (this.$state.setting('messageLayout')) {
                log.info(
                    'Deprecation Warning: The config option \'messageLayout\' has been moved to buffers.messageLayout'
                );
            }
            return this.buffer.setting('messageLayout') || this.$state.setting('messageLayout');
        },
        useExtraFormatting() {
            // Enables simple markdown formatting
            return this.buffer.setting('extra_formatting');
        },
        shouldShowHistoryTools() {
            if (this.buffer.getNetwork().state !== 'connected') {
                return false;
            }

            if (!this.buffer.isChannel() && !this.buffer.isQuery()) {
                return false;
            }

            const isSupported = this.buffer.getNetwork().ircClient.chathistory.isSupported();
            const isAvailable = this.buffer.flags.chathistory_available;

            return isSupported && isAvailable;
        },
        shouldRequestChannelKey() {
            return this.buffer.getNetwork().state === 'connected' &&
                this.buffer.isChannel() &&
                this.buffer.flags.channel_badkey;
        },
        ourNick() {
            return this.buffer ?
                this.buffer.getNetwork().nick :
                '';
        },
        messages() {
            const items = [];
            const embeds = [];
            const dayMarkers = [];

            const orderedMsgs = bufferTools.orderedMessages(this.buffer);
            const showDayMarkers = this.shouldShowDayMarkers(orderedMsgs);

            if (this.shouldShowHistoryTools) {
                items.push({ type: 'scrollback', key: 'scrollback' });
            }

            let dayLast = null;
            orderedMsgs.forEach((message, msgIdx) => {
                if (showDayMarkers && (!dayLast || message.day_num !== dayLast)) {
                    dayLast = message.day_num;
                    dayMarkers.unshift(items.length);
                    items.push({
                        type: 'day',
                        key: `day-${message.day_num}`,
                        date: message.time,
                    });
                }

                if (this.shouldShowUnreadMarker(orderedMsgs, msgIdx)) {
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
                    msgIdx,
                    isRepeat: this.isRepeat(orderedMsgs, msgIdx),
                });
            });

            // Footer items
            if (this.shouldShowJoiningLoader) {
                items.push({ type: 'joining', key: 'joining' });
            }
            if (this.shouldRequestChannelKey) {
                items.push({ type: 'bufferkey', key: 'bufferkey' });
            }

            return { items, embeds, dayMarkers };
        },
        keepMounted() {
            return this.activeSeparator !== null
                ? this.messages.embeds.concat(this.activeSeparator)
                : this.messages.embeds;
        },

        shouldShowJoiningLoader() {
            return this.buffer.isChannel() &&
                this.buffer.enabled &&
                !this.buffer.joined &&
                this.buffer.getNetwork().state === 'connected';
        },
    },
    watch: {
        buffer(newBuffer, oldBuffer) {
            if (oldBuffer) {
                oldBuffer.isMessageTrimming = true;
            }

            if (!newBuffer) {
                return;
            }

            this.message_info_open = null;

            if (this.buffer.getNetwork().state === 'connected') {
                newBuffer.flags.has_opened = true;
            }

            this.auto_scroll = true;
            this.force_smooth_scroll = false;
            nextTick(() => {
                this.scrollToBottom();
            });
        },
    },
    created() {
        this.setHoverNick = debounce(
            (nick) => {
                this.hover_nick = nick;
            },
            600,
            {
                maxWait: 600,
                leading: true,
                trailing: true,
            }
        );
    },
    mounted() {
        this.addCopyListeners();

        nextTick(() => {
            this.scrollToBottom();
        });

        // Watch message_count to trigger auto-scroll when new messages arrive.
        // With virtua we don't need a separate ResizeObserver for content height changes —
        // virtua measures each item internally via its own ResizeObserver, and
        // scrollToIndex will always land at the true bottom.
        watch(() => this.buffer.message_count, () => {
            this.checkScrollingState();
            nextTick(() => {
                this.maybeScrollToBottom();
            });
        }, { deep: true });

        this.listen(this.$state, 'mediaviewer.opened', () => {
            nextTick(this.maybeScrollToBottom.apply(this));
        });

        this.listen(this.$state, 'messagelist.scrollto', (opt) => {
            if (opt && opt.id) {
                this.maybeScrollToId(opt.id);
            }
        });
    },
    methods: {
        isUnread(message) {
            return this.buffer.last_read && message.time > this.buffer.last_read;
        },
        shouldShowDayMarkers(messages) {
            let dayNum = null;
            return messages.some((m) => {
                if (dayNum == null) {
                    dayNum = m.day_num;
                }
                return m.day_num != null && m.day_num !== dayNum;
            });
        },
        isRepeat(messages, idx) {
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
        },
        isHoveringOverMessage(message) {
            return message.nick && message.nick.toLowerCase() === this.hover_nick;
        },
        isInfoOpen(message) {
            return this.message_info_open === message;
        },
        isBlur(message) {
            return this.message_info_open && this.message_info_open !== message;
        },
        toggleMessageInfo(message) {
            if (!message) {
                this.message_info_open = null;
            } else if (this.message_info_open === message) {
                // It's already open, so don't do anything
            } else if (this.canShowInfoForMessage(message)) {
                // If in the process of selecting text, don't show the info box
                let sel = window.getSelection();
                if (sel.rangeCount > 0) {
                    let range = sel.getRangeAt(0);
                    if (range && !range.collapsed) {
                        return;
                    }
                }

                this.message_info_open = message;
                nextTick(() => this.maybeScrollToId(message.id));
            }
        },
        shouldShowUnreadMarker(messages, idx) {
            const lastRead = this.buffer.last_read;
            if (!lastRead || idx <= 1) {
                return false;
            }

            const current = messages[idx];
            const previous = messages[idx - 1];

            if (previous.time < lastRead && current.time > lastRead) {
                return true;
            }

            return false;
        },
        itemProps(item) {
            if (this.activeSeparator === null || item.index !== this.activeSeparator) {
                return {};
            }

            return {
                style: {
                    position: 'sticky',
                    top: '-1px',
                    zIndex: 1,
                    backgroundColor: 'var(--brand-default-bg)',
                },
            };
        },
        canShowInfoForMessage(message) {
            let showInfoForTypes = ['privmsg', 'notice', 'action'];
            return showInfoForTypes.indexOf(message.type) > -1;
        },
        bufferSetting(key) {
            return this.buffer.setting(key);
        },
        formatTime(time) {
            return strftime(this.buffer.setting('timestamp_format') || '%T', new Date(time));
        },
        formatTimeFull(time) {
            let format = this.buffer.setting('timestamp_full_format');
            return format ?
                strftime(format, new Date(time)) :
                (new Date(time)).toLocaleString();
        },
        formatMessage(message) {
            return message.toHtml(this);
        },
        isMessageHighlight(message) {
            // Highlighting ourselves when we join or leave a channel is silly
            if (message.type === 'traffic') {
                return false;
            }

            return message.isHighlight;
        },
        userColour(user) {
            if (user && this.bufferSetting('colour_nicknames_in_messages')) {
                return user.getColour();
            }
            return '';
        },
        openUserBox(nick) {
            let user = this.$state.getUser(this.buffer.networkid, nick);
            if (user) {
                this.$state.$emit('userbox.show', user, {
                    buffer: this.buffer,
                });
            }
        },
        onListClick(event) {
            this.toggleMessageInfo();
        },
        onMessageDblClick(event, message) {
            clearTimeout(this.messageClickTmr);

            let dataNick = event.target.getAttribute('data-nick');
            if (!dataNick) {
                return;
            }

            let network = this.buffer.getNetwork();
            let user = network.userByName(dataNick);
            // The user might have left use dataNick as fallback
            let nick = (user && user.nick) ?
                user.nick :
                dataNick;
            this.$state.$emit('input.insertnick', nick);
        },
        onMessageClick(event, message, delay) {
            if (this.message_info_open && this.message_info_open !== message) {
                // Clicking on another message while another info is open, just close the info
                this.toggleMessageInfo();
                event.preventDefault();
                return;
            }

            // Delaying the click for 200ms allows us to check for a second click. ie. double click
            // Quick hack as we only need double click for nicks, nothing else
            if (delay && event.target.getAttribute('data-nick')) {
                clearTimeout(this.messageClickTmr);
                this.messageClickTmr = setTimeout(this.onMessageClick, 200, event, message, false);
                return;
            }

            let isLink = event.target.tagName === 'A';

            let channelName = event.target.getAttribute('data-channel-name');
            if (channelName && isLink) {
                let network = this.buffer.getNetwork();
                this.$state.addBuffer(this.buffer.networkid, channelName);
                network.ircClient.join(channelName);
                this.$state.setActiveBuffer(this.buffer.networkid, channelName);
                return;
            }

            let userNick = event.target.getAttribute('data-nick');
            if (userNick && isLink) {
                this.openUserBox(userNick);
                return;
            }

            let linkElement = event.target.closest('a[data-url]');
            if (linkElement) {
                let url = linkElement.getAttribute('data-url');
                if (this.$state.setting('buffers.inline_link_auto_previews')) {
                    message.embed.type = 'url';
                    message.embed.payload = url;
                } else {
                    this.$state.$emit('mediaviewer.show', url);
                }
                return;
            }

            let avatarElement = event.target.closest('.kiwi-avatar');
            if (avatarElement && avatarElement.dataset.nick) {
                this.openUserBox(avatarElement.dataset.nick);
                return;
            }

            if (this.$state.ui.is_touch && this.$state.setting('buffers.show_message_info')) {
                if (this.canShowInfoForMessage(message) && event.target.nodeName === 'A') {
                    // We show message info boxes on touch screen devices so that the user has an
                    // option to preview the links or do other stuff.
                    event.preventDefault();
                }

                this.toggleMessageInfo(message);
            }
        },
        /**
         * Called from VList's @scroll event (virtua emits scroll as the container scrolls).
         * We derive auto_scroll from how close we are to the bottom.
         */
        onVListScroll() {
            if (!this.$refs.vlist) {
                return;
            }
            const start = this.$refs.vlist.findItemIndex(this.$refs.vlist.scrollOffset);
            this.activeSeparator = this.messages.dayMarkers.find((index) => start >= index) || null;

            this.checkScrollingState();
        },

        checkScrollingState() {
            const vlist = this.$refs.vlist;
            if (!vlist) return;

            // virtua exposes scrollOffset (pixels from top) and scrollSize (total virtual height)
            // The viewport size is the VList element's own clientHeight
            const scrollOffset = vlist.scrollOffset;
            const totalSize = vlist.scrollSize;
            const viewportSize = vlist.$el ? vlist.$el.clientHeight : 0;

            const distanceFromBottom = totalSize - scrollOffset - viewportSize;

            if (distanceFromBottom > BOTTOM_SCROLL_MARGIN) {
                this.auto_scroll = false;
                this.buffer.isMessageTrimming = false;
            } else {
                this.auto_scroll = true;
                this.buffer.isMessageTrimming = true;
            }

            if (this.force_smooth_scroll !== null) {
                this.smooth_scroll = this.force_smooth_scroll;
                this.force_smooth_scroll = null;
            } else {
                this.smooth_scroll = false;
            }
        },
        onListResize(e) {
            // The messagelist or interface has resized or had new content added
            // check if we should auto scroll down to the bottom
            this.maybeScrollToBottom();
        },
        scrollToBottom() {
            const vlist = this.$refs.vlist;
            if (!vlist) return;
            // scrollToIndex with { align: 'end' } snaps to the last item's bottom edge.
            // This is O(1) regardless of list size — virtua knows item positions mathematically.
            // vlist.scrollToIndex(this.flatItems.length - 1, { align: 'end' });
            vlist.scrollTo(Number.MAX_SAFE_INTEGER);
        },
        maybeScrollToBottom() {
            if (this.auto_scroll) {
                this.scrollToBottom();
            }
        },
        /**
         * Scroll to a specific message by id.
         * We find its index in flatItems then use virtua's scrollToIndex.
         */
        maybeScrollToId(id, position = 'middle') {
            const vlist = this.$refs.vlist;
            if (!vlist) return;

            const idx = this.messages.items.findIndex(
                (item) => item.type === 'message' && item.message.id === id
            );
            if (idx === -1) return;

            const alignMap = { top: 'start', middle: 'center', bottom: 'end' };
            const align = alignMap[position] || 'center';

            this.auto_scroll = false;
            vlist.scrollToIndex(idx, { align, smooth: true });
        },
        getSelectedMessages() {
            let sel = document.getSelection();
            let r = sel.getRangeAt(0);
            // VList still renders real DOM nodes for visible items, so querySelector still works
            let messageEls = [...(this.$refs.vlist?.$el || this.$refs.scrollerEl).querySelectorAll('.kiwi-messagelist-message')];
            let selectedMessageEls = messageEls.filter((el) => r.intersectsNode(el));
            return selectedMessageEls;
        },
        restrictTextSelection() {
            document.querySelector('body').classList.add('kiwi-unselectable');
            if (this.$refs.vlist?.$el) this.$refs.vlist.$el.style.userSelect = 'text';
        },
        unrestrictTextSelection() {
            document.querySelector('body').classList.remove('kiwi-unselectable');
            if (this.$refs.vlist?.$el) this.$refs.vlist.$el.style.userSelect = 'auto';
        },
        removeSelections(removeNative = false) {
            this.selectedMessages = Object.create(null);
            let selection = document.getSelection();
            if (removeNative && selection) {
                selection.removeAllRanges();
            }
        },
        addCopyListeners() {
            const LogFormatter = (msg) => {
                let text = '';

                switch (msg.type) {
                case 'privmsg':
                    text = `<${msg.nick}> ${msg.message}`;
                    break;
                case 'nick':
                case 'mode':
                case 'action':
                case 'traffic':
                    text = `${msg.message}`;
                    break;
                default:
                    text = msg.message;
                }
                if (text.length) {
                    return `[${(new Date(msg.time)).toLocaleTimeString({ hour: '2-digit', minute: '2-digit', second: '2-digit' })}] ${text}`;
                }
                return null;
            };

            let copyData = '';
            let selecting = false;
            let selectionChangeOff = null;

            this.listen(document, 'selectstart', (e) => {
                const listEl = this.$refs.vlist?.$el || this.$refs.scrollerEl;
                if (!listEl || !listEl.contains(e.target)) {
                    copyData = '';
                    this.removeSelections();
                    return;
                }
                this.removeSelections();
                selectionChangeOff = this.listen(document, 'selectionchange', onSelectionChange);
            });

            this.listen(document, 'mouseup', (e) => {
                selectionChangeOff && selectionChangeOff();
                this.unrestrictTextSelection();
                if (selecting) {
                    e.preventDefault();
                }
                selecting = false;
            });

            let onSelectionChange = (e) => {
                if (!this.$refs.scrollerEl) {
                    return true;
                }

                copyData = '';
                let selection = document.getSelection();

                const listEl = this.$refs.vlist?.$el || this.$refs.scrollerEl;
                if (!selection
                    || !selection.anchorNode
                    || !listEl
                    || !listEl.contains(selection.anchorNode)) {
                    this.unrestrictTextSelection();
                    this.removeSelections();
                    return true;
                }

                this.removeSelections();
                // Prevent the selection escaping the message list
                this.restrictTextSelection();

                if (selection.rangeCount > 0) {
                    selecting = true;

                    let selectedMesssageEls = this.getSelectedMessages();
                    let selectedMessages = [];
                    selectedMesssageEls.forEach((el) => {
                        let m = this.buffer.messagesObj.messageIds[el.dataset.messageId];
                        if (m) {
                            selectedMessages.push(m);
                        }
                    });

                    // If only 1 message is selected then treat the selection as native text
                    // selection. Most likely copying part of a message only.
                    if (selectedMessages.length === 1) {
                        selectedMessages = [];
                    }

                    this.selectedMessages = Object.create(null);
                    selectedMessages.forEach((m) => {
                        this.selectedMessages[m.id] = m;
                    });

                    // Iterate through the selected messages, format and store as a
                    // string to be used in the copy handler
                    copyData = selectedMessages
                        .sort((a, b) => (a.time > b.time ? 1 : -1))
                        .filter((m) => m.message.trim().length)
                        .map(LogFormatter)
                        .join('\r\n');
                } else {
                    this.unrestrictTextSelection();
                }
                return false;
            };

            this.listen(document, 'copy', (e) => {
                if (!copyData || !copyData.length) {
                    return true;
                }
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(copyData);
                } else {
                    let input = document.createElement('textarea');
                    document.body.appendChild(input);
                    input.innerHTML = copyData;
                    input.select();
                    document.execCommand('copy');
                    document.body.removeChild(input);
                }

                return true;
            });
        },
        // Move a messages embeded content to the main media preview
        openEmbedInPreview(message) {
            // First open the embed in the main media preview
            let embed = message.embed;
            if (embed.type === 'url') {
                this.$state.$emit('mediaviewer.show', embed.payload);
            } else if (embed.type === 'component') {
                this.$state.$emit('mediaviewer.show', {
                    component: embed.payload,
                });
            }

            // Remove the embed from the message
            embed.payload = null;
        },
    },
};
</script>

<style lang="less">

.kiwi-unselectable * {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

div.kiwi-messagelist-item.kiwi-messagelist-item--selected {
    border-left: 7px solid var(--brand-primary);
    transform: translateX(20px);
    transition: transform 0.1s;
}

div.kiwi-messagelist-item.kiwi-messagelist-item--selected .kiwi-messagelist-message {
    border-left-width: 0;
}

.kiwi-messagelist-item.kiwi-messagelist-item--selected .kiwi-messagelist-message *::selection {
    background-color: unset;
    color: unset;
}

.kiwi-unselectable .kiwi-messagelist-scrollback {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

.kiwi-messagelist {
    /* No overflow here — VList owns the scroll container internally.
       This div is a layout-only wrapper that gives VList its height. */
    overflow: hidden;
    box-sizing: border-box;
    position: relative;
    height: 100%;
}

/* VList renders its own div; we make it fill the wrapper completely */
.kiwi-messagelist-vlist {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    overflow-x: hidden;
}

.kiwi-messagelist--showtyping {
    margin-bottom: 25px;
}

.kiwi-messagelist--smoothscroll {
    scroll-behavior: smooth;
}

.kiwi-messagelist-nick,
.kiwi-messagelist-time,
.kiwi-messagelist-body,
.kiwi-messagelist-realname {
    user-select: text;
}

.kiwi-messagelist::-webkit-scrollbar-track {
    border-radius: 10px;
    background: transparent;
}

.kiwi-messagelist::-webkit-scrollbar {
    width: 8px;
    background: transparent;
}

.kiwi-messagelist::-webkit-scrollbar-thumb {
    border-radius: 3px;
}

.kiwi-messagelist-item {
    /* Allow child elements to make use of margins+padding within messagelist items */
    overflow: hidden;
}

.kiwi-messagelist-message {
    padding: 0 10px;

    /* some message highlights add a left border so add a default invisble one in preperation */
    border-left: 3px solid transparent;
    overflow: hidden;
    line-height: 1.5em;
    margin: 0;
}

.kiwi-wrap--monospace .kiwi-messagelist-message,
.kiwi-messagelist-message.kiwi-messagelist-message-help {
    font-family: Consolas, monaco, monospace;
    font-size: 80%;
}

/* Remove the styling for none user messages, as they make the page look bloated */
.kiwi-messagelist-message-mode,
.kiwi-messagelist-message-traffic {
    padding-top: 5px;
    padding-bottom: 5px;
    min-height: 0;
    line-height: normal;
    text-align: left;
}

/* Remove the min height from the message, as again, makes the page look bloated */
.kiwi-messagelist-body {
    min-height: 0;
    text-align: left;
    font-size: 1.05em;
    margin: 0;
    padding: 0;
}

@supports (font-size: round(up, 1.05em, 1px)) and (line-height: round(up, 1.5em, 1px)) {
    .kiwi-messagelist-message {
        line-height: ~'round(up, 1.5em, 1px)';
    }
    .kiwi-messagelist-body {
        font-size: ~'round(up, 1.05em, 1px)';
    }
}

/* Channel messages - e.g 'server on #testing22 ' message and such */
.kiwi-messagelist-message-mode,
.kiwi-messagelist-message-traffic,
.kiwi-messagelist-message-nick {
    margin: 10px 0;
    opacity: 0.85;
    text-align: center;
    border: none;

    &:hover {
        opacity: 1;
    }
}

/* Absolute position the time on these messages so it's not above the message, it looks awful */
.kiwi-messagelist-message-mode .kiwi-messagelist-time,
.kiwi-messagelist-message-traffic .kiwi-messagelist-time {
    position: absolute;
    top: 1px;
    right: 10px;
}

.kiwi-messagelist-message--authorrepeat {
    border-top: none;
}

.kiwi-messagelist-message--authorrepeat .kiwi-messagelist-nick,
.kiwi-messagelist-message--authorrepeat .kiwi-messagelist-time {
    /* Setting the opacity instead visible:none ensures it's still selectable when copying text */
    opacity: 0;
    cursor: default;
}

.kiwi-container--sidebar-drawn .kiwi-messagelist::after {
    content: '';
    z-index: 3;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    opacity: 0.5;
    position: fixed;
    pointer-events: none;
}

.kiwi-container--sidebar-drawn.kiwi-container--no-sidebar .kiwi-messagelist::after {
    width: 0;
    height: 0;
    display: none;
    pointer-events: inherit;
    position: static;
    z-index: 0;
}

.kiwi-messagelist-scrollback {
    text-align: center;
    padding: 5px;
}

.kiwi-messagelist-seperator + .kiwi-messagelist-message {
    border-top: none;
}

.kiwi-messagelist-message--blur {
    opacity: 0.3;
}

.kiwi-messagelist-nick {
    text-align: right;
    font-weight: bold;
    text-overflow: ellipsis;
    overflow: hidden;
    vertical-align: top;
    cursor: pointer;
    padding: 2px 4px;
    word-break: break-all;
}

.kiwi-messagelist-message-traffic .kiwi-messagelist-nick {
    display: none;
}

.kiwi-messagelist-seperator {
    text-align: center;
    display: block;
    margin: 1em auto;
}

.kiwi-messagelist-seperator > span {
    display: inline-block;
    position: relative;
    z-index: 1;
    padding: 0 1em;
    user-select: none;
}

/** Displaying an emoji in a message */
.kiwi-messagelist-emoji {
    height: 1.05em;
    display: inline-block;
    vertical-align: middle;
}

.kiwi-messagelist-emoji--single {
    animation: 0.1s ease-in-out 0s 1 emoji-in;
    height: 2em;
}

@keyframes emoji-in {
    0% {
        transform: scale(0);
    }

    100% {
        transform: scale(1);
    }
}

@supports (width: round(up, 1.3em, 1px)) {
    .kiwi-messagelist-emoji {
        height: ~'round(up, 1.05em, 1px)';
    }
    .kiwi-messagelist-emoji--single {
        height: ~'round(up, 2em, 1px)';
    }
}

/** Message structure */
.kiwi-messagelist-body .kiwi-nick {
    cursor: pointer;
}

.kiwi-messagelist-nick:hover {
    overflow: visible;
    width: auto;
}

/* Topic changes */
.kiwi-messagelist-message-topic {
    border-radius: 5px;
    margin: 18px;
    margin-left: 0;
    padding: 5px;
    text-align: center;
    position: relative;
    min-height: 0;
    display: block;
}

.kiwi-messagelist-message-topic .kiwi-messagelist-body {
    min-height: 0;
    margin: 0;

    &::before {
        display: none;
    }
}

.kiwi-messagelist-message-topic.kiwi-messagelist-message-topic .kiwi-messagelist-time {
    display: none;
}

.kiwi-messagelist-message-topic.kiwi-messagelist-message-topic .kiwi-messagelist-nick {
    display: none;
}

/* Actions */
.kiwi-messagelist-message-action .kiwi-messagelist-message-body {
    font-style: italic;
}

/* Traffic (joins, parts, quits, kicks) */
.kiwi-messagelist-message-traffic.kiwi-messagelist-message-traffic .kiwi-messagelist-nick {
    display: none;
}

.kiwi-messagelist-message-traffic .kiwi-messagelist-body {
    font-style: italic;
}

.kiwi-messagelist-message-action.kiwi-messagelist-message-action .kiwi-messagelist-nick {
    display: none;
}

/* MOTD */
.kiwi-messagelist-message-motd {
    font-family: monospace;
}

.kiwi-messagelist-message.kiwi-messagelist-message--hover,
.kiwi-messagelist-message.kiwi-messagelist-message--highlight,
.kiwi-messagelist-message.kiwi-messagelist-message-traffic--hover {
    position: relative;
}

/* Links */
.kiwi-messagelist-message-linkhandle {
    margin-left: 4px;
    font-size: 0.8em;
}

.kiwi-wrap--touch .kiwi-messagelist-message-linkhandle {
    display: none;
}

.kiwi-messagelist-joinloader {
    margin: 1em auto;
    width: 100px;

    /* the magic number below is the exact ratio of the kiwi logo height/width */
    height: calc (100px * 0.85987261146496815286624203821656);
    overflow: hidden;
}

.kiwi-messagelist-joinloadertrans-enter,
.kiwi-messagelist-joinloadertrans-leave-to {
    height: 0;
    opacity: 0;
}

.kiwi-messagelist-joinloadertrans-enter-to,
.kiwi-messagelist-joinloadertrans-leave {
    height: 150px;
    opacity: 1;
}

.kiwi-messagelist-joinloadertrans-enter-active,
.kiwi-messagelist-joinloadertrans-leave-active {
    transition: height 0.5s, opacity 0.5s;
}

@media screen and (max-width: 700px) {
    .kiwi-messagelist-message {
        margin: 0;
    }
}

.kiwi-messagelist-scroll-bottom {
    position: absolute;
    bottom: 16px;
    right: 20px;
    z-index: 10;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: var(--brand-primary);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    opacity: 0.9;
    transition: opacity 0.15s;

    &:hover {
        opacity: 1;
    }
}

.kiwi-messagelist-scrollbtn-enter-active,
.kiwi-messagelist-scrollbtn-leave-active {
    transition: opacity 0.2s, transform 0.2s;
}

.kiwi-messagelist-scrollbtn-enter-from,
.kiwi-messagelist-scrollbtn-leave-to {
    opacity: 0;
    transform: translateY(8px);
}

</style>
