import { BufferNode, $createBufferNode } from '@/libs/lexical/BufferNode';

function makeBufferNode(channel) {
    const node = Object.create(BufferNode.prototype);
    node.__channel = channel;
    node.__text = channel;
    node.__style = '';
    node.__format = 0;
    node.__detail = 0;
    node.__mode = 0;
    return node;
}

describe('BufferNode', () => {
    describe('getChannel()', () => {
        it('returns the stored channel name', () => {
            expect(makeBufferNode('#kiwiirc').getChannel()).toBe('#kiwiirc');
        });
    });

    describe('exportJSON()', () => {
        it('includes type "buffer"', () => {
            expect(makeBufferNode('#kiwiirc').exportJSON().type).toBe('buffer');
        });

        it('includes channel name', () => {
            expect(makeBufferNode('#kiwiirc').exportJSON().channel).toBe('#kiwiirc');
        });
    });

    describe('static clone()', () => {
        it('preserves __channel', () => {
            const original = makeBufferNode('#kiwiirc');
            original.__key = 'key-1';
            expect(BufferNode.clone(original).getChannel()).toBe('#kiwiirc');
        });
    });
});
