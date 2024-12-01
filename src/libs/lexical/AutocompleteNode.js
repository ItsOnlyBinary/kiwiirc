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
        console.log('new autocompleteNode', key);
        // console.log('code', emoji.code, parseInt(emoji.code, 16));
        // const unicode = String.fromCodePoint(parseInt(emoji.code, 16));
        super(content, key);
        this.item = item;
        this.id = id;
    }

    createDOM(config) {
        const typedEl = super.createDOM(config);
        typedEl.className = 'autocomplete-node';
        console.log('typedEl', typedEl);

        const remainEl = document.createElement('span');
        remainEl.className = 'autocomplete-remain';

        if (this.item) {
            updateRemainText(remainEl, this.item, this.getTextContent());
        }

        typedEl.append(remainEl);

        return typedEl;
    }

    updateDOM(prevNode, dom, config) {
        console.log('updateDom', dom);
        const remainEl = dom.lastChild;
        if (remainEl === null) {
            return true;
        }
        if (this.item) {
            updateRemainText(remainEl, this.item, this.getTextContent());
        } else {
            remainEl.innerText = '';
        }
        super.updateDOM(prevNode, dom, config);
        return false;
    }

    setSuggestion(item) {
        console.log('setSuggestion', item);
        this.getWritable().item = item;
    }

    // static importJSON(serializedNode) {
    //     return $createAutocompleteNode(serializedNode.emoji);
    // }

    // exportJSON() {
    //     return {
    //         ...super.exportJSON(),
    //         type: 'autocomplete',
    //     };
    // }
}

export function $createAutocompleteNode(content, item, id) {
    return new AutocompleteNode(content, item, id).setMode('normal');
}

function updateRemainText(element, item, value) {
    console.log('updateRemainText', { element, item, value });
    if (item.type === 'user') {
        element.innerText = item.text.slice(value.length - 1);
    } else {
        element.innerText = item.text.slice(value.length);
    }
}
