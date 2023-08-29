import * as Misc from '@/helpers/Misc';

describe('Misc.js', () => {
    it('should find mentions of nickname in text', () => {
        let tests = [
            ['foo', 'foo', true], // on its own
            ['Foo', 'foo', true], // different case
            ['foo bar baz', 'foo', true], // start of line
            ['baz foo bar', 'foo', true], // in middle of line
            ['bar baz foo', 'foo', true], // end of line
            ['missing', 'foo', false], // doesnt exist in text
            ['baz food bar', 'foo', false], // dont trigger on substrings
            ['hello food foo bar', 'foo', true], // when substring exists previously
            ['hello, foo?', 'foo', true], // punctuation test
            ['foo: hello', 'foo', true], // another
            ['hello (foo)', 'foo', true], // another
        ];

        tests.forEach((c) => {
            let doesMention = Misc.mentionsNick(c[0], c[1]);
            expect(doesMention).toEqual(c[2]);
        });
    });

    it('base64Encode and Decode should match', () => {
        const tests = [
            [0, '0'],
            [10, 'a'],
            [61, 'Z'],
            [62, '10'],
            [55378008, '3KmlG'],
        ];

        tests.forEach(([key, value]) => {
            const encoded = Misc.base62Encode(key);
            const decoded = Misc.base62Decode(value);
            expect(encoded).toEqual(value);
            expect(decoded).toEqual(key);
        });

        for (let i = 0; i < 1000; i++) {
            const random = Math.floor((Math.random() * 1000000));
            const encoded = Misc.base62Encode(random);
            const decoded = Misc.base62Decode(encoded);
            expect(decoded).toEqual(random);
        }
    });
});
