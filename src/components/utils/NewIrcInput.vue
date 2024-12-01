<template>
    <div
        ref="editor"
        class="kiwi-ircinput-editor"
        contenteditable="true"
        role="textbox"
        spellcheck="true"
        :placeholder="placeholder"
        :class="{ 'kiwi--focus': hasFocus, 'kiwi--empty': isEmpty }"
        @focus="onFocus"
        @blur="onBlur"
    />
</template>

<script>
import {
    createEditor,
    $getSelection,
    $getRoot,
    $setSelection,
    ParagraphNode,
    RootNode,
    $createParagraphNode,
    KEY_ENTER_COMMAND,
    COMMAND_PRIORITY_NORMAL,
    $createTextNode,
} from 'lexical';
import { registerPlainText } from '@lexical/plain-text';
import { mergeRegister } from '@lexical/utils';

import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $patchStyleText, $selectAll, getStyleObjectFromCSS } from '@lexical/selection';
import { markRaw } from 'vue';

import { EmojiNode, $createEmojiNode } from '@/libs/lexical/EmojiNode';
import { $createAutocompleteNode, AutocompleteNode } from '@/libs/lexical/AutocompleteNode';
import { $getAllNodes } from '@/libs/lexical/helpers';
import { $createUserNode, UserNode } from '@/libs/lexical/UserNode';

import Logger from '@/libs/Logger';

const log = Logger.namespace('IrcInput');

const resetStyles = {
    'color': null,
    'background-color': null,
    '--kiwi-irc-fg': null,
    '--kiwi-irc-bg': null,
    'font-weight': null,
    'font-style': null,
    'text-decoration': null,
};

let nextAutocompleteID = 0;

