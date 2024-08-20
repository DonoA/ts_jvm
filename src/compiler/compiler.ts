import {AST, AST_NODE_TYPES} from "@typescript-eslint/typescript-estree";
import {
    BaseNode,
    BlockStatement,
    CallExpression,
    ClassBody,
    ClassDeclaration,
    Expression,
    ExpressionStatement,
    FunctionExpression,
    Identifier,
    TSTypeAnnotation,
    PropertyDefinition,
    Literal,
    MemberExpression,
    MethodDefinitionComputedName,
    TSEmptyBodyFunctionExpression
} from "@typescript-eslint/types/dist/generated/ast-spec";
import {JavaClass} from "../assembler/JavaClass";
import {JavaMethod, JavaMethodSignature} from "../assembler/JavaMethod";
import {JavaType} from "../assembler/JavaType";
import {TypeCompiler} from "./TypeCompiler";
import {CompileContext} from "./context/CompileContext";
import {FileScope} from "./context/FileScope";
import {FieldMeta} from "./meta/FieldMeta";
import {MethodCompileContext} from "./context/MethodCompileContext";
import {PartialRecord} from "../util/PartialRecord";
import {assertNodeType, NodeWithType} from "./AssertNodeType";
import { ClassCompileContext } from "./context/ClassCompileContext";
// import { PropertyDefinition, TSTypeAnnotation } from "./ast-extra/ast-spec";

type NodeHandler = (node: any, context: CompileContext) => void;
type NodeEvaluator = (node: any, context: CompileContext) => string;

class Compiler {
    constructor() {
    }

    public compile(node: AST<any>, fileName: string): JavaClass[] {
        const fileScope = new FileScope(fileName);
        const context = ClassCompileContext.createMainMethod(fileScope);
        
        this.handle(node, context);
        return fileScope.allClasses;
    }

    public handleProgram(node: NodeWithType, context: CompileContext) {
        const program: AST<any> = assertNodeType(node, AST_NODE_TYPES.Program);
        program.body.forEach((stmt) => {
            this.handle(stmt, context);
        });
    }

    public handleClassDef(node: NodeWithType, context: CompileContext) {
        const classDeclaration: ClassDeclaration = assertNodeType(node,
            AST_NODE_TYPES.ClassDeclaration)
        const name = this.evalIdent(classDeclaration.id!, context);
        let superClassName = classDeclaration.superClass ?
            this.evaluate(classDeclaration.superClass, context) : "Object";
        const superClass = context.getQualifiedNameFor(superClassName);
        const clss = new JavaClass(JavaClass.ACCESS.PUBLIC, name, superClass);

        const newContext = ClassCompileContext.createClassContext(context.fileContext, clss);

        this.handle(classDeclaration.body, newContext);
    }

    public evalIdent(node: NodeWithType, context: CompileContext): string {
        const identifier: Identifier = assertNodeType(node, AST_NODE_TYPES.Identifier)
        return identifier.name;
    }

    public handleClassBody(node: NodeWithType, context: CompileContext) {
        const body: ClassBody = assertNodeType(node, AST_NODE_TYPES.ClassBody);
        body.body.forEach((stmt) => {
            this.handle(stmt, context);
        })
    }

    public handleMethodDef(node: NodeWithType, context: CompileContext) {
        const namedNode: MethodDefinitionComputedName = assertNodeType(node,
            AST_NODE_TYPES.MethodDefinition);
        const name = this.evaluate(namedNode.key, context);
        const classContext = ClassCompileContext.assertType(context);

        const signature = this.extractSignature(namedNode.value, context);
        const methodContext = MethodCompileContext.createMethodContext(classContext, JavaMethod.ACCESS.PUBLIC, name, signature);

        this.handle(namedNode.value, methodContext);
    }

    private extractSignature(node: FunctionExpression | TSEmptyBodyFunctionExpression,
                             context: CompileContext): JavaMethodSignature {
        const params = node.params.map((param) => {
            const ident = assertNodeType<Identifier>(param, AST_NODE_TYPES.Identifier);
            return TypeCompiler.compile(ident.typeAnnotation!, context);
        });

        let returns;
        if (node.returnType) {
            returns = TypeCompiler.compile(node.returnType, context);
        } else {
            returns = JavaType.VOID;
        }

        return new JavaMethodSignature(params, returns);
    }

