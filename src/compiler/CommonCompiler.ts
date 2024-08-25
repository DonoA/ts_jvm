import {
    TSTypeAnnotation} from "@typescript-eslint/types/dist/generated/ast-spec";
import { JavaType } from "../assembler/JavaType";
import { CompileContext } from "./context/CompileContext";
import { TypeCompiler } from "./TypeCompiler";

export class CommonCompiler {
    public static extractTypeFromHint(node: TSTypeAnnotation | undefined, context: CompileContext): JavaType {
        if (node === undefined) {
            return JavaType.OBJECT;
        }
        return TypeCompiler.compile(node.typeAnnotation, context);
    }
}