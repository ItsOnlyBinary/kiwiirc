<script>
import { h, createTextVNode } from 'vue';
import buildPluginSection from './utils/build-plugin-section';
import AwayStatusIndicator from './AwayStatusIndicator';
import MessageInfo from './MessageInfo';
import MediaViewer from './MediaViewer';

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

const buildMessageHeader = buildPluginSection('prepend');
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

    return buildPluginSection('append')(props, context, cache).concat(footer);
};

const messageCompact = (props, context) => {
    const messageChildren = [];
    const nickChildren = [];
    const style = {};

    const cache = {
        isRepeat: isRepeat(props),
        lcNick: (props.message.nick || '').toLowerCase(),
        userMode: '',
        userModePrefix: '',
    };

    if (props.message.user) {
        cache.userMode = props.ml.buffer.userMode(props.message.user);
        cache.userModePrefix = props.ml.buffer.userModePrefix(props.message.user);

        style.color = props.ml.userColour(props.message.user);

        nickChildren.push(h(AwayStatusIndicator, {
            network: props.ml.buffer.getNetwork(),
            user: props.message.user,
            toggle: false,
        }));
    }

    if (props.ml.showTimestamps) {
        messageChildren.push(h('div', {
            class: ['kiwi-messagelist-time'],
            title: props.ml.formatTimeFull(props.message.time),
        }, [
            createTextVNode(props.ml.formatTime(props.message.time)),
        ]));
    }

    nickChildren.push(
        h('span', {
            class: ['kiwi-messagelist-nick-prefix'],
        }, [
            createTextVNode(cache.userModePrefix),
        ]),
        createTextVNode(props.message.nick),
    );

    messageChildren.push(h('a', {
        'class': {
            'kiwi-messagelist-nick': true,
            [`kiwi-messagelist-nick--mode-${cache.userMode}`]: cache.userMode,
        },
        'data-nick': cache.lcNick,
        'onMouseover': () => (props.ml.hover_nick = cache.lcNick),
        'onMouseout': () => (props.ml.hover_nick = ''),
        style,
    }, nickChildren));
    messageChildren.push(...buildMessageHeader(props, context, cache));
    messageChildren.push(buildMessageBody(props, context, cache));
    messageChildren.push(...buildMessageFooter(props, context, cache));

    return h('div', {
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
            'kiwi-messagelist-message--compact': true,
        },
        'data-message-id': props.message.id,
        'data-nick': cache.lcNick,
        'onClick': (event) => props.ml.onMessageClick(event, props.message, true),
        'onDblclick': (event) => props.ml.onMessageDblClick(event, props.message),
    }, messageChildren);
};

messageCompact.props = ['ml', 'append', 'prepend', 'message'];

export default messageCompact;
</script>

<style lang="less">
.kiwi-messagelist-message.kiwi-messagelist-message--compact {
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
    .kiwi-messagelist-message.kiwi-messagelist-message--compact {
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
