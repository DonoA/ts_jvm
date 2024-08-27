import {AST_NODE_TYPES} from "@typescript-eslint/typescript-estree";

export interface NodeWithType {
    type: AST_NODE_TYPES;
    range: number[];
    loc: {
        start: {
          line: number,
          column: number
        },
        end: {
          line: number,
          column: number
        }
    }
};

export function assertNodeType<T extends NodeWithType>(node: NodeWithType, expected: AST_NODE_TYPES): T {
    if (node.type !== expected) {
        throw new Error(`Node is of type ${node.type}, expected ${expected}`)
    }

    return node as T;
}