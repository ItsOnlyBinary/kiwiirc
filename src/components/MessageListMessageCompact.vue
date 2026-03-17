<template>
    <div
        :class="[
            isRepeat
                ? 'kiwi-messagelist-message--authorrepeat'
                : 'kiwi-messagelist-message--authorfirst',
            `kiwi-messagelist-message-${message.type}`,
            message.type_extra
                ? `kiwi-messagelist-message-${message.type}-${message.type_extra}`
                : '',
            ml.isMessageHighlight(message)
                ? 'kiwi-messagelist-message--highlight'
                : '',
            isHover
                ? 'kiwi-messagelist-message--hover'
                : '',
            isUnread
                ? 'kiwi-messagelist-message--unread'
                : '',
            message.nick.toLowerCase() === ml.ourNick.toLowerCase()
                ? 'kiwi-messagelist-message--own'
                : '',
            isInfoOpen
                ? 'kiwi-messagelist-message--info-open'
                : '',
            isBlur
                ? 'kiwi-messagelist-message--blur'
                : '',
            (message.user && userMode(message.user))
                ? `kiwi-messagelist-message--user-mode-${userMode(message.user)}`
                : '',
            staticClass ? staticClass : '',
        ]"
        :data-message-id="message.id"
        :data-nick="(message.nick || '').toLowerCase()"
        class="kiwi-messagelist-message kiwi-messagelist-message--compact"
        @click="ml.onMessageClick($event, message, true)"
        @dblclick="ml.onMessageDblClick($event, message)"
    >
        <div
            v-if="ml.bufferSetting('show_timestamps')"
            :title="ml.formatTimeFull(message.time)"
            class="kiwi-messagelist-time"
        >
            {{ ml.formatTime(message.time) }}
        </div>
        <a
            :style="{ 'color': ml.userColour(message.user) }"
            :class="[
                'kiwi-messagelist-nick',
                (message.user && userMode(message.user))
                    ? `kiwi-messagelist-nick--mode-${userMode(message.user)}`
                    : '',
            ]"
            :data-nick="(message.nick || '').toLowerCase()"
            @mouseover="ml.hover_nick = message.nick.toLowerCase();"
            @mouseout="ml.hover_nick = '';"
        >
            <component
                :is="$options.components.AwayStatusIndicator"
                v-if="message.user"
                :network="getNetwork()"
                :user="message.user"
                :toggle="false"
            />
            <span class="kiwi-messagelist-nick--prefix">
                {{ message.user ? userModePrefix(message.user) : '' }}
            </span>
            {{ message.nick }}
        </a>
        <div
            v-if="message.bodyTemplate
                && message.bodyTemplate.$el
                && ml.isTemplateVue(message.bodyTemplate)"
            v-rawElement="message.bodyTemplate.$el"
            class="kiwi-messagelist-body"
        />
        <component
            :is="message.bodyTemplate"
            v-else-if="message.bodyTemplate"
            v-bind="message.bodyTemplateProps"
            :buffer="ml.buffer"
            :message="message"
            :ml="ml"
            :is-unread="isUnread"
            :is-repeat="isRepeat"
            :is-hover="isHover"
            :is-info-open="isInfoOpen"
            :is-blur="isBlur"
            class="kiwi-messagelist-body"
        />
        <div v-else class="kiwi-messagelist-body" v-html="ml.formatMessage(message)" />

        <component
            :is="$options.components.MessageInfo"
            v-if="ml.message_info_open === message"
            :message="message"
            :buffer="ml.buffer"
            @close="ml.toggleMessageInfo()"
        />

        <div v-if="message.embed.payload && ml.shouldAutoEmbed">
            <component
                :is="$options.components.MediaViewer"
                :url="message.embed.payload"
                :show-pin="true"
                @close="message.embed.payload = ''"
                @pin="ml.openEmbedInPreview(message)"
            />
        </div>
    </div>
</template>

<script>
'kiwi public';

// eslint-plugin-vue's max-len rule reads the entire file, including the CSS. so we can't use this
// here as some of the rules cannot be broken up any smaller
/* eslint-disable max-len */

import MediaViewer from './MediaViewer';
import AwayStatusIndicator from './AwayStatusIndicator';
import MessageInfo from './MessageInfo';

export default {
    components: {
        AwayStatusIndicator,
        MessageInfo,
        MediaViewer,
    },
    props: {
        ml: Object,
        message: Object,
        isUnread: Boolean,
        isRepeat: Boolean,
        isHover: Boolean,
        isInfoOpen: Boolean,
        isBlur: Boolean,
    },
    data() {
        return {
            staticClass: '',
        };
    },
    methods: {
        getNetwork() {
            return this.ml.buffer.getNetwork();
        },
        userMode(user) {
            return this.ml.buffer.userMode(user);
        },
        userModePrefix(user) {
            return this.ml.buffer.userModePrefix(user);
        },
    },
};
</script>

<style lang="less" scoped>

.kiwi-messagelist-message--compact {
    position: relative;
}

