'kiwi public';

import { escape } from 'lodash';
import getState from '@/libs/state';

export function matchEmoji(word) {
    const emojis = this.getEmojis(word);
    if (!emojis.length) {
        return false;
    }
    return [{
        index: 0,
        match: word,
        type: 'emoji',
        meta: {
            emoji: emojis[0],
        },
    }];
}

export function blockToHtml(block, isSingle, showEmoticons) {
    if (!showEmoticons) {
        return block.content;
    }

    const emoji = block.meta.emoji;
    const classes = 'kiwi-messagelist-emoji' + (isSingle ? ' kiwi-messagelist-emoji--single' : '');
    const src = emoji.url;

    return `<img class="${classes}" src="${src}" alt="${escape(block.content)}" title="${escape(block.content)}" />`;
}

export function getEmojis(word) {
    const emojiList = getState().setting('emojis');
    const emojiLocation = getState().setting('emojiLocation');
    if (!Object.prototype.hasOwnProperty.call(emojiList, word)) {
        return [];
    }
    return [{
        ascii: word,
        code: emojiList[word].split('.')[0],
        url: emojiLocation + emojiList[word],
        ircValue: word,
        // imgProps allows setting properties of <img>
    }];
}

export function getEmojiFromUnified(unifiedID) {
    const emojiList = getState().setting('emojis');
    const emojiLocation = getState().setting('emojiLocation');
    const [emojiWord, emojiFile] = Object.entries(emojiList).find(
        ([key, value]) => value.split('.')[0] === unifiedID
    );
    if (!emojiWord) {
        return [];
    }
    return [{
        ascii: emojiWord,
        code: emojiFile.split('.')[0],
        url: emojiLocation + emojiFile,
        ircValue: emojiWord,
        // imgProps allows setting properties of <img>
    }];
}
