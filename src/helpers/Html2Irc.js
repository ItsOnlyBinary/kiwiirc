import { getStyleObjectFromCSS } from '@lexical/selection';
import * as htmlparser from 'htmlparser2';

import Logger from '@/libs/Logger';

const log = Logger.namespace('Html2Irc');

const EMOJI_NODE_CLASS = 'emoji-node';
const CODE_NODE_CLASS = 'code-node';

const varColourRegexp = /^var\(--irc-colour-(\d+)\)$/;
const endsWithFgColourRegexp = /\x03\d+$/;
const endsWithResetColourRegexp = /\x03$/;
const startsWithCommaDecimalRegexp = /^,\d+/;
const startsWithDecimalRegexp = /^\d+/;
const trailingSpacesRegex = /(\s+)$/;
const leadingSpacesRegex = /^(\03(?:\d{2},\d{2}|\d{2})?|[\x02\x1d\x1f\x1e\x11\x0f])+(\s+)/;
// const spaceAfterColoursRegexp = /(\03(?:\d{2},\d{2}|\d{2})?|[\x02\x1d\x1f\x1e\x11\x0f])(\s+)/g;

const defaultIrcStyle = {
    fg: null,
    bg: null,
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
};

export default function html2irc(source) {
    let ircText = '';

    const currentIrcStyle = Object.assign({}, defaultIrcStyle);

    const openTags = [];
    let checkSpace = false;
    let previousTag = '';
    // let nextStyleChange = '';

    const parser = new htmlparser.Parser({
        onopentag: (name, attribs) => {
            if (name === 'br') {
                ircText += '\n';
            }

            if (attribs.class === EMOJI_NODE_CLASS) {
                openTags.push('emoji');
                const emoji = attribs['data-code'];
                if (!emoji) {
                    return;
                }
                const needSpace = !['', ' '].includes(ircText.slice(-1));
                ircText += needSpace ? ` ${emoji}` : emoji;
                checkSpace = true;
                return;
            }

            openTags.push(name);

            const style = getStyleObjectFromCSS(attribs.style || '');
            const ircStyle = style2IrcStyle(style);
            const ircStyleDiff = getIrcStyleDiff(currentIrcStyle, ircStyle);
            const styleChange = ircStyleDiff2IrcCodes(currentIrcStyle, ircStyleDiff);

            if (attribs.class === CODE_NODE_CLASS) {
                openTags[openTags.length - 1] = 'code';
                const match = trailingSpacesRegex.exec(ircText);
                console.log('match', match);
                if (match) {
                    ircText = ircText.replace(trailingSpacesRegex, `${styleChange}$1`);
                } else {
                    ircText += `${styleChange} `;
                }
                checkSpace = true;
            }

            if (!Object.keys(ircStyleDiff).length) {
                // No changes needed
                return;
            }

            ircText += ircStyleDiff2IrcCodes(currentIrcStyle, ircStyleDiff);

            Object.assign(currentIrcStyle, ircStyleDiff);
        },
        ontext: (text) => {
            const tag = openTags.slice(-1)[0];
            if (tag === 'emoji') {
                return;
            }

            if (
                (startsWithCommaDecimalRegexp.test(text) && endsWithFgColourRegexp.test(ircText))
                || (startsWithDecimalRegexp.test(text) && endsWithResetColourRegexp.test(ircText))
            ) {
                ircText += '\u2008';
            }

            let newText = text;
            if (previousTag === 'code') {
                const match = leadingSpacesRegex.exec(newText);
                if (match) {
                    newText = newText.replace(leadingSpacesRegex, '$2$1');
                } else if (newText[0] !== ' ') {
                    newText = ' ' + newText;
                }
            }

            if (checkSpace) {
                checkSpace = false;
                const needSpace = ircText.slice(0) !== ' ';
                if (needSpace) {
                    ircText += ' ';
                }
            }

            ircText += newText;
        },
        onclosetag: (name) => {
            previousTag = openTags.pop();
        },
    }, {
        decodeEntities: true,
    });

    parser.write(source);
    parser.end();

    if (openTags.length) {
        log.error(`openTags is not empty [length=${openTags.length}]`);
    }

    // Ensure colour codes are after spaces
    // ircText = ircText.replace(spaceAfterColoursRegexp, '$1$2');
    return ircText;
}

function style2IrcStyle(style) {
    const ircStyle = Object.assign({}, defaultIrcStyle);
    Object.entries(style).forEach(([key, value]) => {
        if (key === 'color') {
            ircStyle.fg = getColourCode(value);
        } else if (key === 'background-color') {
            ircStyle.bg = getColourCode(value);
        } else if (key === 'font-weight') {
            ircStyle.bold = value === 'bold';
        } else if (key === 'font-style') {
            ircStyle.italic = value === 'italic';
        } else if (key === 'text-decoration') {
            const decor = value ? value.split(' ') : [];
            ircStyle.underline = decor.includes('underline');
            ircStyle.strikethrough = decor.includes('line-through');
        }
    });
    return ircStyle;
}

function ircStyleDiff2IrcCodes(currentIrcStyle, ircStyleDiff) {
    let ircCodes = '';

    if (shouldResetIrcStyles(currentIrcStyle, ircStyleDiff)) {
        // Changes are resulting in defaults
        // Just send the reset character code
        return '\x0f';
    }

    if (ircStyleDiff.hasOwnProperty('fg')) {
        if (ircStyleDiff.fg) {
            if (currentIrcStyle.bg && !ircStyleDiff.bg) {
                ircCodes += '\x03';
            }
            ircCodes += `\x03${ircStyleDiff.fg}`;

            if (ircStyleDiff.bg) {
                ircCodes += `,${ircStyleDiff.bg}`;
            }
        } else {
            ircCodes += '\x03';
        }
    } else if (ircStyleDiff.hasOwnProperty('bg')) {
        if (!ircStyleDiff.bg && currentIrcStyle.fg) {
            ircCodes += `\x03\x03${currentIrcStyle.fg}`;
        } else if (ircStyleDiff.bg && currentIrcStyle.fg) {
            ircCodes += `\x03${currentIrcStyle.fg},${ircStyleDiff.bg}`;
        }
    }

    if (ircStyleDiff.hasOwnProperty('bold')) {
        ircCodes += '\x02';
    }
    if (ircStyleDiff.hasOwnProperty('italic')) {
        ircCodes += '\x1d';
    }
    if (ircStyleDiff.hasOwnProperty('underline')) {
        ircCodes += '\x1f';
    }
    if (ircStyleDiff.hasOwnProperty('strikethrough')) {
        ircCodes += '\x1e';
    }

    return ircCodes;
}

function getIrcStyleDiff(a, b) {
    const diff = {};
    Object.keys(a).forEach((key) => {
        if (a[key] !== b[key]) {
            diff[key] = b[key];
        }
    });
    return diff;
}

function getColourCode(styleValue) {
    const match = varColourRegexp.exec(styleValue);
    if (!match || match.length !== 2) {
        return null;
    }
    return match[1];
}

function shouldResetIrcStyles(currentIrcStyle, diff) {
    const resultIrcStyle = Object.assign({}, defaultIrcStyle, currentIrcStyle, diff);
    return Object.keys(defaultIrcStyle).every(
        (key) => defaultIrcStyle[key] === resultIrcStyle[key]
    );
}