    public handlePropertyDef(node: NodeWithType, context: CompileContext) {
        const propertyNode: PropertyDefinition = assertNodeType(node,
            AST_NODE_TYPES.PropertyDefinition);
        const name = this.evaluate(propertyNode.key, context);
        const classContext = ClassCompileContext.assertType(context);

        const type = this.extractTypeFromHint(propertyNode.typeAnnotation, context);
    }

    private extractTypeFromHint(node: TSTypeAnnotation | undefined, context: CompileContext): JavaType {
        if (node === undefined) {
            return JavaType.OBJECT;
        }
        return TypeCompiler.compile(node.typeAnnotation, context);
    }

    public handleFunctionExpr(node: NodeWithType, context: CompileContext) {
        const functionExpr: FunctionExpression = assertNodeType(node,
            AST_NODE_TYPES.FunctionExpression);

        this.handle(functionExpr.body, context);
    }

    public handleBlock(node: NodeWithType, context: CompileContext) {
        const block: BlockStatement = assertNodeType(node, AST_NODE_TYPES.BlockStatement);
        block.body.forEach((stmt) => {
            this.handle(stmt, context);
        });
    }

    public handleExpr(node: NodeWithType, context: CompileContext) {
        const expr: ExpressionStatement = assertNodeType(node, AST_NODE_TYPES.ExpressionStatement);
        this.handle(expr.expression, context);
    }

    public handleCallExpr(node: NodeWithType, context: CompileContext) {
        const call: CallExpression = assertNodeType(node, AST_NODE_TYPES.CallExpression);
        const methodContext = MethodCompileContext.assertType(context);

        const memberExpr = call.callee as MemberExpression;

        // Load function ref
        const obj = this.evaluate(memberExpr.object, methodContext);
        const qualifiedObjClass = methodContext.getQualifiedNameFor(obj);

        // Load params
        call.arguments.forEach((arg) => {
            this.handle(arg, methodContext);
        });

        // Invoke method
        const propName = this.evaluate(memberExpr.property as Expression, context);
        const methodMeta = methodContext.getClassMeta(qualifiedObjClass).methods[propName];
        methodContext.getCode().invokestaticInstr(qualifiedObjClass, propName,
            methodMeta.sig);
    }

    public handleMemberExpr(node: NodeWithType, context: CompileContext) {

    }

    public handleNewExpr(node: NodeWithType, context: CompileContext) {

    }

    public handleAssignmentExpr(node: NodeWithType, context: CompileContext) {

    }

    public handleVarDecl(node: NodeWithType, context: CompileContext) {

    }

    public handleLiteral(node: NodeWithType, context: CompileContext) {
        const literal: Literal = assertNodeType(node, AST_NODE_TYPES.Literal)
        const methodContext = MethodCompileContext.assertType(context);

        const literalValue = literal.value ?? "null";
        methodContext.getCode().loadconstInstr(literalValue.toString())
    }

    readonly handlerMap: PartialRecord<AST_NODE_TYPES, NodeHandler> = {
        Program: this.handleProgram.bind(this),
        ClassDeclaration: this.handleClassDef.bind(this),
        ClassBody: this.handleClassBody.bind(this),
        MethodDefinition: this.handleMethodDef.bind(this),
        PropertyDefinition: this.handlePropertyDef.bind(this),
        FunctionExpression: this.handleFunctionExpr.bind(this),
        BlockStatement: this.handleBlock.bind(this),

        ExpressionStatement: this.handleExpr.bind(this),
        CallExpression: this.handleCallExpr.bind(this),
        NewExpression: this.handleNewExpr.bind(this),
        AssignmentExpression: this.handleAssignmentExpr.bind(this),
        VariableDeclaration: this.handleVarDecl.bind(this),
        MemberExpression: this.handleMemberExpr.bind(this),

        Literal: this.handleLiteral.bind(this),

    }

    public handle(node: BaseNode, context: CompileContext) {
        const handler = this.handlerMap[node.type];
        if (handler === undefined) {
            throw new Error(`No handler for ${node.type}`)
        }
        handler(node, context);
    }

    readonly evaluatorMap: PartialRecord<AST_NODE_TYPES, NodeEvaluator> = {
        Identifier: this.evalIdent.bind(this),
    }

    public evaluate(node: BaseNode, context: CompileContext): string {
        const handler = this.evaluatorMap[node.type];
        if (handler === undefined) {
            throw new Error(`No evaluator for ${node.type}`)
        }
        return handler(node, context);
    }
}

export function compile(ast: AST<any>, fileName: string): JavaClass[] {
    const compiler = new Compiler();
    return compiler.compile(ast, fileName);
}