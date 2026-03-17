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
        class="kiwi-messagelist-message kiwi-messagelist-message--modern"
        @click="ml.onMessageClick($event, message, true)"
        @dblclick="ml.onMessageDblClick($event, message)"
    >
        <div class="kiwi-messagelist-modern-left">
            <template v-if="displayAvatar(message)">
                <component
                    :is="$options.components.UserAvatar"
                    :data-nick="message.nick"
                    :user="message.user"
                    :network="getNetwork()"
                    :message="message"
                />
            </template>
        </div>
        <div class="kiwi-messagelist-modern-right">
            <div class="kiwi-messagelist-top">
                <a
                    v-if="message.nick"
                    :style="{ 'color': ml.userColour(message.user) }"
                    :class="[
                        'kiwi-messagelist-nick',
                        message.user && userMode(message.user)
                            ? `kiwi-messagelist-nick--mode-${userMode(message.user)}`
                            : '',
                    ]"
                    :data-nick="(message.nick).toLowerCase()"
                    @mouseover="ml.hover_nick = message.nick.toLowerCase();"
                    @mouseout="ml.hover_nick = '';"
                >
                    <span class="kiwi-messagelist-nick-prefix">{{
                        message.user
                            ? userModePrefix(message.user)
                            : ''
                    }}</span>{{ message.nick }}
                </a>
                <div
                    v-if="showRealName()"
                    class="kiwi-messagelist-realname"
                    @click="ml.openUserBox(message.nick)"
                    @mouseover="ml.hover_nick = message.nick.toLowerCase();"
                    @mouseout="ml.hover_nick = '';"
                >
                    {{ message.user.realname }}
                </div>
                <div
                    v-if="isMessage(message)
                        && ml.bufferSetting('show_timestamps')"
                    :title="ml.formatTimeFull(message.time)"
                    class="kiwi-messagelist-time"
                >
                    {{ ml.formatTime(message.time) }}
                </div>
            </div>
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
            <div
                v-else
                class="kiwi-messagelist-body"
                v-html="ml.formatMessage(message)"
            />

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
    </div>
</template>

<script>
'kiwi public';

// eslint-plugin-vue's max-len rule reads the entire file, including the CSS. so we can't use this
// here as some of the rules cannot be broken up any smaller
/* eslint-disable max-len */

import { urlRegex } from '@/helpers/TextFormatting';
import MessageInfo from './MessageInfo';
import AwayStatusIndicator from './AwayStatusIndicator';
import UserAvatar from './UserAvatar';
import MediaViewer from './MediaViewer';

export default {
    components: {
        UserAvatar,
        MessageInfo,
        AwayStatusIndicator,
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
        showRealName() {
            // Showing realname is not enabled
            if (!this.ml.buffer.setting('show_realnames')) {
                return false;
            }

            // Server does not support extended-join so realname would be inconsistent
            let client = this.ml.buffer.getNetwork().ircClient;
            if (!client.network.cap.isEnabled('extended-join')) {
                return false;
            }

            // We dont have a user or users realname
            if (!this.message.user || !this.message.user.realname) {
                return false;
            }

            // No point showing the realname if it's the same as the nick
            if (this.message.user.nick.toLowerCase() === this.message.user.realname.toLowerCase()) {
                return false;
            }

            // If the realname contains a URL it's most likely a clients website
            if (urlRegex.test(this.message.user.realname)) {
                return false;
            }

            return true;
        },
        getNetwork() {
            return this.ml.buffer.getNetwork();
        },
        isMessage(message) {
            let types = ['privmsg', 'action', 'notice', 'message'];
            return types.indexOf(message.type) > -1;
        },
        displayAvatar(message) {
            // if there is no user attached hide the avatar
            if (!message.user && !this.ml.buffer.state.setting('avatars.show_without_user')) {
                return false;
            }

            // if its not a message hide the avatar
            if (!this.isMessage(message)) {
                return false;
            }

            // dont show avatars in server or special buffers
            if (this.ml.buffer.isServer() || this.ml.buffer.isSpecial()) {
                return false;
            }

            // dont show avatar if its a repeat of the same user
            if (this.isRepeat) {
                return false;
            }

            return true;
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

.kiwi-messagelist-message--modern {
    border-left: 7px solid transparent;
    display: flex;
    margin: 0 0 0 20px;
    margin-left: 0;
    transition: border-colour 0.2s, background-color 0.2s;
}

.kiwi-messagelist-modern-left {
    user-select: none;
    position: relative;
    display: flex;
    width: 50px;
}

.kiwi-messagelist-awaystatus {
    width: 10px;
    top: 4px;
    right: 2px;
    height: 10px;
    position: absolute;
}

.kiwi-messagelist-message--modern .kiwi-avatar {
    height: 40px;
    width: 40px;
    cursor: pointer;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message--authorfirst {
    padding-top: 10px;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message--authorrepeat {
    border-top: none;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message--authorrepeat .kiwi-messagelist-modern-right {
    padding-top: 0;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message-topic {
    margin: 20px 20px 20px 20px;
    padding: 10px 20px;
    width: auto;
    box-sizing: border-box;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message-topic .kiwi-messagelist-modern-left {
    display: none;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message--authorrepeat .kiwi-avatar {
    display: none;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message--authorrepeat .kiwi-messagelist-top {
    display: none;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-body {
    white-space: pre-wrap;
    word-wrap: break-word;
    display: block;
    margin-left: 0;
    margin-bottom: 10px;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-body a {
    word-break: break-all;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-modern-right {
    margin-left: 5px;
    padding-top: 0;
    width: 100%;
    overflow: hidden;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-top > div {
    margin-right: 10px;
    padding: 0;
    display: inline-block;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-realname {
    cursor: pointer;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-time {
    font-size: 0.8em;
    font-weight: 400;
    opacity: 0.6;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-nick {
    padding: 0;
    margin-right: 10px;
}

.kiwi-messagelist-message-traffic .kiwi-messagelist-body {
    margin-bottom: 0;
}

.kiwi-messagelist-message-traffic .kiwi-messagelist-modern-left,
.kiwi-messagelist-message-traffic .kiwi-messagelist-top {
    display: none;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message-traffic {
    margin-right: 0;
    padding-left: 60px;
}

.kiwi-messagelist-message-error {
    padding: 10px 0;
    font-weight: 600;
    line-height: normal;
}

.kiwi-messagelist-message-error .kiwi-messagelist-top {
    display: none;
}

.kiwi-messagelist-message-error .kiwi-messagelist-body {
    margin-bottom: 0;
}

@media screen and (max-width: 769px) {
    .kiwi-messagelist-message--modern .kiwi-messagelist-modern-left {
        width: 10px;
    }

    .kiwi-messagelist-message--modern.kiwi-messagelist-message-privmsg .kiwi-messagelist-modern-left,
    .kiwi-messagelist-message-notice .kiwi-messagelist-modern-left {
        display: none;
    }

    .kiwi-messagelist-message--modern .kiwi-messagelist-modern-right {
        margin-left: 0;
    }

    .kiwi-messagelist-message--modern {
        margin: 0;
    }

    .kiwi-messagelist-message-action .kiwi-messagelist-modern-left {
        display: none;
    }

    .kiwi-messagelist-message--modern .kiwi-avatar {
        display: none;
    }

    .kiwi-messagelist-message--modern.kiwi-messagelist-message-traffic {
        padding-left: 10px;
    }

    .kiwi-messagelist-message--modern.kiwi-messagelist-message-topic {
        margin: 0 15px 20px 15px;
    }
}

</style>
