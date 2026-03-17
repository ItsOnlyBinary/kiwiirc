<template>
    <div
        ref="editor-div"
        class="kiwi-ircinput-editor"
        contenteditable="true"
        role="textbox"
        spellcheck="true"
        :placeholder="placeholder"
        :class="{ 'kiwi--focus': hasFocus, 'kiwi--empty': isEmpty }"
        @blur="onBlur"
        @click="emit('click', $event)"
        @focus="onFocus"
        @input="onInput"
        @beforeinput="onBeforeInput"
        @keydown="onKeyDown($event);emit('keydown', $event)"
        @keyup="onKeyUp($event);emit('keyup', $event)"
    />
</template>

<script setup>
/* eslint "sort-imports": ["error", { "allowSeparatedGroups": true }] */
/* eslint-disable no-unused-vars */
import {
    $createParagraphNode,
    $createTextNode,
    $getRoot,
    $getSelection,
    $setSelection,
    COMMAND_PRIORITY_NORMAL,
    CONTROLLED_TEXT_INSERTION_COMMAND,
    KEY_DOWN_COMMAND,
    KEY_ENTER_COMMAND,
    ParagraphNode,
    RootNode,
    createEditor
} from 'lexical';
import { $patchStyleText, $selectAll, getStyleObjectFromCSS } from '@lexical/selection';
import { markRaw, onBeforeUnmount, onMounted, reactive, ref, useTemplateRef } from 'vue';
import { $generateHtmlFromNodes } from '@lexical/html';
import { mergeRegister } from '@lexical/utils';
import { registerPlainText } from '@lexical/plain-text';

import { $createAutocompleteNode, AutocompleteNode } from '@/libs/lexical/AutocompleteNode';
import { $createEmojiNode, EmojiNode } from '@/libs/lexical/EmojiNode';
import { $createUserNode, UserNode } from '@/libs/lexical/UserNode';
import { $getAllNodes } from '@/libs/lexical/helpers';

import { useTimeouts } from '@/helpers/Misc';

import Logger from '@/libs/Logger';

const log = Logger.namespace('IrcInput');

const defaultStyle = {
    'color': null,
    'background-color': null,
    'font-weight': null,
    'font-style': null,
    'text-decoration': null,
};

const { placeholder } = defineProps({
    placeholder: {
        type: String,
        default: '',
    },
});

const emit = defineEmits([
    'blur',
    'click',
    'focus',
    'input',
    'keydown',
    'keyup',
    'textInput',
    'autocompleteEnded',
]);

let activeAutocompleteID = 0;
let nextAutocompleteID = 0;

let editor = null;
const editorConfig = {
    nodes: [AutocompleteNode, EmojiNode, UserNode],
};
const editorElement = useTemplateRef('editor-div');
const editorListeners = [];

const currentStyle = reactive(Object.assign({}, defaultStyle));
const hasFocus = ref(false);
const isEmpty = ref(true);

const timeoutManager = useTimeouts();
const focusTimeout = timeoutManager.create();
const blurTimeout = timeoutManager.create();

