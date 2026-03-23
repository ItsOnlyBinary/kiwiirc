import { $createTextNode, $getSelection } from 'lexical';
import { $patchStyleText } from '@lexical/selection';

import { $createAutocompleteNode } from '@/libs/lexical/AutocompleteNode';
import { $createBufferNode } from '@/libs/lexical/BufferNode';
import { $createUserNode } from '@/libs/lexical/UserNode';
import { $getAllNodes, CLEAR_STYLE } from '@/libs/lexical/helpers';
import Logger from '@/libs/Logger';

const log = Logger.namespace('AutocompletePlugin');

/**
 * Registers autocomplete behaviour on the given editor.
 *
 * @param   {import('lexical').LexicalEditor} editor
 * @param   {{ onEnd?: () => void }}          [options]
 *
 * @returns {{
 *   revertToAutocomplete: (node: import('lexical').LexicalNode, text: string) => void,
 *   createAutocomplete:   () => void,
 *   updateAutocomplete:   (value: Object) => void,
 *   cancelAutocomplete:   () => void,
 *   finaliseAutocomplete: (item: Object, network: Object, appendSpace: boolean) => void,
 *   unregister:           () => void,
 * }}
 */
export function registerAutocomplete(editor, { onEnd } = {}) {
    let activeAutocompleteID = 0;
    let nextAutocompleteID = 0;

    let insideAutocomplete = false;
    const unregisterUpdateListener = editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
            const selection = $getSelection();
            if (!selection) {
                return;
            }
            const nodes = selection.getNodes();
            if (selection.isCollapsed() && nodes[0]?.getType() === 'autocomplete') {
                insideAutocomplete = true;
            } else if (insideAutocomplete) {
                insideAutocomplete = false;
                onEnd?.();
            }
        });
    });

    // Must be called inside editor.read() or editor.update()
    function findAutocompleteNode() {
        if (!activeAutocompleteID) {
            log.error('could not find autocomplete node, no id stored');
            return null;
        }
        return $getAllNodes().find((node) => node.id === activeAutocompleteID);
    }

    /**
     * Convert a node to an AutocompleteNode in place.
     * Must be called inside editor.update().
     */
    function revertToAutocomplete(node, text) {
        activeAutocompleteID = ++nextAutocompleteID;
        const ac = $createAutocompleteNode(text, null, activeAutocompleteID);
        node.replace(ac);
        ac.selectEnd();
    }

    function createAutocomplete() {
        // If cursor is already inside an AutocompleteNode, re-register it rather than
        // splitting it (which would corrupt the node and produce duplicate text).
        let reuseId = null;
        editor.read(() => {
            const selection = $getSelection();
            if (!selection?.isCollapsed()) {
                return;
            }
            const node = selection.anchor.getNode();
            if (node.getType() === 'autocomplete') {
                reuseId = node.id;
            }
        });
        if (reuseId !== null) {
            activeAutocompleteID = reuseId;
            return;
        }

        if (activeAutocompleteID) {
            log.error('new autocomplete id overwrote existing');
        }
        activeAutocompleteID = ++nextAutocompleteID;
        const id = activeAutocompleteID;

        editor.update(() => {
            const selection = $getSelection();
            if (!selection?.isCollapsed()) {
                return;
            }
            const node = selection.anchor.getNode();
            const offset = selection.anchor.offset;
            const text = node.getTextContent();

            // Find the start of the current word (after last space, or beginning of node)
            const textBeforeCursor = text.slice(0, offset);
            const spaceIdx = textBeforeCursor.lastIndexOf(' ');
            const wordStart = spaceIdx === -1 ? 0 : spaceIdx + 1;

            // Isolate just the word segment [wordStart, offset) as its own node
            let targetNode;
            if (wordStart === 0 && offset === text.length) {
                targetNode = node;
            } else if (wordStart === 0) {
                [targetNode] = node.splitText(offset);
            } else if (offset === text.length) {
                const splits = node.splitText(wordStart);
                targetNode = splits[1];
            } else {
                const splits = node.splitText(wordStart, offset);
                targetNode = splits[1];
            }

            const autocompleteNode = $createAutocompleteNode(targetNode.getTextContent(), null, id);
            targetNode.replace(autocompleteNode);
            autocompleteNode.selectEnd();

            // Clear any active text styling so the autocomplete node is unstyled
            const newSelection = $getSelection();
            if (newSelection) {
                $patchStyleText(newSelection, CLEAR_STYLE);
            }
        });
    }

    function updateAutocomplete(value) {
        editor.update(() => {
            const node = findAutocompleteNode();
            if (!node) {
                log.error('could not find autocomplete node to update', activeAutocompleteID);
                return;
            }
            node.setSuggestion(value);
        });
    }

    function cancelAutocomplete() {
        const id = activeAutocompleteID;
        activeAutocompleteID = null;
        editor.update(() => {
            if (!id) {
                return;
            }
            const node = $getAllNodes().find((n) => n.id === id);
            if (!node) {
                log.error('could not find autocomplete node to cancel', id);
                return;
            }
            const textNode = $createTextNode(node.getTextContent());
            node.replace(textNode);
        });
    }

    function finaliseAutocomplete(item, network, appendSpace) {
        const id = activeAutocompleteID;
        activeAutocompleteID = null;
        editor.update(() => {
            if (!id) {
                log.error('could not find autocomplete node to finalise, no id stored');
                return;
            }
            const node = $getAllNodes().find((n) => n.id === id);
            if (!node) {
                log.error('could not find autocomplete node to finalise', id);
                return;
            }

            let finalNode;
            if (item.type === 'user') {
                finalNode = $createUserNode(network, item.user);
            } else if (item.type === 'buffer') {
                finalNode = $createBufferNode(item.value ?? item.text);
            } else {
                finalNode = $createTextNode(item.value ?? item.text);
            }

            node.replace(finalNode);

            if (!appendSpace) {
                finalNode.selectEnd();
                return;
            }

            const sibling = finalNode.getNextSibling();
            if (!sibling) {
                const nextNode = $createTextNode(' ');
                finalNode.insertAfter(nextNode);
                nextNode.selectEnd();
                return;
            }

            if (sibling?.getType() === 'text' && sibling.isSimpleText()) {
                const text = sibling.getTextContent();
                if (!text.startsWith(' ')) {
                    sibling.setTextContent(` ${text}`);
                }
            }

            finalNode.selectEnd();
        });
    }

    return {
        revertToAutocomplete,
        createAutocomplete,
        updateAutocomplete,
        cancelAutocomplete,
        finaliseAutocomplete,
        unregister: unregisterUpdateListener,
    };
}
