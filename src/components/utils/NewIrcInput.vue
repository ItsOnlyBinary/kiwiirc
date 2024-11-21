<template>
    <div ref="editor" class="kiwi-ircinput-editor" contenteditable="true" role="textbox" spellcheck="true" />
</template>

<script>
// eslint-disable-next-line no-unused-vars
import { createEditor, $getSelection, $getRoot, $createTextNode } from 'lexical';
// eslint-disable-next-line no-unused-vars
import { registerRichText } from '@lexical/rich-text';
import { registerPlainText } from '@lexical/plain-text';
import { mergeRegister } from '@lexical/utils';

// eslint-disable-next-line no-unused-vars
import { $generateHtmlFromNodes } from '@lexical/html';
// eslint-disable-next-line no-unused-vars
import { $patchStyleText } from '@lexical/selection';
import { markRaw } from 'vue';

import * as htmlparser from 'htmlparser2';
import * as Colours from '@/helpers/Colours';
import * as Misc from '@/helpers/Misc';
// import * as EmojiProvider from '@/libs/EmojiProvider';

export default {
    data() {
        return {
            editor: null,
            unregisterListener: null,

            current_el: null,
            current_el_pos: 0,
            current_anchor: null,
        };
    },
    mounted() {
        const config = {
            namespace: 'MyEditor',
            // theme: {
            // },
            onError: this.onError,
        };

        this.editor = markRaw(createEditor(config));
        this.editor.setRootElement(this.$refs.editor);

        // Registring Plugins
        mergeRegister(
            registerPlainText(this.editor),
        );

        this.unregisterListener = this.editor.registerUpdateListener(({ editorState }) => {
            // The latest EditorState can be found as `editorState`.
            // To read the contents of the EditorState, use the following API:
            console.log('update');
            editorState.read(() => {
                // Just like editor.update(), .read() expects a closure where you can use
                // the $ prefixed helper functions.

                // Read the contents of the EditorState here.
                const root = $getRoot();
                const selection = $getSelection();

                this.current_anchor = selection.anchor;

                console.log('update read', root, selection);
            });
        });
        console.log('mounted', this.editor);
    },
    beforeUnmount() {
        if (this.unregisterListener) {
            this.unregisterListener();
        }
    },
    methods: {
        onError(event) {
            console.error('onError', event);
        },
        applyStyleText(styles, skipHistoryStack) {
            console.log('applyStyle', styles);
            this.editor.update(
                () => {
                    const selection = $getSelection();
                    if (selection !== null) {
                        console.log('update', selection);
                        $patchStyleText(selection, styles);
                    }
                },
                skipHistoryStack ? { tag: 'historic' } : {},
            );
        },
        getValue() {
            return new Promise((resolve) => {
                this.editor.read(() => {
                    const htmlString = $generateHtmlFromNodes(this.editor, null);
                    console.log('htmlString', htmlString);
                    resolve(htmlString);
                });
            });
        },
        async buildIrcText() {
            this.updateSpacing();
            let source = await this.getValue();
            let textValue = '';

            // Toggles are IRC style and colour codes that should be reset at the end of
            // the current tag
            let toggles = [];
            function addToggle(t) {
                toggles[toggles.length - 1] += t;
            }
            function getToggles() {
                return toggles[toggles.length - 1];
            }

            let parser = new htmlparser.Parser({
                onopentag: (name, attribs) => {
                    toggles.push('');
                    console.log('tag', name, attribs);
                    let codeLookup = '';
                    if (attribs.style) {
                        let match = attribs.style.match(/color: ([^;]+)/);
                        if (match) {
                            codeLookup = match[1];
                            let mappedCode = this.code_map[codeLookup];
                            if (!mappedCode) {
                                // If we didn't have an IRC code for this colour, convert the
                                // colour to its hex form and check if we have that instead
                                let m = codeLookup.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
                                if (m) {
                                    let hex = Colours.rgb2hex({
                                        r: parseInt(m[1], 10),
                                        g: parseInt(m[2], 10),
                                        b: parseInt(m[3], 10),
                                    });
                                    mappedCode = this.code_map[hex];
                                }
                            }

                            if (mappedCode) {
                                textValue += '\x03' + mappedCode;
                                addToggle('\x03' + mappedCode);
                            }
                        }

                        if (attribs.style.indexOf('bold') > -1) {
                            textValue += '\x02';
                            addToggle('\x02');
                        }
                        if (attribs.style.indexOf('italic') > -1) {
                            textValue += '\x1d';
                            addToggle('\x1d');
                        }
                        if (attribs.style.indexOf('underline') > -1) {
                            textValue += '\x1f';
                            addToggle('\x1f');
                        }

                        // Welcome to the IE/Edge sucks section, time to do crazy things
                        // IE11 doesnt support document.execCommand('styleWithCSS')
                        // so we have individual nodes instead, which are handled below
                    } else if (attribs.color) {
                        // IE likes to remove spaces from rgb(1, 2, 3)
                        // it also likes converting rgb to hex
                        let mappedCode = this.code_map[attribs.color] ||
                            this.code_map[attribs.color.replace(/,/g, ', ')] ||
                            this.code_map[Colours.hex2rgb(attribs.color)];

                        if (mappedCode) {
                            textValue += '\x03' + mappedCode;
                            addToggle('\x03' + mappedCode);
                        }
                    } else if (name === 'strong') {
                        textValue += '\x02';
                        addToggle('\x02');
                    } else if (name === 'em') {
                        textValue += '\x1d';
                        addToggle('\x1d');
                    } else if (name === 'u') {
                        textValue += '\x1f';
                        addToggle('\x1f');
                    } else if (name === 'div' || name === 'br') {
                        // divs and breaks are both considered newlines. For each line we need to
                        // close all current toggles and then reopen them for the next so that the
                        // styles continue .
                        textValue += getToggles();
                        textValue += '\n';
                        textValue += getToggles();
                    }

                    if (name === 'img' && attribs.alt) {
                        textValue += attribs.alt;
                    }
                },
                ontext: (text) => {
                    textValue += text;
                },
                onclosetag: (tagName) => {
                    textValue += getToggles();
                    toggles.pop();
                },
            }, {
                decodeEntities: true,
            });

            parser.write(source);
            parser.end();

            // Firefox likes to add <br/> at the end (some times inside the span)
            // fix by filtering out any lines that contain no content
            return textValue.split(/\r?\n/).filter((line) => !!Misc.stripStyles(line)).join('\n');
        },
        getCurrentWord(toPosition) {
            return new Promise((resolve) => {
                this.editor.read(() => {
                    const selection = $getSelection();
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
                    resolve(result);
                });
            });

            // let el = this.current_el;
            // let pos = this.current_el_pos;
            // console.log('getCurrentWord', this, el);
            // let val = el.textContent;
            // let cleanVal = val.replace(/\xA0/g, ' ');

            // let startVal = cleanVal.substr(0, pos);
            // let space = startVal.lastIndexOf(' ');
            // if (space === -1) {
            //     space = 0;
            // } else {
            //     // include the space after the word
            //     space++;
            // }
            // let startPos = space;

            // space = cleanVal.indexOf(' ', startPos);
            // if (space === -1) {
            //     space = val.length;
            // }
            // let endPos = toPosition ? pos - startPos : space;

            // return {
            //     word: val.substr(startPos, endPos),
            //     position: pos - startPos,
            // };
        },
    },
};
</script>