.kiwi-messagelist-message--compact .kiwi-messagelist-message-privmsg:hover,
.kiwi-messagelist-message--compact .kiwi-messagelist-message-action:hover,
.kiwi-messagelist-message--compact .kiwi-messagelist-message-notice:hover {
    cursor: pointer;
}

.kiwi-messagelist-message--compact .kiwi-messagelist-message--blur {
    opacity: 0.5;
}

.kiwi-messagelist-message--compact .kiwi-messagelist-nick {
    width: 110px;
    min-width: 110px;
    display: inline-block;
    left: 8px;
    top: -1px;
    position: absolute;
    white-space: nowrap;
}

.kiwi-messagelist-message--compact .kiwi-messagelist-nick:hover {
    width: auto;
}

.kiwi-messagelist-message--compact .kiwi-messagelist-time {
    display: inline-block;
    float: right;
    font-size: 12px;
    opacity: 0.8;
}

.kiwi-messagelist-message--compact .kiwi-messagelist-body {
    display: block;
    white-space: pre-wrap;
    word-wrap: break-word;
    margin-left: 120px;
}

.kiwi-messagelist-message--compact .kiwi-messagelist-body a {
    word-break: break-all;
}

.kiwi-messagelist-message--compact .kiwi-messageinfo {
    padding-left: 130px;
}

//Channel traffic messages
.kiwi-messagelist-message--compact.kiwi-messagelist-message-traffic {
    margin: 0;
    padding: 1px 0;
}

.kiwi-messagelist-message--compact.kiwi-messagelist-message-traffic .kiwi-messagelist-body {
    margin-left: 131px;
}

//Channel topic
.kiwi-messagelist-message--compact.kiwi-messagelist-message-topic {
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    margin: 1em 0;
}

.kiwi-messagelist-message--compact.kiwi-messagelist-message-topic .kiwi-messagelist-body {
    padding-right: 0;
    max-width: 95%;
    margin-left: 20px;
}

//Repeat messages, remove the time and author name
.kiwi-messagelist-message--compact.kiwi-messagelist-message--authorrepeat {
    .kiwi-messagelist-time,
    .kiwi-messagelist-nick {
        display: none;
    }
}

// Traffic messages have an opacity lower than 1, so we do a blanket statment to make sure all
// messages are opacity: 1, rather than just specifying one.
.kiwi-messagelist-message--compact.kiwi-messagelist-message--unread {
    opacity: 1;
}

// Mobile layout (matches this.$state.ui.is_narrow)
@media screen and (max-width: 769px) {
    .kiwi-messagelist-message--compact {
        padding: 5px;
    }

    .kiwi-messagelist-message--compact .kiwi-messagelist-nick {
        display: inline;
        width: auto;
        min-width: auto;
        float: left;
        position: static;
        padding-left: 0;
    }

    .kiwi-messagelist-message--compact .kiwi-messagelist-time {
        text-align: right;
    }

    .kiwi-messagelist-message--compact .kiwi-messagelist-body {
        float: left;
        width: 100%;
        margin-left: 0;
        box-sizing: border-box;
    }

    .kiwi-messagelist-message--compact.kiwi-messagelist-message--unread .kiwi-messagelist-body {
        padding-left: 10px;
    }

    .kiwi-messagelist-message--compact .kiwi-messagelist-message--authorrepeat .kiwi-messagelist-nick {
        display: none;
    }

    .kiwi-messagelist-message--compact .kiwi-messageinfo {
        padding-left: 2px;
    }

    .kiwi-messagelist-message--compact.kiwi-messagelist-message-traffic .kiwi-messagelist-body {
        margin-left: 0;
    }

    .kiwi-messagelist-message--compact.kiwi-messagelist-message-traffic {
        margin-left: 10px;
    }

    .kiwi-messagelist-message--compact.kiwi-messagelist-message-traffic.kiwi-messagelist-message--unread {
        margin-left: 0;
        padding-left: 10px;
    }
}

.kiwi-messagelist-message--compact .kiwi-messagelist-message-traffic .kiwi-messagelist-nick {
    display: none;
}

.kiwi-messagelist-item:last-of-type {
    margin-bottom: 5px;
}

// Moderate screen size
// Give more space to the nickname column on larger screens
@media screen and (min-width: 1000px) {
    // Nicknames
    .kiwi-messagelist-message--compact .kiwi-messagelist-nick {
        width: 160px;
        min-width: 160px;
    }

    .kiwi-messagelist-message--compact .kiwi-messagelist-nick:hover {
        width: auto;
    }

    // Messages
    .kiwi-messagelist-message--compact .kiwi-messagelist-body {
        margin-left: 170px;
    }

    .kiwi-messagelist-message--compact .kiwi-messageinfo {
        padding-left: 180px;
    }

    .kiwi-messagelist-message--compact.kiwi-messagelist-message-traffic .kiwi-messagelist-body {
        margin-left: 181px;
    }
}

</style>
