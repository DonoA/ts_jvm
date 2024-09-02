import {BaseNode, TSArrayType, TSTypeAnnotation, TSVoidKeyword, TSTypeReference} from "@typescript-eslint/types/dist/generated/ast-spec";
import {JavaType} from "../assembler/JavaType";
import {AST_NODE_TYPES} from "@typescript-eslint/typescript-estree";
import {PartialRecord} from "../util/PartialRecord";
import {CompileContext} from "./context/CompileContext";
import {assertNodeType} from "./AssertNodeType";
import { CommonCompiler } from "./CommonCompiler";

type TypeEvaluator = (tag: BaseNode) => JavaType;

export class TypeCompiler {

    private readonly context: CompileContext;

    constructor(context: CompileContext) {
        this.context = context;
    }

    public static compile(type: BaseNode, context: CompileContext): JavaType {
        const compiler = new TypeCompiler(context);
        return compiler.evaluate(type);
    }

    private handleTypeAnnotation(type: BaseNode): JavaType {
        const annot: TSTypeAnnotation = assertNodeType(type,
            AST_NODE_TYPES.TSTypeAnnotation);
        return this.evaluate(annot.typeAnnotation);
    }

    private handleTypeReference(type: BaseNode): JavaType {
        const ref: TSTypeReference = assertNodeType(type, AST_NODE_TYPES.TSTypeReference);
        const typeName = CommonCompiler.getIdentValue(ref.typeName);
        return JavaType.forClass(typeName);
    }

    private handleArrayType(type: BaseNode): JavaType {
        const arrayType: TSArrayType = assertNodeType(type, AST_NODE_TYPES.TSArrayType);
        const subType = this.evaluate(arrayType.elementType);
        return subType.addArrayCount();
    }

    private handleClassKeyword(javaClass: string): TypeEvaluator {
        return (): JavaType => {
            return JavaType.forClass(javaClass);
        };
    }

    private handlePrimitiveKeyword(javaPrim: string): TypeEvaluator {
        return (): JavaType => {
            return JavaType.forPrimitive(javaPrim);
        };
    }

    private readonly handers: PartialRecord<AST_NODE_TYPES, TypeEvaluator> = {
        TSTypeAnnotation: this.handleTypeAnnotation.bind(this),
        TSTypeReference: this.handleTypeReference.bind(this),
        TSArrayType: this.handleArrayType.bind(this),
        TSStringKeyword: this.handleClassKeyword("java/lang/String").bind(this),
        TSVoidKeyword: this.handlePrimitiveKeyword("Void").bind(this),
    }

    private evaluate(type: BaseNode): JavaType {
        const handler = this.handers[type.type];
        if (!handler) {
            throw new Error(`No handler for ${type.type}`);
        }
        return handler(type);
    }
}