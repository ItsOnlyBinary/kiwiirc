import {
    $createTextNode,
    $getSelection,
    COMMAND_PRIORITY_NORMAL,
    KEY_ARROW_LEFT_COMMAND,
    KEY_ARROW_RIGHT_COMMAND,
    TextNode
} from 'lexical';
import { mergeRegister } from '@lexical/utils';

import { $createCodeNode, CodeNode } from '@/libs/lexical/CodeNode';
import { BOUNDARY_CHARACTER } from '@/libs/lexical/BoundaryPlugin';

function $codeNodeTransform(textNode) {
    if (textNode.getType() !== 'text' || !textNode.isSimpleText()) {
        return;
    }

    const text = textNode.getTextContent();
    const match = /`([^`]+)`/.exec(text);
    if (!match) {
        return;
    }

    const codeText = match[1];
    const beforeText = text.slice(0, match.index);
    const afterText = text.slice(match.index + match[0].length);

    const codeNode = $createCodeNode(codeText);
    // Use the boundary character when afterText is empty so the node is not
    // normalised away. BoundaryPlugin's invariant enforcement will confirm the
    // trailing boundary on the next update.
    const afterNode = $createTextNode(afterText || BOUNDARY_CHARACTER);

    if (beforeText) {
        textNode.setTextContent(beforeText);
        textNode.insertAfter(codeNode);
    } else {
        // No text before — insert a boundary node so the cursor can be placed
        // before the code node immediately (before BoundaryPlugin's next update).
        textNode.replace(codeNode);
        codeNode.insertBefore($createTextNode(BOUNDARY_CHARACTER));
    }
    codeNode.insertAfter(afterNode);
    afterNode.selectStart();
}

// Arrow key handlers jump the cursor out of the code node when the user
// reaches the boundary, rather than stopping at the edge character.
function $handleArrowRight() {
    const selection = $getSelection();
    if (!selection?.isCollapsed()) {
        return false;
    }

    const node = selection.anchor.getNode();
    if (!(node instanceof CodeNode)) {
        return false;
    }

    if (selection.anchor.offset !== node.getTextContent().length) {
        return false;
    }

    const nextSibling = node.getNextSibling();
    if (nextSibling) {
        nextSibling.selectStart();
    }
    return true;
}

function $handleArrowLeft() {
    const selection = $getSelection();
    if (!selection?.isCollapsed()) {
        return false;
    }

    const node = selection.anchor.getNode();
    if (!(node instanceof CodeNode)) {
        return false;
    }

    if (selection.anchor.offset !== 0) {
        return false;
    }

    const prevSibling = node.getPreviousSibling();
    if (prevSibling) {
        prevSibling.selectEnd();
    }
    return true;
}

export function registerCode(editor) {
    return mergeRegister(
        editor.registerNodeTransform(TextNode, $codeNodeTransform),
        editor.registerCommand(KEY_ARROW_RIGHT_COMMAND, $handleArrowRight, COMMAND_PRIORITY_NORMAL),
        editor.registerCommand(KEY_ARROW_LEFT_COMMAND, $handleArrowLeft, COMMAND_PRIORITY_NORMAL),
    );
}