onMounted(() => {
    editor = markRaw(createEditor({ ...editorConfig, onError }));
    editor.setRootElement(editorElement.value);
    editor.update(() => {
        const paragraphNode = $createParagraphNode();
        $getRoot().append(paragraphNode);
        paragraphNode.selectEnd();
    });

    // Register Plugins
    mergeRegister(
        registerPlainText(editor),
    );

    // Register Listeners
    editorListeners.push(
        editor.registerCommand(
            KEY_ENTER_COMMAND,
            // Ignore enter unless it also includes shift or alt
            (event) => !event.shiftKey && !event.altKey,
            COMMAND_PRIORITY_NORMAL
        ),
        // editor.registerCommand(
        //     CONTROLLED_TEXT_INSERTION_COMMAND,
        //     onInsert,
        //     COMMAND_PRIORITY_NORMAL
        // ),
        editor.registerCommand(
            KEY_DOWN_COMMAND,
            editorKeyDown,
            COMMAND_PRIORITY_NORMAL,
        ),
    );

    let insideAutocomplete = false;
    editorListeners.push(
        editor.registerUpdateListener(({ editorState }) => {
            const requiredUpdates = editorState.read(() => {
                isEmpty.value = !$getRoot().getTextContent();
                const selection = $getSelection();
                if (!selection) {
                    return null;
                }
                console.log('selection update', selection);
                const nodes = selection.getNodes();

                if (selection.isCollapsed() && nodes[0].getType() === 'autocomplete') {
                    insideAutocomplete = true;

                    if (selection.anchor.offset !== nodes[0].getTextContent().length) {
                        // Move cursor to end of autocomplete
                        return { autocomplete: true };
                    }
                } else if (insideAutocomplete) {
                    insideAutocomplete = false;
                    emit('autocompleteEnded');
                }

                let style = null;
                if (nodes.length && !selection.isCollapsed()) {
                    const node = selection.isBackward() ? nodes[nodes.length - 1] : nodes[0];
                    style = getStyleObjectFromCSS(node.getStyle());
                } else {
                    if (nodes[0].getType() === 'code' && selection.style) {
                        return { codeStyle: true };
                    }
                    style = getStyleObjectFromCSS(selection.style);
                }

                Object.assign(currentStyle, defaultStyle, style);

                return null;
            });

            if (!requiredUpdates) {
                return;
            }

            editor.update(() => {
                const selection = $getSelection();
                const nodes = selection.getNodes();

                if (requiredUpdates.autocomplete) {
                    console.log('updating caret position');
                    nodes[0].selectEnd();
                } else if (requiredUpdates.codeStyle) {
                    $patchStyleText(selection, defaultStyle);
                }
            });
        })
    );
});

onBeforeUnmount(() => {
    editorListeners.forEach((listener) => listener());
    timeoutManager.cancelAll();
});

/* Events */
const onError = (error) => {
    log.error('Lexical', error);
};

const onFocus = (event) => {
    // workaround for chromium failing to pass focus to lexical
    // when the placeholder is removed
    focusTimeout(() => (hasFocus.value = true), 0);
    emit('focus', event);
};

const onBlur = (event) => {
    // workaround for chromium failing to pass focus to lexical
    // when the placeholder is removed
    // the blur is so this cannot be fired before onFocus
    blurTimeout(() => (hasFocus.value = false), 0);
    emit('blur', event);
};

const onKeyUp = () => {};
const onKeyDown = (event) => {
    console.log('onKeyDown', event);
};
const onInput = (event) => {
    console.log('onInput', event);
};
const onBeforeInput = (event) => {
    console.log('onBeforeInput', event);
    if (event.inputType === 'insertText' && event.data === '`') {
        // unused
    }
};

const onInsert = (event) => {
    console.log('onInsert', event);
};

const maybeCreateCodeNode = (event) => {
    editor.update(() => {
        const selection = $getSelection();
        const nodes = selection.getNodes();

        if (selection.isCollapsed()) {
            console.log('nodes', nodes);
            if (nodes[0].getType() === 'paragraph') {
                console.log('createCode');
                event.preventDefault();
                return;
            }

            const text = nodes[0].getTextContent();
            const offset = selection.anchor.offset;
            const nextSibling = nodes[0].getNextSibling();
            console.log('test', nodes[0].getType() !== 'code', !nextSibling, offset, text.length);
            if (nodes[0].getType() !== 'code' && !nextSibling && offset === text.length) {
                // const [, targetNode] = nodes[0].splitText(selection.anchor.offset);
                // nodes[0].spliceText(text.length, 0, '~', false);
                // nodes[0].select(text.length - 1, text.length - 1);
                // nodes[0].selectEnd();
                event.preventDefault();
            }
            // else {
            //     let nextSibling = nodes[0].getNextSibling();
            //     if (!nextSibling || nextSibling.getType() !== 'text') {
            //         nextSibling = $createTextNode('');
            //         nodes[0].insertAfter(nextSibling);
            //     }
            //     nextSibling.selectStart();
            // }
        } else {
            const codeText = selection.getTextContent();
            event.preventDefault();
        }
    });
};

const editorKeyDown = (event) => {
    console.log('editorKeyDown', event);
    if (event.key === '`') {
        maybeCreateCodeNode(event);
    }
};

// const onKeyUp = editorKeyDown;

