import {
    $getSelection,
    COMMAND_PRIORITY_NORMAL,
    COPY_COMMAND,
    CUT_COMMAND,
    TextNode
} from 'lexical';
import { $generateHtmlFromNodes } from '@lexical/html';
import { mergeRegister } from '@lexical/utils';

import { CodeNode } from '@/libs/lexical/CodeNode';

// Build plain-text clipboard content from a RangeSelection, stripping all
// \u200B characters and wrapping CodeNode content in backticks.
//
// We cannot use selection.getTextContent() for this because Lexical slices
// each node's text by the raw DOM offsets (anchor.offset / focus.offset).
// If CodeNode.getTextContent() returned backtick-wrapped text (length + 2),
// those offsets would index into the wrong positions of the longer string.
// Instead we iterate nodes directly, using the raw text for offset math and
// adding backticks only after slicing.
function $buildPlainText(selection) {
    const nodes = selection.getNodes();
    if (!nodes.length) return '';

    const isBefore = selection.anchor.isBefore(selection.focus);
    const startOff = isBefore ? selection.anchor.offset : selection.focus.offset;
    const endOff = isBefore ? selection.focus.offset : selection.anchor.offset;
    const firstNode = nodes[0];
    const lastNode = nodes[nodes.length - 1];

    let text = '';

    for (const node of nodes) {
        if (!(node instanceof TextNode)) continue;

        const isCode = node instanceof CodeNode;
        // getCodeText() for CodeNode: raw text, no backticks.
        // getTextContent() for plain TextNode: raw text, may include \u200B.
        const nodeText = isCode ? node.getCodeText() : node.getTextContent();

        // Slice to the selected portion using the raw DOM offsets.
        let slice = nodeText;
        if (node === firstNode && node === lastNode) {
            slice = nodeText.slice(Math.min(startOff, endOff), Math.max(startOff, endOff));
        } else if (node === firstNode) {
            slice = nodeText.slice(startOff);
        } else if (node === lastNode) {
            slice = nodeText.slice(0, endOff);
        }

        const clean = slice.replace(/\u200B/g, '');

        if (isCode) {
            // Add opening backtick if the selection starts at the beginning of
            // the code node; closing backtick if it ends at the end.
            const addOpen = node !== firstNode || startOff === 0;
            const addClose = node !== lastNode || endOff >= nodeText.length;
            text += (addOpen ? '`' : '') + clean + (addClose ? '`' : '');
        } else {
            text += clean;
        }
    }

    return text;
}

// Shared handler for COPY_COMMAND and CUT_COMMAND.
//
// Command handlers run inside Lexical's updateEditorSync(), so the handler is
// already in an active update context — $getSelection() and mutation calls
// work directly with no need for editor.read() or editor.update() wrappers.
//
// event.preventDefault() is essential: without it the browser's native
// copy/cut runs after our handler, overwrites the clipboard with raw text
// (including \u200B), and for cut also deletes the selection a second time.
function $makeClipboardHandler(editor, isCut) {
    return (event) => {
        if (!event?.clipboardData) return false;

        const selection = $getSelection();
        if (!selection) return false;

        const text = $buildPlainText(selection);
        const html = $generateHtmlFromNodes(editor, selection).replace(/\u200B/g, '');

        event.clipboardData.setData('text/plain', text);
        event.clipboardData.setData('text/html', html);
        event.preventDefault();

        if (isCut) {
            selection.removeText();
        }

        return true;
    };
}

export function registerClipboard(editor) {
    return mergeRegister(
        editor.registerCommand(COPY_COMMAND, $makeClipboardHandler(editor, false), COMMAND_PRIORITY_NORMAL),
        editor.registerCommand(CUT_COMMAND, $makeClipboardHandler(editor, true), COMMAND_PRIORITY_NORMAL),
    );
}
