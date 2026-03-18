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
const zeroWidthSpaceRegexp = /\u200B/g;

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
    let pendingIrcText = '';
    let pendingCurrentIrcStyle = Object.assign({}, defaultIrcStyle);

    const parser = new htmlparser.Parser({
        onopentag: (name, attribs) => {
            if (name === 'br') {
                ircText += '\n';
                return;
            }

            if (attribs.class === EMOJI_NODE_CLASS) {
                openTags.push('emoji');
                const emoji = attribs['data-code'];
                if (!emoji) {
                    return;
                }
                const lastChar = ircText.slice(-1);
                const needSpace = lastChar !== '' && lastChar !== ' ';
                ircText += needSpace ? ` ${emoji}` : emoji;
                checkSpace = true;
                return;
            }

            const style = getStyleObjectFromCSS(attribs.style || '');
            const ircStyle = style2IrcStyle(style);
            const ircStyleDiff = getIrcStyleDiff(currentIrcStyle, ircStyle);

            if (attribs.class === CODE_NODE_CLASS) {
                openTags.push('code');

                if (ircStyleDiff) {
                    pendingIrcText += '\x0f';
                    pendingCurrentIrcStyle = ircStyleDiff;
                    if (ircText && ircText.endsWith(' ')) {
                        // Steal space from end of ircText, it will be added back after reset char
                        ircText = ircText.slice(0, -1);
                        pendingIrcText += ' ';
                    }
                    pendingIrcText += '`';
                } else if (ircText && !ircText.endsWith(' ')) {
                    ircText += ' `';
                } else {
                    ircText += '`';
                }

                return;
            }

            openTags.push(name);

            if (!ircStyleDiff) {
                return;
            }

            pendingIrcText += ircStyleDiff2IrcCodes(currentIrcStyle, ircStyleDiff);
            pendingCurrentIrcStyle = ircStyleDiff;
        },
        ontext: (text) => {
            let newText = text;
            const tag = openTags[openTags.length - 1];
            if (tag === 'emoji') {
                return;
            }

            const normalized = text.replace(zeroWidthSpaceRegexp, '');
            if (normalized === '') {
                // Empty node skip
                return;
            }

            if (normalized.trim() === '') {
                // Only whitespace, no formatting needed
                ircText += normalized;
                return;
            }

            if (checkSpace) {
                checkSpace = false;
                if (!ircText.endsWith(' ')) {
                    // Needs to start with space
                    ircText += ' ';

                    if (newText.startsWith(' ')) {
                        // Space was stolen from start of newText
                        newText = newText.slice(1);
                    }
                }
            }

            if (pendingIrcText) {
                ircText += pendingIrcText;
                pendingIrcText = '';

                Object.assign(currentIrcStyle, pendingCurrentIrcStyle);
            }

            if (
                (startsWithCommaDecimalRegexp.test(newText) && endsWithFgColourRegexp.test(ircText))
                || (startsWithDecimalRegexp.test(newText) && endsWithResetColourRegexp.test(ircText))
            ) {
                ircText += '\u2008';
            }

            ircText += newText;
        },
        onclosetag: () => {
            const previousTag = openTags.pop();

            pendingIrcText = '';

            if (previousTag === 'code') {
                ircText += '`';
                checkSpace = true;
            }
        },
    }, {
        decodeEntities: true,
    });

    parser.write(source);
    parser.end();

    if (openTags.length) {
        log.error(`openTags is not empty [length=${openTags.length}]`);
    }

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
        return '\x0f';
    }

    if ('fg' in ircStyleDiff) {
        if (ircStyleDiff.fg) {
            const bgBeingRemoved = 'bg' in ircStyleDiff && !ircStyleDiff.bg;
            if (currentIrcStyle.bg && bgBeingRemoved) {
                ircCodes += '\x03';
            }
            ircCodes += `\x03${ircStyleDiff.fg}`;

            if (ircStyleDiff.bg) {
                ircCodes += `,${ircStyleDiff.bg}`;
            }
        } else {
            ircCodes += '\x03';
        }
    } else if ('bg' in ircStyleDiff) {
        if (!ircStyleDiff.bg && currentIrcStyle.fg) {
            const hasActiveFormatting = currentIrcStyle.bold || currentIrcStyle.italic
                || currentIrcStyle.underline || currentIrcStyle.strikethrough;
            ircCodes += hasActiveFormatting
                ? `\x03${currentIrcStyle.fg}`
                : `\x03\x03${currentIrcStyle.fg}`;
        } else if (ircStyleDiff.bg && currentIrcStyle.fg) {
            ircCodes += `\x03${currentIrcStyle.fg},${ircStyleDiff.bg}`;
        }
    }

    if ('bold' in ircStyleDiff) {
        ircCodes += '\x02';
    }
    if ('italic' in ircStyleDiff) {
        ircCodes += '\x1d';
    }
    if ('underline' in ircStyleDiff) {
        ircCodes += '\x1f';
    }
    if ('strikethrough' in ircStyleDiff) {
        ircCodes += '\x1e';
    }

    return ircCodes;
}

function getIrcStyleDiff(a, b) {
    const diff = {};
    let changed = false;
    Object.keys(a).forEach((key) => {
        if (a[key] !== b[key]) {
            diff[key] = b[key];
            changed = true;
        }
    });
    return changed ? diff : null;
}

function getColourCode(styleValue) {
    const match = varColourRegexp.exec(styleValue);
    if (!match || match.length !== 2) {
        return null;
    }
    return match[1];
}

function shouldResetIrcStyles(currentIrcStyle, diff) {
    return Object.keys(defaultIrcStyle).every((key) => {
        const result = key in diff ? diff[key] : currentIrcStyle[key];
        return result === defaultIrcStyle[key];
    });
}
