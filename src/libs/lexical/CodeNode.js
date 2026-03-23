/* eslint-disable no-underscore-dangle */
import { TextNode } from 'lexical';

export class CodeNode extends TextNode {
    static getType() {
        return 'code';
    }

    static clone(node) {
        return new CodeNode(node.__text, node.getKey());
    }

    createDOM(config) {
        const element = super.createDOM(config);
        element.className = 'code-node';
        element.spellcheck = false;
        return element;
    }

    // Raw code text without backtick delimiters. Use this for all internal
    // logic (transforms, keyboard handlers, and clipboard building) instead
    // of getTextContent() so that Lexical's offset arithmetic is unaffected.
    getCodeText() {
        return super.getTextContent();
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