const focus = (triggerEvent) => {
    editorElement.value.focus();
    editor.focus(() => console.log('got focus'));
    if (triggerEvent?.key === '`') {
        editorKeyDown(triggerEvent);
    }
    // if (triggerEvent) {
    //     if (triggerEvent.key === '`') {
    //         triggerEvent.preventDefault();
    //     }
    //     editorElement.value.dispatchEvent(new KeyboardEvent(triggerEvent.type, triggerEvent));
    // }
    //     const newEvent = new KeyboardEvent('keydown', {
    //         bubbles: false,
    //         cancelable: true,
    //         key: triggerEvent.key,
    //         code: triggerEvent.code,
    //         keyCode: triggerEvent.keyCode,
    //     });
    //     newEvent.preventDefault();
    //     // triggerEvent.preventDefault();
    //     editorElement.value.dispatchEvent(newEvent);
    // }
};

const lock = () => editor.setEditable(false);

const unlock = () => editor.setEditable(true);

/* Styles */

/**
 * Set the text style on the currently selected text or caret position
 *
 * @param   {{
 *     color?: string | null,
 *     background-color?: string | null,
 *     font-weight?: string | null,
 *     font-style?: string | null,
 *     text-decoration?: string | null
 *  }} styles
 *   A css styles object containing the styles that require changing
 *
 * @returns {void}
 */
const setStyle = (styles) => {
    focus();
    editor.update(() => {
        const selection = $getSelection();
        if (!selection) {
            return;
        }
        $patchStyleText(selection, styles);
    });
};

/**
 * Set the text colour and background on the currently selected text or caret position
 *
 * @param   {{
 *     color: string | null,
 *     background-color?: string | null
 * }} styles A css styles
 *   object containing color and/or background-color
 *
 * @returns {void}
 */
const toggleColourStyle = (styles) => {
    // TODO revisit
    Object.entries(styles).forEach(([key, value]) => {
        if (currentStyle[key] !== value) {
            return;
        }

        styles[key] = null;

        if (key === 'color') {
            // we can not have a background colour without a foreground
            styles['background-color'] = null;
        }
    });
    console.log('toggleColourStyle', styles);
    setStyle(styles);
};

/**
 * Performs a toggle of styles on the currently selected text or caret position
 *
 * @param   {'color' | 'background-color' | 'bold' | 'italic' | 'underline' | 'strikethrough'} key
 *   The style to toggle
 * @param   {string}                                                                           [value]
 *   The style value to toggle for `color` and `background-color`
 *
 * @returns {void}
 */
const toggleStyle = (key, value) => {
    const styles = {};

    if (key === 'color' || key === 'background-color') {
        if (value === currentStyle[key]) {
            styles[key] = null;
            if (key === 'color') {
                styles['background-color'] = null;
            }
        } else {
            styles[key] = value;
        }
    } else if (key === 'bold') {
        styles['font-weight'] = currentStyle['font-weight'] === 'bold' ? null : 'bold';
    } else if (key === 'italic') {
        styles['font-style'] = currentStyle['font-style'] === 'italic' ? null : 'italic';
    } else if (key === 'underline' || key === 'strikethrough') {
        const prop = key === 'underline' ? 'underline' : 'line-through';
        const decor = currentStyle['text-decoration']
            ? currentStyle['text-decoration'].split(' ')
            : [];
        const index = decor.indexOf(prop);
        if (index > -1) {
            decor.splice(index, 1);
        } else {
            decor.push(prop);
        }
        styles['text-decoration'] = decor.length ? decor.join(' ') : null;
    }
    setStyle(styles);
};

/**
 * Remove all text styles on the currently selected text or caret position
 *
 * @returns {void}
 */
const clearStyles = () => {
    setStyle(defaultStyle);
};

/**
 * Remove all text styles on all text currently within the editor
 *
 * @returns {void}
 */
const resetStyles = () => {
    editor.update(() => {
        const selection = $getSelection();
        const allSelection = selection.clone();
        $selectAll(allSelection);
        $patchStyleText(allSelection, defaultStyle);
        $patchStyleText(selection, defaultStyle);
        $setSelection(selection);
    });
};

/**
 * Generates HTML from the current editor state
 *
 * @returns {string}
 */
