import {
    TSTypeAnnotation,
    Identifier} from "@typescript-eslint/types/dist/generated/ast-spec";
import { JavaType } from "../assembler/JavaType";
import { CompileContext } from "./context/CompileContext";
import { TypeCompiler } from "./TypeCompiler";
import { assertNodeType, NodeWithType } from "./AssertNodeType";
import { AST_NODE_TYPES } from "@typescript-eslint/typescript-estree";

export class CommonCompiler {
    public static extractTypeFromHint(node: TSTypeAnnotation | undefined, context: CompileContext): JavaType {
        if (node === undefined) {
            return JavaType.OBJECT;
        }
        return TypeCompiler.compile(node.typeAnnotation, context);
    }

    public static getIdentValue(node: NodeWithType, context: CompileContext): string {
        const ident: Identifier = assertNodeType(node, AST_NODE_TYPES.Identifier);
        return ident.name;
    }
}