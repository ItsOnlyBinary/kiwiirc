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

// Used as a placeholder in boundary text nodes so Lexical's normalizer does
// not remove them (it only removes nodes where text === ''). Stripped from
// all IRC/text output — see getText() and Html2Irc.js.
export const BOUNDARY_CHARACTER = '\u200B';

function $codeNodeTransform(textNode) {
    if (textNode.getType() !== 'text' || !textNode.isSimpleText()) {
        return;
    }

    const text = textNode.getTextContent();

    // When the user types into a boundary node it gains real content alongside
    // the placeholder — strip the placeholder now that it is no longer needed.
    // selectEnd() is required: the cursor offset may point past the end of the
    // shorter cleaned string, causing an IndexSizeError if left uncorrected.
    const cleaned = text.replace(/\u200B/g, '');
    if (cleaned && cleaned !== text) {
        textNode.setTextContent(cleaned);
        textNode.selectEnd();
        return;
    }

    const match = /`([^`]+)`/.exec(text);
    if (!match) {
        return;
    }

    const codeText = match[1];
    const beforeText = text.slice(0, match.index);
    const afterText = text.slice(match.index + match[0].length);

    const codeNode = $createCodeNode(codeText);
    // Use the boundary character when afterText is empty so the node is not
    // normalised away, keeping a tappable/navigable position after the code node.
    const afterNode = $createTextNode(afterText || BOUNDARY_CHARACTER);

    if (beforeText) {
        textNode.setTextContent(beforeText);
        textNode.insertAfter(codeNode);
    } else {
        // No text before — insert a boundary node so the cursor can be placed
        // before the code node (important on mobile where there are no arrow keys).
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
