import {
    $createTextNode,
    $getSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_NORMAL,
    KEY_DOWN_COMMAND
} from 'lexical';
import { mergeRegister } from '@lexical/utils';

import { $createAutocompleteNode } from '@/libs/lexical/AutocompleteNode';
import { BufferNode } from '@/libs/lexical/BufferNode';
import { UserNode } from '@/libs/lexical/UserNode';

let nextID = 0;

function makeDefaultOnEdit(node, text) {
    const id = ++nextID;
    const ac = $createAutocompleteNode(text, null, id);
    node.replace(ac);
    ac.selectEnd();
}

function $convertToText(node) {
    const textNode = $createTextNode(node.getTextContent());
    node.replace(textNode);
    return textNode;
}

function makeBoundaryKeyHandler(NodeClass, { onRevert } = {}) {
    return function $handleBoundaryKey(event) {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return false;
        }

        const anchor = selection.anchor;
        const node = anchor.getNode();
        const offset = anchor.offset;

        // Delete — cursor at end of preceding sibling whose next sibling is our node type.
        if (event.key === 'Delete') {
            const textLength = node.getTextContent().length;
            if (offset === textLength) {
                const next = node.getNextSibling();
                if (next instanceof NodeClass) {
                    event.preventDefault();
                    $convertToText(next);
                    node.select(textLength, textLength);
                    return true;
                }
            }
        }

        // Backspace — cursor at offset 0 inside our node type.
        if (event.key === 'Backspace' && node instanceof NodeClass && offset === 0) {
            event.preventDefault();
            const textNode = $convertToText(node);
            textNode.select(0, 0);
            if (onRevert) {
                onRevert(textNode);
            }
            return true;
        }

        return false;
    };
}

function registerIrcToken(editor, NodeClass, getOriginalText, { onEdit, onRevert } = {}) {
    const editHandler = onEdit ?? makeDefaultOnEdit;

    return mergeRegister(
        editor.registerNodeTransform(NodeClass, (node) => {
            const currentText = node.getTextContent();
            const originalText = getOriginalText(node);
            if (currentText !== originalText) {
                editHandler(node, currentText);
            }
        }),
        editor.registerCommand(
            KEY_DOWN_COMMAND,
            makeBoundaryKeyHandler(NodeClass, { onRevert }),
            COMMAND_PRIORITY_NORMAL,
        ),
    );
}

export function registerUser(editor, options) {
    return registerIrcToken(editor, UserNode, (n) => n.getUser()?.nick, options);
}

export function registerBuffer(editor, options) {
    return registerIrcToken(editor, BufferNode, (n) => n.getChannel(), options);
}
