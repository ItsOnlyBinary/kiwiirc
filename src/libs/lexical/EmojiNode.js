/* eslint-disable no-underscore-dangle */

import { TextNode } from 'lexical';

export class EmojiNode extends TextNode {
    static getType() {
        return 'emoji';
    }

    static clone(node) {
        return new EmojiNode(node.emoji, node.__key);
    }

    constructor(emoji, key) {
        // console.log('code', emoji.code, parseInt(emoji.code, 16));
        // const unicode = String.fromCodePoint(parseInt(emoji.code, 16));
        super(' ', key);
        this.emoji = emoji;
    }

    createDOM(config) {
        const element = document.createElement('span');
        element.className = 'emoji-node';
        element.dataset.code = this.emoji.ircValue;
        element.style.backgroundImage = `url("${this.emoji.url}")`;
        element.innerText = this.__text;
        Object.assign(element, {
            ...this.emoji.imgProps,
        });
        return element;
    }

    static importJSON(serializedNode) {
        return $createEmojiNode(serializedNode.emoji);
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            type: 'emoji',
            emoji: this.emoji,
        };
    }
}

export function $createEmojiNode(emoji) {
    return new EmojiNode(emoji).setMode('token');
}
