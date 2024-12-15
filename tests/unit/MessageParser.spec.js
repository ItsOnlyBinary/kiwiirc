import getState from '@/libs/state';
import parseMessage from '@/libs/MessageParser';

describe('MessageParser.js', () => {
    const state = getState();
    const network = state.addNetwork('test', 'nick', {});

    const channelTests = [
        ['#channel', '#channel'],
        ['#channel;', '#channel'],
        ['#chan;nel', '#chan;nel'],
        ['#channel.', '#channel'],
        ['#chan;el;', '#chan;el'],
        ['#channel),', '#channel'],
        ['#chan(n)el,', '#chan(n)el'],
        ['#chan(n)el),', '#chan(n)el'],
        ['#chan(nel),', '#chan(nel)'],
        ['#chan[n]el,', '#chan[n]el'],
        ['#chan[n]el],', '#chan[n]el'],
        ['#chan[nel],', '#chan[nel]'],
        ['#channel.name,', '#channel.name'],
        ['#channel.name.,', '#channel.name'],
        ['#channel.,', '#channel'],
        ['#channel-name,', '#channel-name'],
        ['#channel_name,', '#channel_name'],
        ['#channel&name,', '#channel&name'],
        ['@#channel:', '#channel'],
        ['@&channel,', '&channel'],
        ['&@#channel,', '#channel'],
        ['&@&channel,', '&channel'],
        ['The quick brown fox jumps over #channel.name. and the lazy dog', '#channel.name'],
        ['The quick brown fox jumps over @&channel, and the lazy dog', '&channel'],
        ['The quick brown fox jumps over (#channel) and the lazy dog', '#channel'],
        ['The quick brown fox jumps over [#channel] and the lazy dog', '#channel'],
        ['The quick brown fox jumps over <#channel> and the lazy dog', '#channel'],
        ['The quick brown fox jumps over "#channel" and the lazy dog', '#channel'],
        ['The quick brown fox jumps over \'#channel\' and the lazy dog', '#channel'],
    ];
    test.each(channelTests)('should return valid channel block [%#]', (message, ...args) => {
        const blocks = parseMessage(network, message);
        const channelBlocks = blocks.filter((b) => b.type === 'channel');
        const compare = typeof args[0] === 'string' ? args.shift() : message;

        expect(channelBlocks.length).toStrictEqual(1);
        expect(channelBlocks[0].meta.channel).toStrictEqual(compare);
    });

    const validUrlTests = [
        ['www.example.com', 'http://www.example.com'],
        ['http://example.com'],
        ['http://127.0.0.1'],
        ['http://example.com:8080'],
        ['http://127.0.0.1:8001'],
        ['http://example.com/test.html?test=foo#bar'],
        ['http://example.computer/some/path/test.html?test=foo#bar'],
        ['http://127.0.0.1/test.html?test=foo#bar'],
        ['https://www.example.com'],
        ['https://127.0.0.1/test.html?test=foo#bar'],
        ['http://2001:0000:1234:0000:0000:C1C0:ABCD:0876/'],
        ['http://[2001:db8:1f70::999:de8:7648:6e8]:100/'],
        ['ldap://[2001:db8::7]/c=GB?objectClass?one'],
        ['(http://example.com)', 'http://example.com', '(', ')'],
        ['test text http://example.com more testings', 'http://example.com'],
        ['test text [http://example.com] more testings', 'http://example.com'],
        ['test text "http://example.com" more testings', 'http://example.com'],
        ['test text (test test: http://example.com) more testings', 'http://example.com'],
        ['test text http://example.com#(test) more testings', 'http://example.com#(test)'],
        ['test (text http://example.com#(te)st) more testings', 'http://example.com#(te)st'],
        ['test (text http://example.com#(test)) more testings', 'http://example.com#(test)'],
    ];
    test.each(validUrlTests)('should return valid url block [%#]', (message, ...args) => {
        const blocks = parseMessage(network, message);
        const urlIndex = blocks.findIndex((b) => b.type === 'url');
        const urlBlocks = blocks.filter((b) => b.type === 'url');
        const compare = typeof args[0] === 'string' ? args.shift() : message;

        expect(urlBlocks.length).toStrictEqual(1);
        expect(urlBlocks[0].meta.url).toStrictEqual(compare);

        // check prefix and suffix
        if (typeof args[0] === 'string') {
            expect(blocks[urlIndex - 1].content).toStrictEqual(args[0]);
        }
        if (typeof args[1] === 'string') {
            expect(blocks[urlIndex + 1].content).toStrictEqual(args[1]);
        }
    });

    const invalidUrlTests = [
        'test',
        'example.com',
        'test:8080',
        '127.0.0.1/test.html',
    ];
    test.each(invalidUrlTests)('should reject invalid url [%#]', (message) => {
        const blocks = parseMessage(network, message);
        const urlBlocks = blocks.filter((b) => b.type === 'url');
        expect(urlBlocks.length).toStrictEqual(0);
    });

    const createMockUser = (user) => ({
        nick: user.nick,
        username: user.username,
        colour: user.colour || '',
        getColour: function getColour() { return this.colour; },
    });
    const mockUsers = {
        'TESTNICK1': createMockUser({ nick: 'TestNick1', username: 'testnick1', colour: '#a1fc5d' }),
        'TESTNICK2': createMockUser({ nick: 'TestNick2', username: 'testnick2', colour: '#7363fe' }),
        'TESTNICK3': createMockUser({ nick: 'TestNick3', username: 'testnick3' }),
        'TESTNICK4_': createMockUser({ nick: 'Test-Nick4_', username: 'testnick4' }),
        'TEST-NICK5': createMockUser({ nick: 'Test-Nick5', username: 'testnick5' }),
        'TESTNICK6-': createMockUser({ nick: 'TestNick6-', username: 'testnick6' }),
    };

    const validUserTests = [
        ['testnick1', 'testnick1'],
        ['TestNick1'],
        ['TestNick2'],
        ['Testnick3', 'Testnick3'],
        ['testnick1:', 'testnick1'],
        ['@testnick2', 'testnick2'],
        ['@TestNick2:', 'TestNick2'],
        ['tEsTnIcK4_.', 'tEsTnIcK4_'],
        ['test-nick5'],
        ['testnick6-'],
        ['The quick brown fox jumps over TestNick6- and the lazy dog', 'TestNick6-'],
        ['The quick brown fox jumps over testnick1 and the lazy dog', 'testnick1'],
        ['The quick brown fox jumps over <TestNick2> and the lazy dog', 'TestNick2'],
    ];
    test.each(validUserTests)('should return valid user block [%#]', (message, ...args) => {
        const blocks = parseMessage(network, message, {}, mockUsers);
        const userBlocks = blocks.filter((b) => b.type === 'user');
        const compare = typeof args[0] === 'string' ? args.shift() : message;
        const user = mockUsers[compare.toUpperCase()];

        expect(userBlocks.length).toStrictEqual(1);
        expect(userBlocks[0].meta.user).toStrictEqual(compare);
        expect(userBlocks[0].meta.colour).toStrictEqual(user.getColour());
    });

    const invalidUserTests = ['notauser', 'ttestnick', 'testnick11', 'ttestnick11'];
    test.each(invalidUserTests)('should reject invalid user [%#]', (message) => {
        const blocks = parseMessage(network, message, {}, mockUsers);
        const userBlocks = blocks.filter((b) => b.type === 'user');

        expect(userBlocks.length).toStrictEqual(0);
    });
});