export default {
    props: ['placeholder'],
    emits: ['focus', 'blur'],
    data() {
        return {
            editor: null,
            listeners: [],
            hasFocus: false,
            isEmpty: true,
            activeAutocompleteID: null,

            current_el: null,
            current_el_pos: 0,
            current_anchor: null,

            currentStyle: {},
        };
    },
    mounted() {
        const config = {
            // theme: {
            // },
            onError: this.onError,
            nodes: [EmojiNode, AutocompleteNode, UserNode],
        };

        this.editor = markRaw(createEditor(config));
        this.editor.setRootElement(this.$refs.editor);

        // Register Plugins
        mergeRegister(registerPlainText(this.editor));

        const enterListener = this.editor.registerCommand(
            KEY_ENTER_COMMAND,
            (event) => !event.shiftKey && !event.altKey,
            COMMAND_PRIORITY_NORMAL
        );

        this.listeners.push(enterListener);

        const updateListener = this.editor.registerUpdateListener(({ editorState }) => {
            // The latest EditorState can be found as `editorState`.
            // To read the contents of the EditorState, use the following API:
            console.log('update');
            const updatesNeeded = editorState.read(() => {
                this.isEmpty = !$getRoot().getTextContent();
                const selection = $getSelection();

                if (selection) {
                    this.current_anchor = selection.anchor;
                    const nodes = selection.getNodes();

                    if (
                        selection.isCollapsed() &&
                        nodes.length === 1 &&
                        nodes[0].getType() === 'autocomplete' &&
                        selection.anchor.offset !== nodes[0].getTextContent().length
                    ) {
                        return { autocomplete: true };
                    }

                    if (
                        selection.isCollapsed() &&
                        nodes.length === 1 &&
                        nodes[0].getType() === 'text'
                    ) {
                        const parent = nodes[0].getParent();
                        console.log('maybe', parent?.getType());
                    }

                    console.log('nodes', nodes);

                    let style = null;
                    if (nodes.length && !selection.isCollapsed()) {
                        const node = selection.isBackward() ? nodes[nodes.length - 1] : nodes[0];
                        style = getStyleObjectFromCSS(node.getStyle());
                    } else {
                        style = getStyleObjectFromCSS(selection.style);
                    }

                    this.currentStyle = style;

                    console.log('style', style);
                }

                // console.log('html', $generateHtmlFromNodes(this.editor));
                console.log('update read', selection);
                return false;
            });

            if (!updatesNeeded) {
                return;
            }

            this.editor.update(() => {
                const selection = $getSelection();
                const nodes = selection.getNodes();

                if (updatesNeeded.autocomplete) {
                    nodes[0].selectEnd();
                }
            });
        });

        this.listeners.push(updateListener);
        console.log('mounted', this.editor);
    },
    beforeUnmount() {
        this.listeners.forEach((listener) => listener());
    },
    methods: {
        onBlur(event) {
            // workaround for chromium failing to pass focus when
            // placeholder is removed
            // the blur is so this cannot be fired before onFocus
            this.setTimeout(() => (this.hasFocus = false), 0);
            this.$emit('blur', event);
        },
        onFocus(event) {
            // workaround for chromium failing to pass focus when
            // placeholder is removed
            this.setTimeout(() => (this.hasFocus = true), 0);
            this.$emit('focus', event);
        },
        focus() {
            console.log('focus');
            this.$refs.editor.focus();
            this.editor.focus();
        },
        onError(event) {
            console.error('onError', event);
        },
        applyTextStyle(styles) {
            console.log('applyTextStyle', styles);
            Object.entries(styles).forEach(([key, value]) => {
                if (this.currentStyle[key] !== value) {
                    return;
                }

                styles[key] = null;

                if (key === 'color') {
                    // we can not have a background colour without a foreground
                    styles['background-color'] = null;
                }
            });
            this.setStyle(styles);
        },
        setStyle(styles) {
            console.log('setStyle', styles);
            this.$refs.editor.focus();
            this.editor.update(() => {
                const selection = $getSelection();
                if (selection !== null) {
                    $patchStyleText(selection, styles);
                }
            });
        },
        toggleStyle(key) {
            const styles = {};

            if (key === 'bold') {
                styles['font-weight'] = this.currentStyle['font-weight'] === 'bold' ? null : 'bold';
            } else if (key === 'italic') {
                styles['font-style'] =
                    this.currentStyle['font-style'] === 'italic' ? null : 'italic';
            } else if (key === 'underline' || key === 'strikethrough') {
                const prop = key === 'underline' ? 'underline' : 'line-through';
                const decor = this.currentStyle['text-decoration']
                    ? this.currentStyle['text-decoration'].split(' ')
                    : [];
                const index = decor.indexOf(prop);
                if (index > -1) {
                    decor.splice(index, 1);
                } else {
                    decor.push(prop);
                }
                styles['text-decoration'] = decor.length ? decor.join(' ') : null;
            }
            this.setStyle(styles);
        },
        clearStyles() {
            this.setStyle(resetStyles);
        },
        resetStyles() {
            this.editor.update(() => {
                const selection = $getSelection();
                const allSelection = selection.clone();
                $selectAll(allSelection);
                $patchStyleText(allSelection, resetStyles);
                $patchStyleText(selection, resetStyles);
                $setSelection(selection);
            });
        },
        reset(rawHTML, shouldFocus) {
            const currentStyle = Object.apply({}, this.currentStyle);
            const currentFocus = document.activeElement;

            this.focus();

            this.editor.update(() => {
                const root = $getRoot();
                root.clear();

                if (rawHTML) {
                    const parser = new DOMParser();
                    const dom = parser.parseFromString(rawHTML, 'text/html');
                    const node = $generateNodesFromDOM(dom);
                    root.append(node);
                    root.selectEnd();
                } else {
                    const selection = $getSelection();
                    $patchStyleText(selection, currentStyle);
                }

                if (!shouldFocus && currentFocus && currentFocus !== this.$refs.editor) {
                    currentFocus.focus();
                }
            });
        },
        getRawText() {
            return this.editor.read(() => $getRoot().getTextContent());
        },
        addEmoji(emoji) {
            this.editor.update(() => {
                const createOnRoot = (appendNode) => {
                    const paragraph = $createParagraphNode();
                    paragraph.append(appendNode);
                    $getRoot().append(paragraph);
                    appendNode.selectEnd();
                };

                const emojiNode = $createEmojiNode(emoji);

                const selection = $getSelection();
                if (!selection) {
                    createOnRoot(emojiNode);
                    return;
                }

                if (!selection.isCollapsed()) {
                    console.log('collapsing selection');
                    selection.removeText();
                }

                const nodes = selection.getNodes();
                console.log('nodes', nodes);
                const node = nodes[0];
                if (node instanceof RootNode) {
                    createOnRoot(emojiNode);
                } else if (node instanceof ParagraphNode) {
                    node.clear();
                    node.append(emojiNode);
                } else if (!node.isSimpleText()) {
                    node.insertAfter(emojiNode);
                } else {
                    const offset = selection.anchor.offset;
                    const splitNodes = node.splitText(offset, offset);

                    splitNodes[0].insertAfter(emojiNode);
                }

                emojiNode.selectEnd();
            });
        },
        getAutocompleteNode() {
            if (this.activeAutocompleteID) {
                log.error('new autocomplete id overwrote existing');
            }
            this.activeAutocompleteID = ++nextAutocompleteID;
            this.editor.update(() => {
                const selection = $getSelection();
                const node = selection.getNodes()[0];
                const offset = selection.anchor.offset;

                let targetNode;
                if (offset === 1) {
                    [targetNode] = node.splitText(offset - 1, offset);
                } else {
                    [, targetNode] = node.splitText(offset - 1, offset);
                }

                const autocompleteNode = $createAutocompleteNode(
                    targetNode.getTextContent(),
                    null,
                    this.activeAutocompleteID
                );
                console.log('ac node', offset, targetNode, autocompleteNode);
                targetNode.replace(autocompleteNode);
            });
        },
        updateAutocomplete(value) {
            if (!this.activeAutocompleteID) {
                log.error('no autocomplete id to update');
                return;
            }
            console.log('updateAutocomplate', this.activeAutocompleteID, value);
            this.editor.update(() => {
                const autocompleteNode = $getAllNodes().find(
                    (node) => node.id === this.activeAutocompleteID
                );
                if (!autocompleteNode) {
                    console.error('Could not find node to update', this.activeAutocompleteID);
                }
                console.log('updateAutocomplete', autocompleteNode);
                autocompleteNode.setSuggestion(value);
            });
        },
        cancelAutocomplete() {
            this.editor.update(() => {
                const autocompleteNode = $getAllNodes().find(
                    (node) => node.id === this.activeAutocompleteID
                );
                if (!autocompleteNode) {
                    console.error('Could not find node to cancel', this.activeAutocompleteID);
                }

                console.log('cancelAutocomplete', autocompleteNode);
                const textNode = $createTextNode(autocompleteNode.getTextContent());
                autocompleteNode.replace(textNode);
            });

            this.activeAutocompleteID = null;
        },
        autocompleteFinalise(item, network, noSpace) {
            this.editor.update(() => {
                const autocompleteNode = $getAllNodes().find(
                    (node) => node.id === this.activeAutocompleteID
                );
                if (!autocompleteNode) {
                    console.error('Could not find node to update', this.activeAutocompleteID);
                }
                console.log('autocompleteFinalise', autocompleteNode);

                let finalNode;
                if (item.type === 'user') {
                    finalNode = $createUserNode(network, item.user);
                } else {
                    finalNode = $createTextNode(item.value ?? item.text);
                }

                autocompleteNode.replace(finalNode);

                if (noSpace) {
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
                    if (!text.beginsWith(' ')) {
                        // Add a space to beginning of next node
                        sibling.setTextContent(` ${text}`);
                    }
                }

                finalNode.selectEnd();
            });

            this.activeAutocompleteID = null;
        },
        getValue() {
            return this.editor.read(() => $generateHtmlFromNodes(this.editor, null));
        },
        setValue(newVal) {
            // TODO
            console.log('setValue');
        },
        getCurrentWord(toPosition) {
            return this.editor.read(() => {
                const selection = $getSelection();
                if (!selection.isCollapsed()) {
                    return '';
                }
                const anchor = selection.anchor;
                const currentNode = anchor.getNode();
                console.log('currentNode', currentNode);

                const pos = anchor.offset;
                const val = currentNode.getTextContent();
                let startVal = val.substr(0, pos);
                let space = startVal.lastIndexOf(' ');
                if (space === -1) {
                    space = 0;
                } else {
                    // include the space after the word
                    space++;
                }
                let startPos = space;
                space = val.indexOf(' ', startPos);
                if (space === -1) {
                    space = val.length;
                }
                let endPos = toPosition ? pos - startPos : space;

                const result = {
                    word: val.substr(startPos, endPos),
                    position: pos - startPos,
                };

                console.log('word', result);
                return result;
            });
        },
    },
};
</script>

<style>
.kiwi-ircinput-editor {
    position: relative;
    overflow: hidden auto;
    outline: none;
    padding: 7px 0 8px 0;
    box-sizing: border-box;

    /* When the contenteditable div is empty firefox makes its height 0px */
    height: 100%;
}

.kiwi-ircinput-editor.kiwi--empty:not(.kiwi--focus)::before {
    position: absolute;
    content: attr(placeholder);
    cursor: text;
}

.kiwi-ircinput-editor p {
    margin: 0;
}

.emoji-node {
    vertical-align: bottom;
    color: transparent;
    caret-color: var(--brand-default-fg);
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    letter-spacing: 1em;
    font-size: 1.4em;
    overflow: hidden;
}

.autocomplete-remain {
    opacity: 0.5;
    pointer-events: none;
    user-select: none;
}

.user-node {
    cursor: pointer;
}

.kiwi-ircinput-editor .user-node .kiwi-awaystatusindicator {
    margin: 0 2px 0 0;
}

@supports (font-size: round(down, 1.4em, 1px)) {
    .emoji-node {
        font-size: round(down, 1.4em, 1px);
    }
}
</style>
