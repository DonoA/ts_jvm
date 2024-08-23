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
    VariableDeclaration,
    VariableDeclarator,
    MethodDefinitionComputedName,
    NewExpression,
    TSEmptyBodyFunctionExpression,
    AssignmentExpression
} from "@typescript-eslint/types/dist/generated/ast-spec";
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

type NodeHandler = (node: any, context: CompileContext) => CompileResult;

class Compiler {
    constructor() {
    }

    public compile(node: AST<any>, fileName: string): JavaClass[] {
        const fileScope = new FileScope(fileName);
        const context = ClassCompileContext.createMainMethod(fileScope);
        
        this.handle(node, context);
        return fileScope.allClasses;
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
        const name = this.handle(classDeclaration.id!, context).getValue();
        let superClassName = classDeclaration.superClass ?
            this.handle(classDeclaration.superClass, context).getValue() : "Object";
        const superClass = context.getQualifiedNameFor(superClassName);
        const clss = new JavaClass(JavaClass.ACCESS.PUBLIC, name, superClass);

        const newContext = ClassCompileContext.createClassContext(context.fileContext, clss);

        this.handle(classDeclaration.body, newContext);

        return CompileResult.empty();
    }

    public handleIdent(node: NodeWithType, context: CompileContext): CompileResult {
        const identifier: Identifier = assertNodeType(node, AST_NODE_TYPES.Identifier)
        return CompileResult.ofValue(identifier.name);
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
        const name = this.handle(namedNode.key, context).getValue();
        const classContext = ClassCompileContext.assertType(context);

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
        const name = this.handle(propertyNode.key, context).getValue();
        const classContext = ClassCompileContext.assertType(context);

        const type = this.extractTypeFromHint(propertyNode.typeAnnotation, context);
        classContext.clss.addField(JavaField.ACCESS.PUBLIC, name, type);
        return CompileResult.empty();
    }

    private extractTypeFromHint(node: TSTypeAnnotation | undefined, context: CompileContext): JavaType {
        if (node === undefined) {
            return JavaType.OBJECT;
        }
        return TypeCompiler.compile(node.typeAnnotation, context);
    }

    public handleFunctionExpr(node: NodeWithType, context: CompileContext): CompileResult {
        const functionExpr: FunctionExpression = assertNodeType(node,
            AST_NODE_TYPES.FunctionExpression);

        this.handle(functionExpr.body, context);
        return CompileResult.empty();
    }

    public handleBlock(node: NodeWithType, context: CompileContext): CompileResult {
        const block: BlockStatement = assertNodeType(node, AST_NODE_TYPES.BlockStatement);
        block.body.forEach((stmt) => {
            this.handle(stmt, context);
        });
        return CompileResult.empty();
    }

    public handleExpr(node: NodeWithType, context: CompileContext): CompileResult {
        const expr: ExpressionStatement = assertNodeType(node, AST_NODE_TYPES.ExpressionStatement);
        this.handle(expr.expression, context);
        return CompileResult.empty();
    }

    public handleCallExpr(node: NodeWithType, context: CompileContext): CompileResult {
        const call: CallExpression = assertNodeType(node, AST_NODE_TYPES.CallExpression);
        const methodContext = MethodCompileContext.assertType(context);

        const memberExpr = call.callee as MemberExpression;

        // Load function ref
        const obj = this.handle(memberExpr.object, methodContext);
        const qualifiedObjClass = methodContext.getQualifiedNameFor(obj.getValue());

        // Load params
        call.arguments.forEach((arg) => {
            this.handle(arg, methodContext);
        });

        // Invoke method
        const propName = this.handle(memberExpr.property as Expression, context).getValue();
        const methodMeta = methodContext.getClassMeta(qualifiedObjClass).methods[propName];
        methodContext.getCode().invokestaticInstr(qualifiedObjClass, propName,
            methodMeta.sig);

        return CompileResult.empty();
    }