const getHTML = () => editor.read(() => $generateHtmlFromNodes(editor, null));

/**
 * Gets the text content from the current editor
 *
 * @returns {string}
 */
const getText = () => editor.read(() => $getRoot().getTextContent());

const getWord = () => editor.read(() => {
    const selection = $getSelection();
    if (!selection?.isCollapsed()) {
        return {
            word: '',
            position: 0,
        };
    }

    const node = selection.anchor.getNode();
    const text = node.getTextContent().slice(0, selection.anchor.offset);
    let startPos = text.lastIndexOf(' ');
    startPos = startPos === -1 ? 0 : startPos + 1;
    return {
        word: text.slice(startPos),
        position: selection.anchor.offset,
    };
});

/**
 * Gets a serialisable and restorable editor state
 *
 * @returns {Object}
 */
const getState = () => editor.read(() => {
    const editorState = editor.getEditorState();
    const jsonState = editorState.toJSON();
    if (!jsonState) {
        log.error('failed to get editor state');
        return '';
    }
    console.log('json', JSON.stringify(jsonState));
    return JSON.stringify(jsonState);
});

/**
 * Gets a serialisable and restorable editor state
 *
 * @param   {string} state
 *
 * @returns {void}
 */
const setState = (state) => {}; // TODO

const resetState = (restoreCurrentStyle) => editor.update(() => {
    $getRoot().clear();
    if (!restoreCurrentStyle) {
        return;
    }
    const selection = $getSelection();
    if (!selection) {
        return;
    }
    $patchStyleText(selection, currentStyle);
});

/**
 * Add an emoji instead of the currently selected text or at the current caret position
 *
 * @param   {Object} emoji An emoji object provided by EmojiProvider
 *
 * @returns {void}
 */
const addEmoji = (emoji) => editor.update(() => {
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
        selection.removeText();
    }

    const nodes = selection.getNodes();
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

const findAutocompleteNode = () => {
    if (!activeAutocompleteID) {
        log.error('could not find autocomplete node, no id stored');
        return null;
    }
    return $getAllNodes().find((node) => node.id === activeAutocompleteID);
};

const createAutocomplete = () => {
    if (activeAutocompleteID) {
        log.error('new autocomplete id overwrote existing');
    }
    activeAutocompleteID = ++nextAutocompleteID;
    editor.update(() => {
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
            activeAutocompleteID
        );
        targetNode.replace(autocompleteNode);
    });
};

const updateAutocomplete = (value) => {
    editor.update(() => {
        const node = findAutocompleteNode();
        if (!node) {
            log.error('could not find autocomplete node to update', activeAutocompleteID);
            return;
        }
        node.setSuggestion(value);
    });
};

const cancelAutocomplete = () => {
    activeAutocompleteID = null;
    editor.update(() => {
        const node = findAutocompleteNode();
        if (!node) {
            log.error('could not find autocomplete node to cancel', activeAutocompleteID);
            return;
        }
        const textNode = $createTextNode(node.getTextContent());
        node.replace(textNode);
    });
};

const finaliseAutocomplete = (item, network, appendSpace) => {
    activeAutocompleteID = null;
    editor.update(() => {
        const node = findAutocompleteNode();
        if (!node) {
            log.error('could not find autocomplete node to finalise', activeAutocompleteID);
            return;
        }

        let finalNode;
        if (item.type === 'user') {
            finalNode = $createUserNode(network, item.user);
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
                // Add a space to beginning of next node
                sibling.setTextContent(` ${text}`);
            }
        }

        finalNode.selectEnd();
    });
};

defineExpose({
    currentStyle,

    focus,
    lock,
    unlock,

    // getCaretIdx,
    // setSelectionEnd,
    // setSelectionStart,

    setStyle,
    toggleColourStyle,
    toggleStyle,
    clearStyles,
    resetStyles,

    getHTML,
    getText,
    getWord,
    getState,
    setState,
    resetState,

    addEmoji,

    createAutocomplete,
    updateAutocomplete,
    cancelAutocomplete,
    finaliseAutocomplete,
});
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

.code-node {
    border: 1px solid #b5b5b5;
    padding: 0 3px;
    border-radius: 3px;
    background: rgb(0, 0, 0, 0.05);
    font-family: monospace;
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
