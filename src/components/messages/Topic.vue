<template>
    <div class="kiwi-message-topic">
        <div class="kiwi-message-topic-content" v-html="formattedTopic"/>
        <div class="kiwi-message-topic-setby">{{ formattedSetBy }}</div>
    </div>
</template>

<script>
'kiwi public';

import * as TextFormatting from '@/helpers/TextFormatting';
import formatIrcMessage from '@/libs/MessageFormatter';

const component = {
    data() {
        return {

        };
    },
    computed: {
        buffer() {
            return this.$state.getActiveBuffer();
        },
        formattedTopic() {
            let showEmoticons = this.$state.setting('buffers.show_emoticons');
            let topic = TextFormatting.formatText('channel_topic', this.buffer.topic);
            let blocks = formatIrcMessage(topic, { extras: false });
            let content = TextFormatting.styleBlocksToHtml(blocks, showEmoticons, null);
            return content.html;
        },
        formattedSetBy() {
            return TextFormatting.t('topic_setby', {
                who: this.buffer.topic_by,
                when: new Date(this.buffer.topic_when * 1000).toLocaleString(),
            });
        },
    },
};

export default component;

export function listenForMessages(state) {
    state.$on('message.new', (message, buffer) => {
        if (message.type === 'topic') {
            message.template = component;
        }
    });
}
</script>

<style>

.kiwi-message-topic {
    border-top: 1px solid #42b992;
    border-bottom: 1px solid #42b992;
    background: #f5f5f5;
    padding: 2px 10px;
}

.kiwi-message-topic-setby {
    display: inline-block;
    font-size: 80%;
    right: 0;
}

</style>
