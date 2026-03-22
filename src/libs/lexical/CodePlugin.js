import {
    $createTextNode,
    $getSelection,
    COMMAND_PRIORITY_NORMAL,
    KEY_ARROW_LEFT_COMMAND,
    KEY_ARROW_RIGHT_COMMAND,
    KEY_BACKSPACE_COMMAND,
    KEY_DELETE_COMMAND,
    KEY_DOWN_COMMAND,
    TextNode
} from 'lexical';
import { mergeRegister } from '@lexical/utils';

import { AutocompleteNode } from '@/libs/lexical/AutocompleteNode';
import { BufferNode } from '@/libs/lexical/BufferNode';
import { $createCodeNode, CodeNode } from '@/libs/lexical/CodeNode';
import { EmojiNode } from '@/libs/lexical/EmojiNode';
import { BOUNDARY_CHARACTER } from '@/libs/lexical/BoundaryPlugin';
import { UserNode } from '@/libs/lexical/UserNode';

export function $findUnmatchedBacktick(cursorNode, cursorOffset) {
    const cursorText = cursorNode.getTextContent();

    // 1. Check the cursor node itself first (same-node case).
    const sameNodeIdx = cursorText.slice(0, cursorOffset).lastIndexOf('`');
    if (sameNodeIdx !== -1) {
        return {
            sourceNode: cursorNode,
            backtickOffset: sameNodeIdx,
            sourceText: cursorText,
            betweenNodes: [],
            betweenTexts: [],
            cursorNode,
            cursorOffset,
            cursorText,
        };
    }

    // 2. Walk leftward through previous siblings.
    // betweenNodes is built in left-to-right (document) order:
    // siblings found further left are prepended.
    const betweenNodes = [];
    const betweenTexts = [];
    let sibling = cursorNode.getPreviousSibling();

    while (sibling) {
        // Stop at any disallowed node type.
        if (
            sibling instanceof CodeNode ||
            sibling instanceof EmojiNode ||
            sibling instanceof UserNode ||
            sibling instanceof BufferNode ||
            sibling instanceof AutocompleteNode
        ) {
            return null;
        }

        // Only plain TextNode instances are allowed between the backtick and cursor.
        if (!(sibling instanceof TextNode)) {
            return null;
        }

        const siblingText = sibling.getTextContent();
        const backtickIdx = siblingText.lastIndexOf('`');

        if (backtickIdx !== -1) {
            return {
                sourceNode: sibling,
                backtickOffset: backtickIdx,
                sourceText: siblingText,
                betweenNodes,
                betweenTexts,
                cursorNode,
                cursorOffset,
                cursorText,
            };
        }

        // No backtick in this sibling — prepend it to betweenNodes and keep scanning.
        betweenNodes.unshift(sibling);
        betweenTexts.unshift(siblingText);
        sibling = sibling.getPreviousSibling();
    }

    return null;
}

function $codeNodeZWSTransform(node) {
    const text = node.getTextContent();
    if (text === BOUNDARY_CHARACTER) {
        return; // keep empty placeholder alive — do not strip
    }
    const cleaned = text.replace(/\u200B/g, '');
    if (cleaned !== text) {
        node.setTextContent(cleaned);
        // Do not move cursor — user is actively typing; Lexical has already
        // placed the cursor at the correct offset.
    }
}

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

function $handleBackspace() {
    const selection = $getSelection();
    if (!selection?.isCollapsed()) {
        return false;
    }

    const node = selection.anchor.getNode();
    const offset = selection.anchor.offset;

    // Case A: cursor at start of a CodeNode.
    if (node instanceof CodeNode && offset === 0) {
        const text = node.getTextContent();
        const textNode = $createTextNode(text + '`');
        node.replace(textNode);
        textNode.select(0, 0);
        return true;
    }

    // Case B: cursor at offset 0 of the node immediately after a CodeNode.
    if (offset === 0) {
        const prevSibling = node.getPreviousSibling();
        if (prevSibling instanceof CodeNode) {
            const text = prevSibling.getTextContent();
            const textNode = $createTextNode(text + '`');
            prevSibling.replace(textNode);
            // Cursor stays at offset 0 of the current node — no select() call needed.
            return true;
        }
    }

    return false;
}

