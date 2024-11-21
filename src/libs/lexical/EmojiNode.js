/* eslint-disable no-underscore-dangle */

import { TextNode } from 'lexical';

export class EmojiNode extends TextNode {
    static getType() {
        return 'emoji';
    }

    static clone(node) {
        return new EmojiNode(node.emoji, node.word, node.__key);
    }

    constructor(emoji, word, key) {
        super(' ', key);
        this.emoji = emoji;
        this.word = word ?? '';
    }

    createDOM(config) {
        const element = super.createDOM(config);
        element.className = 'emoji-node';
        element.dataset.code = this.emoji.ircValue;
        element.style.backgroundImage = `url("${this.emoji.url}")`;
        Object.assign(element, {
            ...this.emoji.imgProps,
        });
        return element;
    }

    static importJSON(serialisedNode) {
        return $createEmojiNode(serialisedNode.emoji);
    }

    exportJSON() {
        // this.word is not needed for serialisation
        // as its only used to undo auto replace
        return {
            ...super.exportJSON(),
            type: 'emoji',
            emoji: this.emoji,
        };
    }
}

export function $createEmojiNode(emoji, word) {
    return new EmojiNode(emoji, word).setMode('token');
}
