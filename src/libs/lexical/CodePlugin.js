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

import { $createCodeNode, CodeNode } from '@/libs/lexical/CodeNode';
import { BOUNDARY_CHARACTER } from '@/libs/lexical/BoundaryPlugin';
import { $isCustomNode, $setTextAndAdjustCursor } from '@/libs/lexical/helpers';

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
        if ($isCustomNode(sibling)) {
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
    const text = node.getCodeText();
    if (text === BOUNDARY_CHARACTER) {
        return; // keep empty placeholder alive — do not strip
    }
    const cleaned = text.replace(/\u200B/g, '');
    if (!cleaned) {
        // All content was ZWS — normalize to a single placeholder rather than
        // setting empty text, which Lexical would remove.
        node.setTextContent(BOUNDARY_CHARACTER);
        return;
    }
    if (cleaned !== text) {
        // Adjust cursor before shortening the node. The selection offset may now
        // exceed the cleaned text length (e.g. cursor at offset 2 of '\u200Ba'
        // becomes offset 1 of 'a' after the ZWS is removed).
        $setTextAndAdjustCursor(node, text, cleaned);
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
        const text = node.getCodeText();
        const textNode = $createTextNode(text + '`');
        node.replace(textNode);
        textNode.select(0, 0);
        return true;
    }

    // Case B: cursor at offset 0 of the node immediately after a CodeNode.
    if (offset === 0) {
        const prevSibling = node.getPreviousSibling();
        if (prevSibling instanceof CodeNode) {
            const text = prevSibling.getCodeText();
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
            const codeText = nextSibling.getCodeText();
            const nodeText = node.getTextContent();
            // Strip ZWS from the current node (e.g. boundary '\u200B') to get the
            // clean prefix text and the correct cursor landing offset.
            const cleanedNodeText = nodeText.replace(/\u200B/g, '');
            // Merge code text directly into the current node rather than replacing
            // the CodeNode with a new TextNode. This avoids the adjacent-TextNode
            // merge cycle that would fire $boundaryCleanupTransform and call
            // selectEnd(), which would move the cursor to the end of the input.
            // Symmetric with $handleBackspace: Delete at the opening backtick
            // position converts the CodeNode back to plain text with a leading
            // backtick (the user "deleted" the opening backtick).
            node.setTextContent(cleanedNodeText + '`' + codeText);
            nextSibling.remove();
            // Place cursor at the junction (right where the backtick now sits).
            node.select(cleanedNodeText.length, cleanedNodeText.length);
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

    if (selection.anchor.offset !== node.getCodeText().length) {
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
                const hasDisallowed = nodes.some($isCustomNode);
                if (hasDisallowed) {
                    // Consume the keystroke without mutation. Returning false
                    // here would let the browser replace the selection with a
                    // backtick, destroying the CodeNode or other special content.
                    action = 'prevent';
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

        // 'prevent': disallowed nodes in selection — swallow the keystroke so
        // the browser cannot replace the selection with a backtick character.
        if (action === 'prevent') {
            return true;
        }

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
                // selectEnd() places cursor at offset 1 (after the \u200B placeholder),
                // unambiguously inside the code node's styled box. select(0, 0) would
                // be the same DOM position as the end of the previous sibling, causing
                // the cursor to appear before the code block visually.
                codeNode.selectEnd();
                return;
            }

            if (action === 'exit') {
                const node = $getSelection()?.anchor.getNode();
                if (!(node instanceof CodeNode)) return;

                const nodeText = node.getCodeText();
                const nextSibling = node.getNextSibling();

                // Remove the CodeNode if effectively empty (placeholder-only or
                // fully deleted by the user), then move cursor to the next sibling.
                if (nodeText === BOUNDARY_CHARACTER || nodeText === '') {
                    node.remove();
                }

                if (nextSibling) {
                    const siblingText = nextSibling.getTextContent();
                    if (!siblingText || siblingText === BOUNDARY_CHARACTER) {
                        // Boundary-only sibling: append a space so the cursor lands
                        // after it (offset 2 of '\u200B '). BoundaryPlugin's cleanup
                        // transform fires synchronously and strips the \u200B, leaving
                        // just ' ' with the cursor at offset 1 (after the space).
                        nextSibling.setTextContent(siblingText + ' ');
                        nextSibling.selectEnd();
                    } else {
                        // Sibling has real content: insert a dedicated space node.
                        const spaceNode = $createTextNode(' ');
                        nextSibling.insertBefore(spaceNode);
                        spaceNode.selectEnd();
                    }
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
