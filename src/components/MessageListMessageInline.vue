<script>
import { h, createTextVNode } from 'vue';

import buildPluginSection from './utils/build-plugin-section';
import MessageInfo from './MessageInfo';
import MediaViewer from './MediaViewer';

const buildInline = (props, context, cache) => {
    const inline = [];

    const style = {};

    if (props.message.user) {
        style.color = props.ml.userColour(props.message.user);
    }

    if (props.ml.showTimestamps) {
        inline.push(h('span', {
            class: ['kiwi-messagelist-time'],
        }, [
            createTextVNode(props.ml.formatTime(props.message.time)),
        ]));
    }

    inline.push(h('span', {
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
            class: ['kiwi-messagelist-nick--prefix'],
        }, [
            createTextVNode(cache.userModePrefix),
        ]),

        h('a', [
            createTextVNode(props.message.nick ? `${props.message.nick}:` : ''),
        ]),
        ...buildPluginSection('prepend')(props, context, cache),
    ]));

    inline.push(buildMessageBody(props, context, cache));

    return inline;
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

    return buildPluginSection('append')(props, context, cache).concat(footer);
};

const messageInline = (props, context) => {
    const cache = {
        lcNick: (props.message.nick || '').toLowerCase(),
        userMode: '',
        userModePrefix: '',
    };

    if (props.message.user) {
        cache.userMode = props.ml.buffer.userMode(props.message.user);
        cache.userModePrefix = props.ml.buffer.userModePrefix(props.message.user);
    }

    return h('div', {
        'class': {
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
            'kiwi-messagelist-message--text': true,
        },
        'data-message-id': props.message.id,
        'data-nick': cache.lcNick,
        'onClick': (event) => props.ml.onMessageClick(event, props.message, true),
        'onDblclick': (event) => props.ml.onMessageDblClick(event, props.message),
    }, [
        h('div', [
            ...buildInline(props, context, cache),
        ]),

        ...buildMessageFooter(props, context, cache),
    ]);
};
messageInline.props = ['ml', 'idx', 'message'];

export default messageInline;
</script>

<style lang="less">

.kiwi-messagelist-message.kiwi-messagelist-message--text {
    position: relative;
    padding: 4px 10px;
    margin: 0;
    text-align: left;
}

//Hide the timestamp unless the user hovers over the message in question
.kiwi-messagelist-message--text .kiwi-messagelist-time {
    position: absolute;
    top: 0;
    right: 0;
    padding: 0 10px;
    visibility: hidden;
    opacity: 0.8;
}

//display timestamp when hovering over the message
.kiwi-messagelist-message--text:hover .kiwi-messagelist-time {
    visibility: visible;
    border-radius: 5px 0 0 5px;
}

// Hide the unread message seperator
.kiwi-messagelist-message--text .kiwi-messagelist-seperator {
    display: none;
}

.kiwi-messagelist-message--text .kiwi-messagelist-nick {
    display: inline;
    text-align: left;
    margin-right: 2px;
    padding: 0;
}

.kiwi-messagelist-message--text .kiwi-messagelist-nick:hover {
    max-width: none;
    width: auto;
}

.kiwi-messagelist-message--text .kiwi-messagelist-body {
    display: inline;
    padding: 0;
    white-space: pre-wrap;
}

.kiwi-messagelist-message--text .kiwi-messagelist-body a {
    word-break: break-all;
}

.kiwi-messagelist-message--text .kiwi-messagelist-message-privmsg:hover,
.kiwi-messagelist-message--text .kiwi-messagelist-message-action:hover,
.kiwi-messagelist-message--text .kiwi-messagelist-message-notice:hover {
    cursor: pointer;
}

//Channel topic
.kiwi-messagelist-message--text.kiwi-messagelist-message-topic {
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    margin: 10px 0;
}

.kiwi-messagelist-message--text.kiwi-messagelist-message-topic .kiwi-messagelist-body {
    padding-right: 0;
    max-width: 95%;
    margin-left: 20px;
}

.kiwi-messagelist-message--text.kiwi-messagelist-message--unread {
    opacity: 1;
}
.kiwi-messagelist-body-prepend-addons {
    color: initial;
}
.kiwi-messagelist-message--text .kiwi-messagelist-message-traffic .kiwi-messagelist-nick {
    display: none;
}

.kiwi-messagelist-item:last-of-type {
    margin-bottom: 5px;
}

.kiwi-messagelist-message--text.kiwi-messagelist-message-nick .kiwi-messagelist-nick {
    display: none;
}

@media screen and (max-width: 700px) {
    .kiwi-messagelist-message--text.kiwi-messagelist-message-traffic,
    .kiwi-messagelist-message--text.kiwi-messagelist-message-nick .kiwi-messagelist-body,
    .kiwi-messagelist-message--text .kiwi-messagelist-body {
        padding-right: 0;
    }
}

</style>
