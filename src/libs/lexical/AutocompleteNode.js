/* eslint-disable no-underscore-dangle */

import { TextNode } from 'lexical';

export class AutocompleteNode extends TextNode {
    static getType() {
        return 'autocomplete';
    }

    static clone(node) {
        return new AutocompleteNode(
            node.getTextContent(),
            node.item,
            node.id,
            node.getKey()
        );
    }

    constructor(content, item, id, key) {
        super(content, key);
        this.item = item;
        this.id = id;
    }

    createDOM(config) {
        const typedEl = super.createDOM(config);
        typedEl.className = 'autocomplete-node';
        typedEl.spellcheck = false;

        const remainEl = document.createElement('span');
        remainEl.className = 'autocomplete-remain';
        remainEl.contentEditable = false;
        remainEl.spellcheck = false;

        if (this.item) {
            updateRemainText(remainEl, this.item, this.getTextContent());
        }

        typedEl.append(remainEl);

        return typedEl;
    }

    updateDOM(prevNode, dom, config) {
        if (super.updateDOM(prevNode, dom, config)) {
            return true;
        }
        const remainEl = dom.lastChild;
        if (remainEl === null) {
            return true;
        }
        if (this.item) {
            updateRemainText(remainEl, this.item, this.getTextContent());
        } else {
            remainEl.innerText = '';
        }
        return false;
    }

    setSuggestion(item) {
        this.getWritable().item = item;
    }

    static importJSON(serialisedNode) {
        return $createAutocompleteNode(serialisedNode.text, serialisedNode.item, serialisedNode.id);
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            type: 'autocomplete',
        };
    }
}

export function $createAutocompleteNode(content, item, id) {
    return new AutocompleteNode(content, item, id).setMode('normal');
}

function updateRemainText(element, item, value) {
    if (item.type === 'user') {
        // When the autocomplete was triggered with '@', the value includes it as a
        // prefix that is not part of the nick text — subtract 1 to align the slice.
        const offset = value.startsWith('@') ? value.length - 1 : value.length;
        element.innerText = item.text.slice(offset);
    } else {
        element.innerText = item.text.slice(value.length);
    }
}