function $handleDelete() {
    const selection = $getSelection();
    if (!selection?.isCollapsed()) {
        return false;
    }

    const node = selection.anchor.getNode();
    const offset = selection.anchor.offset;

    if (offset === node.getTextContent().length) {
        const nextSibling = node.getNextSibling();
        if (nextSibling instanceof CodeNode) {
            const text = nextSibling.getTextContent();
            const textNode = $createTextNode('`' + text);
            nextSibling.replace(textNode);
            // Cursor stays at its current offset in the current node.
            return true;
        }
    }

    return false;
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

function $makeBacktickHandler(editor) {
    return function handleBacktick(event) {
        if (event.key !== '`') {
            return false;
        }

        let action = null;
        let matchData = null;

        editor.read(() => {
            const selection = $getSelection();
            if (!selection) return;

            if (!selection.isCollapsed()) {
                // Case (a): non-collapsed selection.
                const nodes = selection.getNodes();
                const hasDisallowed = nodes.some(
                    (n) => n instanceof CodeNode ||
                        n instanceof EmojiNode ||
                        n instanceof UserNode ||
                        n instanceof BufferNode ||
                        n instanceof AutocompleteNode
                );
                if (hasDisallowed) {
                    // action stays null — browser inserts backtick normally.
                    return;
                }
                const text = selection.getTextContent().replace(/\u200B/g, '');
                if (!text) {
                    // Only boundary characters selected — fall through to browser.
                    return;
                }
                action = 'wrap';
                matchData = { text };
                return;
            }

            // Collapsed selection.
            const node = selection.anchor.getNode();
            const offset = selection.anchor.offset;

            // Case (c): cursor inside CodeNode.
            if (node instanceof CodeNode) {
                action = 'exit';
                return;
            }

            // Case (b): unmatched backtick reachable behind cursor.
            const found = $findUnmatchedBacktick(node, offset);
            if (found) {
                // Compute enclosedText now (in read context, before any mutation).
                const enclosedText = (
                    found.sourceText.slice(found.backtickOffset + 1) +
                    found.betweenTexts.join('') +
                    found.cursorText.slice(0, found.cursorOffset)
                ).replace(/\u200B/g, '');

                if (!enclosedText) {
                    // Adjacent backticks with nothing between — fall through to browser.
                    return;
                }
                action = 'match';
                matchData = { ...found, enclosedText };
                return;
            }

            // Case (d): create new code node.
            // Note: we do NOT store the node reference in matchData here.
            // Node references captured in editor.read() must not be used as
            // mutation targets in editor.update() — re-fetch via $getSelection()
            // inside the update block instead (same pattern as the exit case).
            action = 'create';
        });

        if (!action) {
            return false;
        }

        event.preventDefault();

        editor.update(() => {
            const selection = $getSelection();

            if (action === 'create') {
                // Re-fetch node and offset from the live selection rather than
                // using stale references captured during editor.read(). Consistent
                // with the exit case and BoundaryPlugin's $makeCtrlTHandler pattern.
                const node = selection.anchor.getNode();
                const offset = selection.anchor.offset;
                const codeNode = $createCodeNode(BOUNDARY_CHARACTER);
                const len = node.getTextContent().length;
                if (offset === 0) {
                    node.insertBefore(codeNode);
                } else if (offset === len) {
                    node.insertAfter(codeNode);
                } else {
                    const [leftNode] = node.splitText(offset);
                    leftNode.insertAfter(codeNode);
                }
                codeNode.select(0, 0);
                return;
            }

            if (action === 'exit') {
                const node = $getSelection()?.anchor.getNode();
                if (!(node instanceof CodeNode)) return;

                const nodeText = node.getTextContent();
                const nextSibling = node.getNextSibling();

                // Remove the CodeNode if effectively empty (placeholder-only or
                // fully deleted by the user), then move cursor to the next sibling.
                if (nodeText === BOUNDARY_CHARACTER || nodeText === '') {
                    node.remove();
                }

                if (nextSibling) {
                    nextSibling.selectStart();
                }
                return;
            }

            if (action === 'wrap') {
                const { text } = matchData;
                if (!selection) return;

                // removeText() splits any formatted nodes at selection boundaries,
                // preserving styles on prefix and suffix — no extra work required.
                selection.removeText();

                const codeNode = $createCodeNode(text);
                selection.insertNodes([codeNode]);

                const nextSibling = codeNode.getNextSibling();
                if (nextSibling) {
                    nextSibling.selectStart();
                } else {
                    codeNode.selectEnd();
                }
                return;
            }

            if (action === 'match') {
                const {
                    sourceNode,
                    backtickOffset,
                    sourceText,
                    betweenNodes,
                    cursorNode,
                    cursorOffset,
                    cursorText,
                    enclosedText,
                } = matchData;

                const codeNode = $createCodeNode(enclosedText);

                if (sourceNode === cursorNode) {
                    // Same-node case: one atomic replacement using the captured sourceText snapshot.
                    const prefixText = sourceText.slice(0, backtickOffset);
                    const suffixText = sourceText.slice(cursorOffset);

                    let suffixNode;
                    if (!suffixText) {
                        suffixNode = $createTextNode(BOUNDARY_CHARACTER);
                        cursorNode.replace(suffixNode);
                    } else {
                        cursorNode.setTextContent(suffixText);
                        suffixNode = cursorNode;
                    }

                    suffixNode.insertBefore(codeNode);

                    if (prefixText) {
                        codeNode.insertBefore($createTextNode(prefixText));
                    }

                    suffixNode.selectStart();
                    return;
                }

                // Multi-node case.

                // 1. Trim sourceNode (remove backtick and everything after it in that node).
                const newSourceText = sourceText.slice(0, backtickOffset);
                if (!newSourceText) {
                    sourceNode.remove();
                } else {
                    sourceNode.setTextContent(newSourceText);
                }

                // 2. Remove all between-nodes.
                for (const n of betweenNodes) {
                    n.remove();
                }

                // 3. Trim cursorNode (remove text up to cursor position).
                const newCursorText = cursorText.slice(cursorOffset);
                let landingNode;
                if (!newCursorText) {
                    landingNode = $createTextNode(BOUNDARY_CHARACTER);
                    cursorNode.replace(landingNode);
                } else {
                    cursorNode.setTextContent(newCursorText);
                    landingNode = cursorNode;
                }

                // 4. Insert CodeNode before the landing node.
                landingNode.insertBefore(codeNode);

                // 5. Place cursor at start of landing node.
                landingNode.selectStart();
            }
        });

        return true;
    };
}

export function registerCode(editor) {
    return mergeRegister(
        // Existing — unchanged
        editor.registerNodeTransform(TextNode, $codeNodeTransform),
        editor.registerCommand(KEY_ARROW_RIGHT_COMMAND, $handleArrowRight, COMMAND_PRIORITY_NORMAL),
        editor.registerCommand(KEY_ARROW_LEFT_COMMAND, $handleArrowLeft, COMMAND_PRIORITY_NORMAL),

        // New transforms
        editor.registerNodeTransform(CodeNode, $codeNodeZWSTransform),

        // New command handlers
        editor.registerCommand(KEY_BACKSPACE_COMMAND, $handleBackspace, COMMAND_PRIORITY_NORMAL),
        editor.registerCommand(KEY_DELETE_COMMAND, $handleDelete, COMMAND_PRIORITY_NORMAL),
        editor.registerCommand(KEY_DOWN_COMMAND, $makeBacktickHandler(editor), COMMAND_PRIORITY_NORMAL),
    );
}
