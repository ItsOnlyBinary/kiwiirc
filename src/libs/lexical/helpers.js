import { $getRoot } from 'lexical';

export function $getAllNodes() {
    const rootNode = $getRoot();
    const allNodes = [];

    const traverseNodes = (node) => {
        allNodes.push(node);
        if (typeof node.getChildren === 'function') {
            node.getChildren().forEach((childNode) => traverseNodes(childNode));
        }
    };

    traverseNodes(rootNode);
    return allNodes;
}
