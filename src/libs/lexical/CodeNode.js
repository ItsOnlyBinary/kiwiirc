/* eslint-disable no-underscore-dangle */
import { TextNode } from 'lexical';

export class CodeNode extends TextNode {
    static getType() {
        return 'code';
    }

    static clone(node) {
        return new CodeNode(node.__text, node.__key);
    }

    createDOM(config) {
        const element = super.createDOM(config);
        element.className = 'code-node';
        element.spellcheck = false;
        return element;
    }

    static importJSON(serialisedNode) {
        return $createCodeNode(serialisedNode.text);
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            type: 'code',
        };
    }
}

export function $createCodeNode(text) {
    return new CodeNode(text);
}
