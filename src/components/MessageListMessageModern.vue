<script>
import { h, createTextVNode } from 'vue';

import { urlRegex } from '@/helpers/TextFormatting';
import UserAvatar from './UserAvatar';
import MessageInfo from './MessageInfo';
import MediaViewer from './MediaViewer';

const messageTypes = ['privmsg', 'action', 'notice', 'message'];
const isMessage = (message) => messageTypes.indexOf(message.type) > -1;

const isRepeat = (props) => {
    let ml = props.ml;
    let idx = props.idx;
    let message = props.message;
    let prevMessage = ml.filteredMessages[idx - 1];

    return !!prevMessage &&
        prevMessage.nick === message.nick &&
        message.time - prevMessage.time < 60000 &&
        prevMessage.type !== 'traffic' &&
        message.type !== 'traffic' &&
        message.type === prevMessage.type &&
        message.day_num === prevMessage.day_num;
};

const displayAvatar = (props) => {
    // if there is no user attached hide the avatar
    if (!props.message.user) {
        return false;
    }

    // if its not a message hide the avatar
    if (!isMessage(props.message)) {
        return false;
    }

    // dont show avatars in server or special buffers
    if (props.ml.buffer.isServer() || props.ml.buffer.isSpecial()) {
        return false;
    }

    // dont show avatar if its a repeat of the same user
    if (isRepeat(props)) {
        return false;
    }

    return true;
};

const showRealName = (props) => {
    // We dont have a user or users realname
    if (!props.message.user || !props.message.user.realname) {
        return false;
    }

    // Showing realname is not enabled
    if (!props.ml.showRealNames) {
        return false;
    }

    // Server does not support extended-join so realname would be inconsistent
    let client = props.ml.buffer.getNetwork().ircClient;
    if (!client.network.cap.isEnabled('extended-join')) {
        return false;
    }

    // No point showing the realname if it's the same as the nick
    if (props.message.user.nick.toLowerCase() === props.message.user.realname.toLowerCase()) {
        return false;
    }

    // If the realname contains a URL it's most likely a clients website
    if (urlRegex.test(props.message.user.realname)) {
        return false;
    }

    return true;
};

const buildMessageLeft = (props, context, cache) => {
    if (displayAvatar(props)) {
        return [h(UserAvatar, {
            'data-nick': cache.lcNick,
            'user': props.message.user,
            'network': props.ml.buffer.getNetwork(),
            'message': props.message,
        })];
    }

    return [];
};

const buildMessageTop = (props, context, cache) => {
    const top = [];

    if (props.message.nick) {
        const style = {};

        if (props.message.user) {
            style.color = props.ml.userColour(props.message.user);
        }

        top.push(h('a', {
            'class': {
                'kiwi-messagelist-nick': true,
                [`kiwi-messagelist-nick--mode-${cache.userMode}`]: cache.userMode,
            },
            'data-nick': cache.lcNick,
            'onMouseover': () => (props.ml.hover_nick = cache.lcNick),
            'onMouseout': () => (props.ml.hover_nick = ''),
            style,
        }, [
            h('span', {
                class: ['kiwi-messagelist-nick-prefix'],
            }, [
                createTextVNode(cache.userModePrefix),
            ]),
            createTextVNode(props.message.nick),
        ]));
    }

    if (showRealName(props)) {
        top.push(h('div', {
            class: ['kiwi-messagelist-realname'],
            onClick: () => props.ml.openUserBox(props.message.nick),
            onMouseover: () => (props.ml.hover_nick = cache.lcNick),
            onMouseout: () => (props.ml.hover_nick = ''),
        }, [
            createTextVNode(props.message.user.realname),
        ]));
    }

    if (isMessage(props.message) && props.ml.showTimestamps) {
        top.push(h('div', {
            class: ['kiwi-messagelist-time'],
            title: props.ml.formatTimeFull(props.message.time),
        }, [
            createTextVNode(props.ml.formatTime(props.message.time)),
        ]));
    }

    return top;
};

const buildMessageBody = (props, context, cache) => {
    if (props.message.bodyTemplate) {
        return h(props.message.bodyTemplate, {
            class: ['kiwi-messagelist-body'],
            buffer: props.ml.buffer,
            message: props.message,
            idx: props.idx,
            ml: props.ml,
        });
    }

    return h('div', {
        class: ['kiwi-messagelist-body'],
        innerHTML: props.ml.formatMessage(props.message),
    });
};

const buildMessageFooter = (props, context, cache) => {
    const footer = [];

    if (props.ml.message_info_open === props.message) {
        footer.push(h(MessageInfo, {
            message: props.message,
            buffer: props.ml.buffer,
            onClose: () => props.ml.toggleMessageInfo(),
        }));
    }

    if (props.ml.shouldAutoEmbed && props.message.embed.payload) {
        footer.push(h(MediaViewer, {
            'url': props.message.embed.payload,
            'show-pin': true,
            'onClose': () => (props.message.embed.payload = ''),
            'onPin': () => props.ml.openEmbedInPreview(props.message),
        }));
    }

    return buildPluginSection('append')(props,context,cache).concat(footer);
};

const messageModern = (props, context) => {
    const cache = {
        isRepeat: isRepeat(props),
        lcNick: (props.message.nick || '').toLowerCase(),
        userMode: '',
        userModePrefix: '',
    };

    if (props.message.user) {
        cache.userMode = props.ml.buffer.userMode(props.message.user);
        cache.userModePrefix = props.ml.buffer.userModePrefix(props.message.user);
    }

    return [h('div', {
        'class': {
            [cache.isRepeat
                ? 'kiwi-messagelist-message--authorrepeat'
                : 'kiwi-messagelist-message--authorfirst']: true,

            [`kiwi-messagelist-message-${props.message.type}`]: true,

            [`kiwi-messagelist-message-${props.message.type}-${props.message.type_extra}`]: props.message.type_extra,

            'kiwi-messagelist-message--highlight': props.ml.isMessageHighlight(props.message),
            'kiwi-messagelist-message--hover': props.ml.isHoveringOverMessage(props.message),
            'kiwi-messagelist-message--unread': props.ml.buffer.last_read && props.message.time > props.ml.buffer.last_read,
            'kiwi-messagelist-message--own': cache.lcNick === props.ml.ourNick.toLowerCase(),
            'kiwi-messagelist-message--info-open': props.ml.message_info_open === props.message,
            'kiwi-messagelist-message--blur': props.ml.message_info_open && props.ml.message_info_open !== props.message,
            [`kiwi-messagelist-message--user-mode-${cache.userMode}`]: cache.userMode,

            'kiwi-messagelist-message': true,
            'kiwi-messagelist-message--modern': true,
        },
        'data-message-id': props.message.id,
        'data-nick': cache.lcNick,
        'onClick': (event) => props.ml.onMessageClick(event, props.message, true),
        'onDblclick': (event) => props.ml.onMessageDblClick(event, props.message),
    }, [
        h('div', {
            class: ['kiwi-messagelist-modern-left'],
        }, buildMessageLeft(props, context, cache)),

        h('div', {
            class: ['kiwi-messagelist-modern-right'],
        }, [
            h('div', {
                class: ['kiwi-messagelist-top'],
            }, buildMessageTop(props, context, cache)),
            ...buildPluginSection(prepend)(props,context,cache),
            buildMessageBody(props, context, cache),
            ...buildMessageFooter(props, context, cache),
        ]),
    ])];
};

messageModern.props = ['ml', 'idx', 'message'];

export default messageModern;
</script>

<style lang="less">

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
.kiwi-messagelist-body-prepend-addons {
    color: initial;
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
