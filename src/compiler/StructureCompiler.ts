import {AST, AST_NODE_TYPES} from "@typescript-eslint/typescript-estree";
import {
    BaseNode,
    ClassBody,
    ClassDeclaration,
    FunctionExpression,
    Identifier,
    PropertyDefinition,
    MethodDefinitionComputedName,
    TSEmptyBodyFunctionExpression} from "@typescript-eslint/types/dist/generated/ast-spec";
import {JavaClass} from "../assembler/JavaClass";
import {JavaMethod, JavaMethodSignature} from "../assembler/JavaMethod";
import {JavaType} from "../assembler/JavaType";
import {TypeCompiler} from "./TypeCompiler";
import {CompileContext} from "./context/CompileContext";
import {FileScope} from "./context/FileScope";
import {MethodCompileContext} from "./context/MethodCompileContext";
import {PartialRecord} from "../util/PartialRecord";
import {assertNodeType, NodeWithType} from "./AssertNodeType";
import { ClassCompileContext } from "./context/ClassCompileContext";
import { JavaField } from "../assembler/JavaField";
import { CompileResult } from "./CompileResult";
import { CommonCompiler } from "./CommonCompiler";

type NodeHandler = (node: any, context: CompileContext) => CompileResult;

export interface StructureCompileResult {
    classes: JavaClass[];
    
    errorNode: NodeWithType | null;
    error: Error | null;
}

class StructureCompiler {
    errorNode: NodeWithType | null = null;

    constructor() {
    }

    public compile(node: AST<any>, fileName: string): StructureCompileResult {
        const fileScope = new FileScope(fileName);
        const context = ClassCompileContext.createMainMethod(fileScope);
        
        try {
            this.handle(node, context);
        } catch (e) {
            return {
                classes: [],
                error: e as Error,
                errorNode: this.errorNode!
            }
        }
        return {
            classes: fileScope.allClasses,
            error: null,
            errorNode: null
        };
    }

    public handleProgram(node: NodeWithType, context: CompileContext): CompileResult {
        const program: AST<any> = assertNodeType(node, AST_NODE_TYPES.Program);
        program.body.forEach((stmt) => {
            this.handle(stmt, context);
        });

        return CompileResult.empty();
    }

    public handleClassDef(node: NodeWithType, context: CompileContext): CompileResult {
        const classDeclaration: ClassDeclaration = assertNodeType(node,
            AST_NODE_TYPES.ClassDeclaration)
        const name = CommonCompiler.getIdentValue(classDeclaration.id!, context);
        let superClassName = classDeclaration.superClass ?
            this.handle(classDeclaration.superClass, context).getValue() : "Object";
        const superClass = context.getQualifiedNameFor(superClassName);
        const clss = new JavaClass(JavaClass.ACCESS.PUBLIC, name, superClass);

        const newContext = ClassCompileContext.createClassContext(context.fileContext, clss);

        this.handle(classDeclaration.body, newContext);

        context.fileContext.addClass(clss); // Add class to file scope, must be done after methods/fields are added

        return CompileResult.empty();
    }

    public handleClassBody(node: NodeWithType, context: CompileContext): CompileResult {
        const body: ClassBody = assertNodeType(node, AST_NODE_TYPES.ClassBody);
        body.body.forEach((stmt) => {
            this.handle(stmt, context);
        });
        return CompileResult.empty();
    }

    public handleMethodDef(node: NodeWithType, context: CompileContext): CompileResult {
        const namedNode: MethodDefinitionComputedName = assertNodeType(node,
            AST_NODE_TYPES.MethodDefinition);
        const classContext = ClassCompileContext.assertType(context);

        let name = CommonCompiler.getIdentValue(namedNode.key, context);
        if (name === "constructor") {
            name = "<init>";
        }

        const signature = this.extractSignature(namedNode.value, context);
        const methodContext = MethodCompileContext.createMethodContext(classContext, JavaMethod.ACCESS.PUBLIC, name, signature);

        this.handle(namedNode.value, methodContext);
        return CompileResult.empty();
    }

    private extractSignature(node: FunctionExpression | TSEmptyBodyFunctionExpression,
                             context: CompileContext): JavaMethodSignature {
        const params = node.params.map((param) => {
            const ident = assertNodeType<Identifier>(param, AST_NODE_TYPES.Identifier);
            const type = TypeCompiler.compile(ident.typeAnnotation!, context);
            return {name: ident.name, type};
        });

        let returns;
        if (node.returnType) {
            returns = TypeCompiler.compile(node.returnType, context);
        } else {
            returns = JavaType.VOID;
        }

        return new JavaMethodSignature(params, returns);
    }

    public handlePropertyDef(node: NodeWithType, context: CompileContext): CompileResult {
        const propertyNode: PropertyDefinition = assertNodeType(node,
            AST_NODE_TYPES.PropertyDefinition);
        const name = CommonCompiler.getIdentValue(propertyNode.key, context);
        const classContext = ClassCompileContext.assertType(context);

        const type = CommonCompiler.extractTypeFromHint(propertyNode.typeAnnotation, context);
        classContext.clss.addField(JavaField.ACCESS.PUBLIC, name, type);
        return CompileResult.empty();
    }

    public handleFunctionExpr(node: NodeWithType, context: CompileContext): CompileResult {
        const functionExpr: FunctionExpression = assertNodeType(node,
            AST_NODE_TYPES.FunctionExpression);

        this.handle(functionExpr.body, context);
        return CompileResult.empty();
    }

    readonly handlerMap: PartialRecord<AST_NODE_TYPES, NodeHandler> = {
        Program: this.handleProgram.bind(this),
        ClassDeclaration: this.handleClassDef.bind(this),
        ClassBody: this.handleClassBody.bind(this),
        MethodDefinition: this.handleMethodDef.bind(this),
        PropertyDefinition: this.handlePropertyDef.bind(this),
        FunctionExpression: this.handleFunctionExpr.bind(this),
    }

    public handle(node: BaseNode, context: CompileContext): CompileResult {
        const handler = this.handlerMap[node.type];
        if (handler === undefined) {
            // The structure compiler doesn't need to handle every node type
            return CompileResult.empty();
        }

        try {
            return handler(node, context);
        } catch (e) {
            if (this.errorNode === null) {
                this.errorNode = node as NodeWithType;
            }
            throw e;
        }
    }
}

export function compileStructure(ast: AST<any>, fileName: string): StructureCompileResult {
    const compiler = new StructureCompiler();
    return compiler.compile(ast, fileName);
}