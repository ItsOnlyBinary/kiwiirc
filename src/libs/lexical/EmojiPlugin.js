import { TextNode } from 'lexical';

import { $createEmojiNode } from '@/libs/lexical/EmojiNode';
import { getEmojis } from '@/libs/EmojiProvider';

function $textNodeTransform(node) {
    if (!node.isSimpleText()) {
        return;
    }

    const text = node.getTextContent();

    let word = '';
    let emoji = null;
    let position = 0;
    let length = 0;
    const words = text.split(' ');

    words.some((currentWord, idx) => {
        if (idx === words.length - 1) {
            // Don't match a word unless it's followed by a space
            return false;
        }

        const foundEmoji = getEmojis(currentWord)[0];

        if (foundEmoji) {
            word = currentWord;
            emoji = foundEmoji;
            length = currentWord.length;
            return true;
        }

        // +1 accounts for the space
        position += currentWord.length + 1;
        return false;
    });

    if (!emoji) {
        return;
    }

    let targetNode;

    if (position === 0) {
        [targetNode] = node.splitText(length);
    } else {
        [, targetNode] = node.splitText(position, position + length);
    }

    const emojiNode = $createEmojiNode(emoji, word);
    targetNode.replace(emojiNode);
}

export function registerEmoji(editor) {
    return editor.registerNodeTransform(TextNode, $textNodeTransform);
}
