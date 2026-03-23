import {
    $createTextNode,
    $getRoot,
    $getSelection,
    COMMAND_PRIORITY_NORMAL,
    KEY_DOWN_COMMAND,
    TextNode
} from 'lexical';
import { $patchStyleText } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';

import { AutocompleteNode } from '@/libs/lexical/AutocompleteNode';
import { $createCodeNode, CodeNode } from '@/libs/lexical/CodeNode';
import { EmojiNode } from '@/libs/lexical/EmojiNode';
import { UserNode } from '@/libs/lexical/UserNode';
import { BufferNode } from '@/libs/lexical/BufferNode';

// Placed in otherwise-empty text nodes so Lexical's normalizer does not remove
// them (it only removes nodes where text === ''). Stripped from all IRC/text
// output — see getText() and Html2Irc.js.
export const BOUNDARY_CHARACTER = '\u200B';

// Returns true for nodes that require a plain-text boundary neighbour to remain
// navigable. AutocompleteNode is exempt — it is transient and must not have
// boundary nodes inserted around it (doing so corrupts surrounding text and
// breaks the autocomplete cursor detection in NewIrcInput.vue).
//
// IMPORTANT: The AutocompleteNode check must come before the TextNode check
// because AutocompleteNode extends TextNode.
export function $isSpecialOrFormatted(node) {
    if (node instanceof AutocompleteNode) return false; // exempt — check first
    if (node instanceof CodeNode) return true;
    if (node instanceof EmojiNode) return true;
    if (node instanceof UserNode) return true;
    if (node instanceof BufferNode) return true;
    if (node instanceof TextNode) return node.getStyle() !== '';
    return true; // any other non-TextNode type is treated as special
}

function $createBoundaryNode() {
    return $createTextNode(BOUNDARY_CHARACTER);
}

// Returns true if the paragraph's children violate any boundary invariant.
// Runs inside a read context — does not mutate.
function $checkInvariants(paragraph) {
    const children = paragraph.getChildren();

    if (children.length === 0) return true; // empty paragraph needs a boundary node

    if ($isSpecialOrFormatted(children[0])) return true; // invariant 1
    if ($isSpecialOrFormatted(children[children.length - 1])) return true; // invariant 2

    // Invariant 3: no two adjacent special/formatted nodes
    for (let i = 0; i < children.length - 1; i++) {
        if ($isSpecialOrFormatted(children[i]) && $isSpecialOrFormatted(children[i + 1])) {
            return true;
        }
    }

    return false;
}

// Mutates the paragraph to satisfy all three invariants. Must run inside
// editor.update(). Uses a children snapshot so mid-loop insertions do not
// affect iteration.
//
// Invariant 1: first child is not special/formatted → prepend boundary
// Invariant 2: last child is not special/formatted  → append boundary
// Invariant 3: no two adjacent special/formatted nodes → insert boundary between
//
// Two adjacent boundary nodes are valid and do not trigger insertion.
// Empty paragraph: one boundary node satisfies both invariants 1 and 2.
function $enforceInvariants() {
    const root = $getRoot();
    const paragraph = root.getFirstChild();
    if (!paragraph) return;

    const children = paragraph.getChildren();

    if (children.length === 0) {
        paragraph.append($createBoundaryNode());
        return;
    }

    // Invariant 1: leading boundary
    if ($isSpecialOrFormatted(children[0])) {
        children[0].insertBefore($createBoundaryNode());
    }

    // Invariant 2: trailing boundary
    if ($isSpecialOrFormatted(children[children.length - 1])) {
        children[children.length - 1].insertAfter($createBoundaryNode());
    }

    // Invariant 3: no two adjacent special/formatted nodes.
    // `children` is a snapshot array captured before any insertions — Lexical's
    // `getChildren()` returns a copy, not a live NodeList. Insertions made by
    // invariants 1 and 2 above do not shift the indices here. This is intentional:
    // iterating the snapshot keeps the loop index-stable and correct.
    for (let i = 0; i < children.length - 1; i++) {
        if ($isSpecialOrFormatted(children[i]) && $isSpecialOrFormatted(children[i + 1])) {
            children[i].insertAfter($createBoundaryNode());
        }
    }
}

// Strips the boundary character from a plain TextNode when real content is
// typed alongside it. Skips all TextNode subclasses (CodeNode, EmojiNode, etc.)
// that are intentionally non-plain.
//
// Must return immediately after cleaning — Lexical re-runs all transforms on
// any mutated node, and falling through would cause the CodePlugin backtick
// transform to fire on the already-cleaned text.
function $boundaryCleanupTransform(node) {
    if (
        node instanceof CodeNode ||
        node instanceof EmojiNode ||
        node instanceof UserNode ||
        node instanceof BufferNode ||
        node instanceof AutocompleteNode
    ) {
        return;
    }

    const text = node.getTextContent();
    const cleaned = text.replace(/\u200B/g, '');

    // Plain TextNodes immediately after a CodeNode must keep a leading \u200B.
    // Without it the browser treats offset 0 of this node as identical to the
    // end of the CodeNode's DOM span, making it impossible to position the
    // cursor at the start of the text without appearing to be inside the code
    // block. The leading \u200B gives the browser an unambiguous anchor.
    if (node.getPreviousSibling() instanceof CodeNode) {
        if (!cleaned) {
            // Boundary-only content ('\u200B') — preserve as-is.
            return;
        }
        const target = BOUNDARY_CHARACTER + cleaned;
        if (target !== text) {
            node.setTextContent(target);
            // Shift the cursor offset by 1 to account for the prepended \u200B.
            const sel = $getSelection();
            if (sel?.isCollapsed() && sel.anchor.key === node.getKey()) {
                node.select(sel.anchor.offset + 1, sel.anchor.offset + 1);
            }
        }
        return;
    }

    // The `cleaned &&` guard protects boundary-only nodes: when text === '\u200B',
    // cleaned === '' (falsy), so the block is skipped and the boundary node is
    // preserved. Do NOT remove the `cleaned &&` condition.
    if (cleaned && cleaned !== text) {
        // Adjust cursor before shortening the node — same pattern as
        // $codeNodeZWSTransform. selectEnd() is wrong here: it clobbers the
        // cursor position when this transform fires after a delete/backspace
        // operation that explicitly placed the cursor elsewhere (e.g.
        // $handleDelete merging code text into the preceding boundary node,
        // which then gets merged with the trailing boundary by Lexical's
        // normalizer, causing this transform to fire on the combined string).
        const sel = $getSelection();
        let newOffset = -1;
        if (sel?.isCollapsed() && sel.anchor.key === node.getKey()) {
            const zwsBeforeCursor = (text.slice(0, sel.anchor.offset).match(/\u200B/g) || []).length;
            newOffset = sel.anchor.offset - zwsBeforeCursor;
        }
        node.setTextContent(cleaned);
        if (newOffset >= 0) {
            node.select(newOffset, newOffset);
        }
        // Return immediately — do not fall through.
    }
}

