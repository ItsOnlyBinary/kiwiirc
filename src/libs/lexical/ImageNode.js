import { TextNode } from 'lexical';

export class ImageNode extends TextNode {
    static getType() {
        return 'image';
    }

    static clone(node) {
        return new ImageNode(node.url, node.text, node.getKey());
    }

    constructor(url, text, key) {
        // Use text (or url as fallback) as Lexical's text content so that
        // getTextContent() returns the IRC-sendable representation of the image.
        super(text || url, key);
        this.url = url;
        this.text = text || url;
    }

    createDOM(config) {
        const element = super.createDOM(config);
        element.className = 'image-node';
        element.spellcheck = false;

        const img = document.createElement('img');
        img.src = this.url;
        img.alt = this.text;
        element.append(img);

        return element;
    }

    static importJSON(serialisedNode) {
        return $createImageNode(serialisedNode.url, serialisedNode.text);
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            type: 'image',
            url: this.url,
            text: this.text,
        };
    }
}

export function $createImageNode(url, text) {
    return new ImageNode(url, text).setMode('token');
}
