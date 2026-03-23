import { TextNode } from 'lexical';
import { AutocompleteNode } from '@/libs/lexical/AutocompleteNode';
import { BufferNode } from '@/libs/lexical/BufferNode';
import { CodeNode } from '@/libs/lexical/CodeNode';
import { EmojiNode } from '@/libs/lexical/EmojiNode';
import { UserNode } from '@/libs/lexical/UserNode';
import { $findUnmatchedBacktick } from '@/libs/lexical/CodePlugin';

// Build stub nodes linked by getPreviousSibling.
// Each node exposes only the properties $findUnmatchedBacktick reads.
function makeTextNode(text, prev = null) {
    const node = Object.create(TextNode.prototype);
    node.getTextContent = () => text;
    node.getPreviousSibling = () => prev;
    return node;
}

function makeDisallowedNode(Type, prev = null) {
    const node = Object.create(Type.prototype);
    node.getTextContent = () => '';
    node.getPreviousSibling = () => prev;
    return node;
}

describe('$findUnmatchedBacktick', () => {
    describe('same-node case', () => {
        it('finds a backtick in the cursor node itself', () => {
            const node = makeTextNode('hello `world');
            const result = $findUnmatchedBacktick(node, 12);
            expect(result).not.toBeNull();
            expect(result.sourceNode).toBe(node);
            expect(result.backtickOffset).toBe(6);
            expect(result.sourceText).toBe('hello `world');
            expect(result.betweenNodes).toEqual([]);
            expect(result.betweenTexts).toEqual([]);
            expect(result.cursorNode).toBe(node);
            expect(result.cursorOffset).toBe(12);
            expect(result.cursorText).toBe('hello `world');
        });

        it('uses the LAST backtick when multiple exist before cursor', () => {
            const node = makeTextNode('a`b`c');
            const result = $findUnmatchedBacktick(node, 5);
            expect(result.backtickOffset).toBe(3);
        });

        it('returns null when cursor is before any backtick in the node', () => {
            const node = makeTextNode('hello `world');
            // backtick is at index 6, cursor at 4 — no backtick before cursor
            const result = $findUnmatchedBacktick(node, 4);
            expect(result).toBeNull();
        });

        it('returns a match when cursor is immediately after the backtick (boundary edge)', () => {
            const node = makeTextNode('a`');
            // cursor at offset 2 — immediately after backtick at index 1
            const result = $findUnmatchedBacktick(node, 2);
            expect(result).not.toBeNull();
            expect(result.backtickOffset).toBe(1);
            expect(result.betweenNodes).toEqual([]);
        });

        it('returns null when the node contains no backtick', () => {
            const node = makeTextNode('hello');
            expect($findUnmatchedBacktick(node, 5)).toBeNull();
        });
    });

    describe('multi-node case', () => {
        it('finds a backtick in the previous sibling', () => {
            const prevNode = makeTextNode('say `');
            const cursorNode = makeTextNode('world');
            cursorNode.getPreviousSibling = () => prevNode;
            prevNode.getPreviousSibling = () => null;

            const result = $findUnmatchedBacktick(cursorNode, 5);
            expect(result).not.toBeNull();
            expect(result.sourceNode).toBe(prevNode);
            expect(result.backtickOffset).toBe(4);
            expect(result.betweenNodes).toEqual([]);
            expect(result.cursorNode).toBe(cursorNode);
            expect(result.cursorText).toBe('world');
        });

        it('includes between-nodes in left-to-right order', () => {
            const prevNode = makeTextNode('`');
            const midNode = makeTextNode('mid');
            const cursorNode = makeTextNode('end');

            midNode.getPreviousSibling = () => prevNode;
            prevNode.getPreviousSibling = () => null;
            cursorNode.getPreviousSibling = () => midNode;

            const result = $findUnmatchedBacktick(cursorNode, 3);
            expect(result.sourceNode).toBe(prevNode);
            expect(result.betweenNodes).toEqual([midNode]);
            expect(result.betweenTexts).toEqual(['mid']);
        });

        it('stops and returns null when a CodeNode is in the path', () => {
            const prevText = makeTextNode('`start');
            const codeNode = makeDisallowedNode(CodeNode);
            const cursorNode = makeTextNode('end');

            codeNode.getPreviousSibling = () => prevText;
            cursorNode.getPreviousSibling = () => codeNode;

            expect($findUnmatchedBacktick(cursorNode, 3)).toBeNull();
        });

        it('stops and returns null when an EmojiNode is in the path', () => {
            const prevText = makeTextNode('`start');
            const emojiNode = makeDisallowedNode(EmojiNode);
            const cursorNode = makeTextNode('end');

            emojiNode.getPreviousSibling = () => prevText;
            cursorNode.getPreviousSibling = () => emojiNode;

            expect($findUnmatchedBacktick(cursorNode, 3)).toBeNull();
        });

        it('stops and returns null when a UserNode is in the path', () => {
            const prev = makeTextNode('`');
            const blocker = makeDisallowedNode(UserNode);
            const cursor = makeTextNode('x');
            blocker.getPreviousSibling = () => prev;
            cursor.getPreviousSibling = () => blocker;
            expect($findUnmatchedBacktick(cursor, 1)).toBeNull();
        });

        it('stops and returns null when a BufferNode is in the path', () => {
            const prev = makeTextNode('`');
            const blocker = makeDisallowedNode(BufferNode);
            const cursor = makeTextNode('x');
            blocker.getPreviousSibling = () => prev;
            cursor.getPreviousSibling = () => blocker;
            expect($findUnmatchedBacktick(cursor, 1)).toBeNull();
        });

        it('stops and returns null when an AutocompleteNode is in the path', () => {
            const prev = makeTextNode('`');
            const blocker = makeDisallowedNode(AutocompleteNode);
            const cursor = makeTextNode('x');
            blocker.getPreviousSibling = () => prev;
            cursor.getPreviousSibling = () => blocker;
            expect($findUnmatchedBacktick(cursor, 1)).toBeNull();
        });

        it('returns null when no siblings have a backtick', () => {
            const prevNode = makeTextNode('nope');
            const cursorNode = makeTextNode('also nope');
            cursorNode.getPreviousSibling = () => prevNode;
            prevNode.getPreviousSibling = () => null;
            expect($findUnmatchedBacktick(cursorNode, 9)).toBeNull();
        });
    });

    describe('enclosedText snapshot correctness', () => {
        it('captures sourceText as a snapshot (same-node)', () => {
            const node = makeTextNode('a`b');
            const result = $findUnmatchedBacktick(node, 3);
            expect(result.sourceText).toBe('a`b');
        });

        it('captures cursorText as a snapshot (multi-node)', () => {
            const prev = makeTextNode('`');
            const cursor = makeTextNode('hello');
            cursor.getPreviousSibling = () => prev;
            prev.getPreviousSibling = () => null;
            const result = $findUnmatchedBacktick(cursor, 5);
            expect(result.cursorText).toBe('hello');
        });
    });
});