// Matches defaultStyle in NewIrcInput.vue. Clears the selection's typing style
// after Ctrl+T so the new boundary node stays plain — without this, the next
// keystroke would inherit the split node's formatting, making the boundary node
// styled and immediately triggering the ZWS cleanup loop.
const CLEAR_STYLE = {
    'color': null,
    'background-color': null,
    'font-weight': null,
    'font-style': null,
    'text-decoration': null,
};

// Returns a KEY_DOWN_COMMAND handler closed over `editor`.
//
// Ctrl+T splits a CodeNode or styled TextNode at the cursor, inserting a plain
// boundary node at the split point, and moves the cursor there.
//
// No-op when cursor is in: plain unstyled TextNode, AutocompleteNode,
// UserNode, EmojiNode, or a non-collapsed selection.
//
// Ctrl+T intentionally overrides the browser's "open new tab" shortcut.
// event.preventDefault() inside a focused contenteditable keydown suppresses it
// in all target browsers before the browser can act.
export function $makeCtrlTHandler(editor) {
    return function handleCtrlT(event) {
        if (!event.ctrlKey || event.key !== 't') {
            return false;
        }

        // Determine whether we should act — must run inside a read context.
        let shouldHandle = false;
        editor.read(() => {
            const selection = $getSelection();
            if (!selection?.isCollapsed()) return;
            const node = selection.anchor.getNode();
            if (node instanceof AutocompleteNode) return;
            if (node instanceof UserNode) return;
            if (node instanceof BufferNode) return;
            if (node instanceof EmojiNode) return;
            if (node instanceof TextNode && !(node instanceof CodeNode) && node.getStyle() === '') return;
            shouldHandle = true;
        });

        if (!shouldHandle) return false;

        event.preventDefault();

        // All state mutations must run inside editor.update().
        editor.update(() => {
            const selection = $getSelection();
            if (!selection?.isCollapsed()) return;

            const node = selection.anchor.getNode();
            const offset = selection.anchor.offset;
            const text = node.getTextContent();
            const boundary = $createBoundaryNode();

            if (offset === 0) {
                // At start: insert boundary before the node
                node.insertBefore(boundary);
            } else if (offset === text.length) {
                // At end: insert boundary after the node
                node.insertAfter(boundary);
            } else if (node instanceof CodeNode) {
                // Mid CodeNode: splitText() does not preserve CodeNode type
                // (it uses the raw constructor, not clone()), so split manually.
                const leftCode = $createCodeNode(text.slice(0, offset));
                const rightCode = $createCodeNode(text.slice(offset));
                node.insertBefore(leftCode);
                leftCode.insertAfter(boundary);
                boundary.insertAfter(rightCode);
                node.remove();
            } else {
                // Mid styled TextNode: splitText() preserves style on both halves.
                const style = node.getStyle();
                const [leftNode, rightNode] = node.splitText(offset);
                leftNode.insertAfter(boundary);
                // Re-apply style defensively in case splitText didn't preserve it.
                if (rightNode && rightNode.getStyle() !== style) {
                    rightNode.setStyle(style);
                }
            }

            boundary.select();

            // Clear typing style so the next keystroke produces plain text.
            const newSelection = $getSelection();
            if (newSelection) {
                $patchStyleText(newSelection, CLEAR_STYLE);
            }
        });

        return true;
    };
}

export function registerBoundary(editor) {
    return mergeRegister(
        // Update listener: check invariants in read context first, then only
        // call editor.update() when a violation is detected. This prevents an
        // infinite loop — after $enforceInvariants runs, invariants are
        // satisfied and the next listener invocation exits without scheduling
        // another update.
        editor.registerUpdateListener(({ editorState }) => {
            const needsUpdate = editorState.read(() => {
                const root = $getRoot();
                const paragraph = root.getFirstChild();
                if (!paragraph) return false; // no paragraph to audit
                return $checkInvariants(paragraph);
            });

            if (needsUpdate) {
                editor.update($enforceInvariants);
            }
        }),

        // ZWS cleanup: strips boundary character when real content is typed
        // into a boundary node.
        editor.registerNodeTransform(TextNode, $boundaryCleanupTransform),

        // Ctrl+T: split CodeNode or styled TextNode at cursor.
        editor.registerCommand(
            KEY_DOWN_COMMAND,
            $makeCtrlTHandler(editor),
            COMMAND_PRIORITY_NORMAL,
        ),

    );
}
