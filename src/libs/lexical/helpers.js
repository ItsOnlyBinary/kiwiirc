import { $getRoot, $getSelection } from 'lexical';

import { AutocompleteNode } from '@/libs/lexical/AutocompleteNode';
import { BufferNode } from '@/libs/lexical/BufferNode';
import { CodeNode } from '@/libs/lexical/CodeNode';
import { EmojiNode } from '@/libs/lexical/EmojiNode';
import { ImageNode } from '@/libs/lexical/ImageNode';
import { UserNode } from '@/libs/lexical/UserNode';

// Shared style-clear map used when resetting typing styles to plain text.
// Matches defaultStyle in NewIrcInput.vue.
export const CLEAR_STYLE = {
    'color': null,
    'background-color': null,
    'font-weight': null,
    'font-style': null,
    'text-decoration': null,
};

// Recursively collects every node in the editor tree into a flat array.
// Must be called inside an editor.read() or editor.update() context.
export function $getAllNodes() {
    const rootNode = $getRoot();
    const allNodes = [];

    const traverseNodes = (node) => {
        allNodes.push(node);
        if (typeof node.getChildren === 'function') {
            node.getChildren().forEach((childNode) => traverseNodes(childNode));
        }
    };

    traverseNodes(rootNode);
    return allNodes;
}

// Returns true if the node is one of the custom TextNode subclasses defined in
// this plugin set. Used to guard transforms and key handlers that must stop at
// or skip over any specialised node type.
export function $isCustomNode(node) {
    return (
        node instanceof AutocompleteNode ||
        node instanceof BufferNode ||
        node instanceof CodeNode ||
        node instanceof EmojiNode ||
        node instanceof ImageNode ||
        node instanceof UserNode
    );
}

// Sets a node's text content and repositions the cursor to account for any
// \u200B characters that were removed from oldText before the cursor.
//
// Use this whenever stripping \u200B from a node — without the offset
// adjustment, the cursor may jump to the wrong position if it was sitting
// after one or more boundary characters in the original text.
//
// Must be called inside an editor.update() context.
export function $setTextAndAdjustCursor(node, oldText, newText) {
    const sel = $getSelection();
    let newOffset = -1;
    if (sel?.isCollapsed() && sel.anchor.key === node.getKey()) {
        const zwsBeforeCursor = (oldText.slice(0, sel.anchor.offset).match(/\u200B/g) || []).length;
        newOffset = sel.anchor.offset - zwsBeforeCursor;
    }
    node.setTextContent(newText);
    if (newOffset >= 0) {
        node.select(newOffset, newOffset);
    }
}
