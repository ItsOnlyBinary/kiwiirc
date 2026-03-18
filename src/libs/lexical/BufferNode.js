/* eslint-disable no-underscore-dangle */

import { TextNode } from 'lexical';

export class BufferNode extends TextNode {
    static getType() {
        return 'buffer';
    }

    static clone(node) {
        return new BufferNode(node.__channel, node.__key);
    }

    constructor(channel, key) {
        super(channel, key);
        this.__channel = channel;
    }

    getChannel() {
        return this.__channel;
    }

    createDOM(config) {
        const element = super.createDOM(config);
        element.className = 'buffer-node';
        element.spellcheck = false;
        return element;
    }

    static importJSON(serialisedNode) {
        return $createBufferNode(serialisedNode.channel);
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            type: 'buffer',
            channel: this.__channel,
        };
    }
}

export function $createBufferNode(channel) {
    return new BufferNode(channel);
}
