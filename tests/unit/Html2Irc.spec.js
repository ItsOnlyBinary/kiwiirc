import html2irc from '@/helpers/Html2Irc';

const tests = [
    {
        html: '<p dir="ltr"><span style="white-space: pre-wrap;">test</span><span style="color: var(--irc-colour-04); white-space: pre-wrap;">test</span><span style="color: var(--irc-colour-04); font-weight: bold; white-space: pre-wrap;">test</span><span style="color: var(--irc-colour-04); font-weight: bold; font-style: italic; white-space: pre-wrap;">test</span><span style="color: var(--irc-colour-04); font-weight: bold; font-style: italic; text-decoration: underline; white-space: pre-wrap;">test</span><span style="color: var(--irc-colour-02); font-weight: bold; font-style: italic; text-decoration: underline; white-space: pre-wrap;">test</span><span class="emoji-node" data-code=":)" style="background-image: url(&quot;https://kiwiirc.com/shared/emoji/1f44d.png&quot;); white-space: pre-wrap;"> </span><span style="color: var(--irc-colour-02); font-weight: bold; font-style: italic; text-decoration: underline; white-space: pre-wrap;">test</span><span style="white-space: pre-wrap;">test</span></p>',
        irc: 'test\x0304test\x02test\x1Dtest\x1Ftest\x0302test :) test\x0Ftest',
    },
    {
        html: '<p dir="ltr"><span style="white-space: pre-wrap;">test</span><span style="color: var(--irc-colour-04); white-space: pre-wrap;">test</span><span style="color: var(--irc-colour-04); font-weight: bold; white-space: pre-wrap;">test</span><span style="font-weight: bold; white-space: pre-wrap;">test</span><span style="white-space: pre-wrap;">test</span></p>',
        irc: 'test\x0304test\x02test\x03test\x0Ftest',
    },
    {
        html: '<p dir="ltr"><span style="font-style: italic; white-space: pre-wrap;">test</span><span style="font-style: italic; color: var(--irc-colour-04); white-space: pre-wrap;">,02test</span><span style="font-style: italic; white-space: pre-wrap;">03test</span></p>',
        irc: '\x1Dtest\x0304\u2008,02test\x03\u200803test',
    },
    {
        html: '<p dir="ltr"><span style="color: var(--irc-colour-04); background-color: var(--irc-colour-01); white-space: pre-wrap;">test</span><span style="color: var(--irc-colour-04); background-color: var(--irc-colour-01); text-decoration: line-through; white-space: pre-wrap;">test</span><span style="text-decoration: line-through; white-space: pre-wrap;">test</span><span style="text-decoration: line-through; background-color: var(--irc-colour-01); white-space: pre-wrap;">test</span></p>',
        irc: '\x0304,01test\x1Etest\x03testtest',
    },
    {
        html: '<p dir="ltr"><span style="text-decoration: underline; white-space: pre-wrap;">test</span><span style="text-decoration: underline line-through; white-space: pre-wrap;">test</span><span style="text-decoration: line-through; white-space: pre-wrap;">test</span></p>',
        irc: '\x1Ftest\x1Etest\x1Ftest',
    },
    {
        html: '<p dir="ltr"><span style="color: var(--irc-colour-04); background-color: var(--irc-colour-01); font-weight: bold; white-space: pre-wrap;">test</span><span style="color: var(--irc-colour-08); background-color: var(--irc-colour-01); font-weight: bold; white-space: pre-wrap;">test</span><span style="color: var(--irc-colour-08); font-weight: bold; white-space: pre-wrap;">test</span></p>',
        irc: '\x0304,01\x02test\x0308test\x0308test',
    },
    {
        html: '<p dir="ltr"><span style="white-space: pre-wrap;">test</span><br><span style="white-space: pre-wrap;">test</span></p>',
        irc: 'test\ntest',
    },
];

describe('Html2Irc.js', () => {
    tests.forEach((test, idx) => {
        it(`should output valid irc formatting codes [${idx}]`, () => {
            const irc = html2irc(test.html);
            expect(test.irc).toEqual(irc);
        });
    });
});
