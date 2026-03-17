import { TextNode } from 'lexical';
import { CodeNode } from '@/libs/lexical/CodeNode';
import { EmojiNode } from '@/libs/lexical/EmojiNode';
import { UserNode } from '@/libs/lexical/UserNode';
import { AutocompleteNode } from '@/libs/lexical/AutocompleteNode';
import { BOUNDARY_CHARACTER, $isSpecialOrFormatted } from '@/libs/lexical/BoundaryPlugin';

// Minimal stubs — only the properties $isSpecialOrFormatted reads.
// prototype chain is preserved so instanceof checks work.
// Note: $isSpecialOrFormatted checks instanceof AutocompleteNode BEFORE
// instanceof TextNode — this order is load-bearing because AutocompleteNode
// extends TextNode. The tests below exercise both paths.
function makeNode(Type, style = '') {
    const node = Object.create(Type.prototype);
    node.getStyle = () => style;
    return node;
}

describe('BOUNDARY_CHARACTER', () => {
    it('is the zero-width space character', () => {
        expect(BOUNDARY_CHARACTER).toBe('\u200B');
    });
});

describe('$isSpecialOrFormatted', () => {
    it('returns false for a plain unstyled TextNode', () => {
        expect($isSpecialOrFormatted(makeNode(TextNode))).toBe(false);
    });

    it('returns true for a styled TextNode', () => {
        expect($isSpecialOrFormatted(makeNode(TextNode, 'font-weight: bold;'))).toBe(true);
    });

    it('returns true for CodeNode', () => {
        expect($isSpecialOrFormatted(makeNode(CodeNode))).toBe(true);
    });

    it('returns true for EmojiNode', () => {
        expect($isSpecialOrFormatted(makeNode(EmojiNode))).toBe(true);
    });

    it('returns true for UserNode', () => {
        expect($isSpecialOrFormatted(makeNode(UserNode))).toBe(true);
    });

    // AutocompleteNode extends TextNode, so the exemption guard must fire
    // before the styled-TextNode check.
    it('returns false for AutocompleteNode (exempt, even though it extends TextNode)', () => {
        expect($isSpecialOrFormatted(makeNode(AutocompleteNode))).toBe(false);
    });
});
