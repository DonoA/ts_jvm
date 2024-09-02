import {
    TSTypeAnnotation,
    Identifier} from "@typescript-eslint/types/dist/generated/ast-spec";
import { JavaQualifiedClassName, JavaType } from "../assembler/JavaType";
import { CompileContext } from "./context/CompileContext";
import { TypeCompiler } from "./TypeCompiler";
import { NodeWithType } from "./AssertNodeType";
import { AST_NODE_TYPES } from "@typescript-eslint/typescript-estree";
import { JavaCode } from "../assembler/JavaCode";
import { JavaMethodSignature } from "../assembler/JavaMethod";

export class CommonCompiler {
    public static addSuperCall(code: JavaCode, superClass: JavaQualifiedClassName) {

    }

    public static extractTypeFromHint(node: TSTypeAnnotation | undefined, context: CompileContext): JavaType {
        if (node === undefined) {
            return JavaType.OBJECT;
        }
        return TypeCompiler.compile(node.typeAnnotation, context);
    }

    public static getIdentValue(node: NodeWithType): string {
        if (node.type === AST_NODE_TYPES.Identifier) {
            return (node as Identifier).name;
        }

        if (node.type === AST_NODE_TYPES.ThisExpression) {
            return "this";
        }

        throw new Error("No ident for node type: " + node.type);
    }
}