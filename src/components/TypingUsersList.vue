<template>
    <div ref="typingList" v-resizeobserver="forceUpdate" class="kiwi-typingusers">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 17"
            class="kiwi-animation-typing"
            :class="{'kiwi-animation-typing--active': typingUsers.list.length }"
        >
            <circle cx="4" cy="9" r="3" />
            <circle cx="12" cy="9" r="3" />
            <circle cx="20" cy="9" r="3" />
        </svg>
        <span
            v-for="(user, idx) in typingUsers.list"
            :key="user.key"
            :style="{ color: userColour(user) }"
        >
            {{ user.nick }}{{ typingUsers.list.length - 1 > idx || typingUsers.more > 0 ? ', ' : '' }}
        </span>
        <span v-if="typingUsers.more > 0" class="kiwi-typingusers-more">
            + {{ typingUsers.more }} others
        </span>
    </div>
</template>

<script setup>
import { debounce } from 'lodash';
import { reactive, useTemplateRef, watch } from 'vue';

import BufferState from '@/libs/state/BufferState';

const typingListElement = useTemplateRef('typingList');

const { buffer } = defineProps({
    buffer: {
        type: BufferState,
    },
});

const typingUsers = reactive({
    list: [],
    more: 0,
});

const getFontStyle = () => {
    const style = window.getComputedStyle(typingListElement.value);
    return {
        size: parseFloat(style.fontSize),
        family: style.fontFamily,
    };
};

const userColour = (user) => (
    user && buffer.setting('colour_nicknames_in_messages')
        ? user.getColour()
        : ''
);

const updateTypingList = () => {
    const visibleUsers = [];
    const containerWidth = typingListElement.value.clientWidth;

    const canvas = document.createElement('canvas');
    const canvas2d = canvas.getContext('2d');
    const fontStyle = getFontStyle(0);

    let overflowCount = 0;
    canvas2d.font = `600 ${fontStyle.size}px ${fontStyle.family}`;
    // 50 = typing animation width + 10 buffer
    let totalWidth = canvas2d.measureText('+ 99 others').width + 50;
    canvas2d.font = `${fontStyle.size}px ${fontStyle.family}`;

    const users = buffer ? buffer.typingUsers : [];
    users.forEach((user) => {
        const userWidth = canvas2d.measureText(`${user.nick}, `).width;
        totalWidth += userWidth;

        if (totalWidth <= containerWidth) {
            visibleUsers.push(user);
        } else {
            overflowCount += 1;
        }
    });

    Object.assign(typingUsers, {
        list: visibleUsers,
        more: overflowCount,
    });
};

const debouncedUpdateTypingList = debounce(
    updateTypingList,
    1000,
    {
        leading: true,
        trailing: true,
        maxWait: 1000,
    }
);

const forceUpdate = () => {
    debouncedUpdateTypingList();
    debouncedUpdateTypingList.flush();
};

watch(
    () => (buffer.typingUsers && buffer.typingUsers.length),
    debouncedUpdateTypingList,
);
</script>

<style lang="less">
.kiwi-typingusers {
    position: relative;
    height: 20px;
    font-size: 0.8em;
    overflow: hidden;
    width: 100%;
    padding-left: 40px;
    box-sizing: border-box;
    user-select: none;

    > span {
        line-height: 20px;
    }

    .kiwi-animation-typing {
        display: none;
        position: absolute;
        left: 0;
        height: 20px;
        width: 40px;
    }

    .kiwi-animation-typing--active {
        display: block;
    }

    .kiwi-typingusers-more {
        font-weight: 600;
    }
}

</style>