    public handleMemberExpr(node: NodeWithType, context: CompileContext): CompileResult {
        const memberExpr: MemberExpression = assertNodeType(node, AST_NODE_TYPES.MemberExpression);
        const methodContext = MethodCompileContext.assertType(context);


        const fieldName = this.handle(memberExpr.property, methodContext).getValue();
        // Assume the object is a THIS
        const field = methodContext.clss.fieldsByName.get(fieldName);
        if (field === undefined) {
            throw new Error(`Field ${fieldName} not found in class ${methodContext.clss.className}`);
        }

        // Put THIS object ref on stack
        methodContext.getCode().aloadInstr(0);

        return CompileResult.ofField(field);
        
    }

    public handleNewExpr(node: NodeWithType, context: CompileContext): CompileResult {
        const newExpr: NewExpression = assertNodeType(node, AST_NODE_TYPES.NewExpression);
        const methodContext = MethodCompileContext.assertType(context);

        const className = this.handle(newExpr.callee, methodContext).getValue();
        const qualifiedClassName = methodContext.getQualifiedNameFor(className);

        // Load params
        const args = newExpr.arguments.map((arg) => 
            this.handle(arg, methodContext));

        // Create instance
        methodContext.getCode().newInstr(qualifiedClassName);
        methodContext.getCode().dupInstr();

        // Call init
        const assumedContructor = JavaMethodSignature.fromTypes(args.map((arg) => arg.getType()), JavaType.VOID);
        methodContext.getCode().invokespecialInstr(qualifiedClassName, "<init>", assumedContructor);

        return CompileResult.ofType(JavaType.forClass(qualifiedClassName));
    }

    public handleAssignmentExpr(node: NodeWithType, context: CompileContext): CompileResult {
        const assignment: AssignmentExpression = assertNodeType(node, AST_NODE_TYPES.AssignmentExpression);
        const methodContext = MethodCompileContext.assertType(context);

        const variable = this.handle(assignment.left, methodContext);
        this.handle(assignment.right, methodContext);

        const assignedToField = variable.getField();
        methodContext.getCode().putfieldInstr(assignedToField);

        return CompileResult.empty();
    }

    public handleVarDeclaration(node: NodeWithType, context: CompileContext): CompileResult {
        const varDecl: VariableDeclaration = assertNodeType(node, AST_NODE_TYPES.VariableDeclaration);
        varDecl.declarations.forEach((decl) => {
            this.handle(decl, context);
        });
        return CompileResult.empty();
    }

    public handleVarDeclarator(node: NodeWithType, context: CompileContext): CompileResult {
        const varDecl: VariableDeclarator = assertNodeType(node, AST_NODE_TYPES.VariableDeclarator);
        const methodContext = MethodCompileContext.assertType(context);

        const name = this.handle(varDecl.id, methodContext).getValue();
        if (varDecl.init === null) {
            throw new Error(`Variable ${name} must be initialized`);
        }
        const initValue = this.handle(varDecl.init, methodContext);

        methodContext.getCode().addLocal(name, initValue.getType());
        methodContext.getCode().astoreLocalInstr(name);

        return CompileResult.empty();
    }

    public handleLiteral(node: NodeWithType, context: CompileContext): CompileResult {
        const literal: Literal = assertNodeType(node, AST_NODE_TYPES.Literal)
        const methodContext = MethodCompileContext.assertType(context);

        const literalValue = literal.value ?? "null";
        methodContext.getCode().loadconstInstr(literalValue.toString());
        return CompileResult.empty();
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
        VariableDeclaration: this.handleVarDeclaration.bind(this),
        VariableDeclarator: this.handleVarDeclarator.bind(this),
        MemberExpression: this.handleMemberExpr.bind(this),

        Literal: this.handleLiteral.bind(this),
        Identifier: this.handleIdent.bind(this),
    }

    public handle(node: BaseNode, context: CompileContext): CompileResult {
        const handler = this.handlerMap[node.type];
        if (handler === undefined) {
            throw new Error(`No handler for ${node.type}`)
        }
        return handler(node, context);
    }
}

export function compile(ast: AST<any>, fileName: string): JavaClass[] {
    const compiler = new Compiler();
    return compiler.compile(ast, fileName);
}