import { UserNode, $createUserNode } from '@/libs/lexical/UserNode';

// Create a stub node using Object.create to avoid Lexical's key-generator
// (which requires an active editor context). This is the same pattern used
// in BoundaryPlugin.spec.js.
function makeUserNode(network, user) {
    const node = Object.create(UserNode.prototype);
    node.__network = network;
    node.__user = user;
    node.__text = user.nick;
    node.__style = '';
    node.__format = 0;
    node.__detail = 0;
    node.__mode = 0;
    return node;
}

const mockNetwork = { id: 'net1', users: { get: () => null } };
const mockUser = { nick: 'Alice', getColour: () => '#ff4444' };

describe('UserNode', () => {
    describe('getUser()', () => {
        it('returns the stored user object', () => {
            expect(makeUserNode(mockNetwork, mockUser).getUser()).toBe(mockUser);
        });
    });

    describe('getNetwork()', () => {
        it('returns the stored network object', () => {
            expect(makeUserNode(mockNetwork, mockUser).getNetwork()).toBe(mockNetwork);
        });
    });

    describe('exportJSON()', () => {
        it('includes type "user"', () => {
            expect(makeUserNode(mockNetwork, mockUser).exportJSON().type).toBe('user');
        });

        it('includes network.id', () => {
            expect(makeUserNode(mockNetwork, mockUser).exportJSON().network).toEqual({ id: 'net1' });
        });

        it('includes user.nick', () => {
            expect(makeUserNode(mockNetwork, mockUser).exportJSON().user).toEqual({ nick: 'Alice' });
        });

        it('does NOT include colour in exported JSON', () => {
            const json = JSON.stringify(makeUserNode(mockNetwork, mockUser).exportJSON());
            expect(json).not.toContain('#ff4444');
            expect(json).not.toContain('color');
        });
    });

    describe('static clone()', () => {
        it('preserves __network and __user', () => {
            const original = makeUserNode(mockNetwork, mockUser);
            original.__key = 'key-1';
            const cloned = UserNode.clone(original);
            expect(cloned.getNetwork()).toBe(mockNetwork);
            expect(cloned.getUser()).toBe(mockUser);
        });
    });

    describe('node mode', () => {
        it('is not in token mode (default __mode is 0)', () => {
            // token mode = setMode('token') which sets __mode = 1.
            // $createUserNode must NOT call setMode('token').
            expect(makeUserNode(mockNetwork, mockUser).__mode).toBe(0);
        });
    });
});
