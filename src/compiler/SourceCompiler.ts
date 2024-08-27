import {AST, AST_NODE_TYPES} from "@typescript-eslint/typescript-estree";
import {
    BlockStatement,
    CallExpression,
    ClassBody,
    ClassDeclaration,
    ExpressionStatement,
    FunctionExpression,
    Identifier,
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
import {JavaMethodSignature} from "../assembler/JavaMethod";
import {JavaSimpleClassName, JavaType} from "../assembler/JavaType";
import {CompileContext} from "./context/CompileContext";
import {FileScope} from "./context/FileScope";
import {MethodCompileContext} from "./context/MethodCompileContext";
import {PartialRecord} from "../util/PartialRecord";
import {assertNodeType, NodeWithType} from "./AssertNodeType";
import { ClassCompileContext } from "./context/ClassCompileContext";
import { CompileResult } from "./CompileResult";

type NodeHandler = (node: any, context: CompileContext) => CompileResult;

export interface SourceCompileResult {
    errorNode: NodeWithType | null;
    error: Error | null;
}

class SourceCompiler {
    errorNode: NodeWithType | null = null;

    constructor() {
    }

    public compileSource(node: AST<any>, classes: JavaClass[], fileName: string): SourceCompileResult {
        const fileScope = new FileScope(fileName, classes);
        const context = ClassCompileContext.loadMainMethod(fileScope);
        
        try {
            this.handle(node, context);
        } catch (e) {
            return {
                errorNode: this.errorNode!,
                error: e as Error
            };
        }
        return {
            errorNode: null,
            error: null
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
        const name = this.handle(classDeclaration.id!, context).getValue();
        const classContext = ClassCompileContext.loadClassContext(context.fileContext, name);

        this.handle(classDeclaration.body, classContext);

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
        let name = this.handle(namedNode.key, context).getValue();
        const isConstructor = namedNode.kind === "constructor";
        if (isConstructor) {
            name = "<init>";
        }
        const classContext = ClassCompileContext.assertType(context);
        const methodContext = MethodCompileContext.loadMethodContext(classContext, name);

        // Java requires that the first method called is "super" if the constructor does not call it
        if (isConstructor && !this.callsSuper(namedNode.value)) {
            methodContext.getCode().aloadInstr(0);
            methodContext.getCode().invokespecialInstr(classContext.clss.superClassName, "<init>", JavaMethodSignature.fromTypes([], JavaType.VOID));
        }

        this.handle(namedNode.value, methodContext);
        return CompileResult.empty();
    }

    // Check if the constructor calls super
    private callsSuper(node: FunctionExpression | TSEmptyBodyFunctionExpression): boolean {
        if (node.type !== AST_NODE_TYPES.FunctionExpression) {
            return false;
        }

        const body = node.body;
        if (body.body.length === 0) {
            return false;
        }

        const firstStmt = body.body[0];
        if (firstStmt.type !== AST_NODE_TYPES.ExpressionStatement) {
            return false;
        }

        const expr = firstStmt.expression;
        if (expr.type !== AST_NODE_TYPES.CallExpression) {
            return false;
        }

        const callee = expr.callee;
        if (callee.type !== AST_NODE_TYPES.MemberExpression) {
            return false;
        }

        const obj = callee.object;
        if (obj.type !== AST_NODE_TYPES.Super) {
            return false;
        }

        return true;
    }

    public handleNoOp(node: NodeWithType, context: CompileContext): CompileResult {
        // Pass
        return CompileResult.empty();
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
        const memberExpr: MemberExpression = assertNodeType(call.callee, AST_NODE_TYPES.MemberExpression);

        // Load function ref
        const objIdent = this.handle(memberExpr.object, methodContext).getValue();

        // Check if this is a local
        if (methodContext.getCode().hasLocal(objIdent)) {
            return this.compileLocalMethodCall(objIdent, call, methodContext);
        // Check if this is a field
        } else if (methodContext.clss.fieldsByName.has(objIdent)) { 
            return this.compileFieldMethodCall(objIdent, call, methodContext);
        // Check if this is a static method
        } else {
            return this.compileStaticMethodCall(objIdent, call, methodContext);
        }
    }

    private compileLocalMethodCall(objIdent: string, call: CallExpression, methodContext: MethodCompileContext): CompileResult {
        const memberExpr: MemberExpression = assertNodeType(call.callee, AST_NODE_TYPES.MemberExpression);
        const type = methodContext.getCode().getLocalType(objIdent);

        // Load object ref
        methodContext.getCode().aloadLocalInstr(objIdent);

        // Load params
        call.arguments.forEach((arg) => {
            this.handle(arg, methodContext);
        });

        const propName = this.handle(memberExpr.property, methodContext).getValue();
        const methodMeta = methodContext.getClassMeta(type.name).methods[propName];
        methodContext.getCode().invokevirtualInstr(type.name, propName, methodMeta.sig);

        return CompileResult.ofType(methodMeta.sig.returns);
    }

    private compileFieldMethodCall(objIdent: string, call: CallExpression, methodContext: MethodCompileContext): CompileResult {
        const memberExpr: MemberExpression = assertNodeType(call.callee, AST_NODE_TYPES.MemberExpression);
        const type = methodContext.clss.fieldsByName.get(objIdent)!.type;

        // Load object ref from field
        methodContext.getCode().aloadInstr(0);
        methodContext.getCode().getfieldInstr(methodContext.clss.className, objIdent, type.toTypeRefSemi());

        // Load params
        call.arguments.forEach((arg) => {
            this.handle(arg, methodContext);
        });

        const propName = this.handle(memberExpr.property, methodContext).getValue();
        const methodMeta = methodContext.getClassMeta(type.name).methods[propName];
        methodContext.getCode().invokevirtualInstr(type.name, propName, methodMeta.sig);

        return CompileResult.ofType(methodMeta.sig.returns);
    }

    private compileStaticMethodCall(staticClassName: JavaSimpleClassName, call: CallExpression, methodContext: MethodCompileContext): CompileResult {
        const memberExpr: MemberExpression = assertNodeType(call.callee, AST_NODE_TYPES.MemberExpression);
        const qualifiedObjClass = methodContext.getQualifiedNameFor(staticClassName);

        // Load params
        call.arguments.forEach((arg) => {
            this.handle(arg, methodContext);
        });

        const propName = this.handle(memberExpr.property, methodContext).getValue();
        const methodMeta = methodContext.getClassMeta(qualifiedObjClass).methods[propName];
        methodContext.getCode().invokestaticInstr(qualifiedObjClass, propName,
            methodMeta.sig);

        return CompileResult.ofType(methodMeta.sig.returns);
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

        // We can't know if we are getting the value of the field here or simply setting up to assign to it
        if (methodContext.assignmentLHS) {
            // Put THIS object ref on stack
            methodContext.getCode().aloadInstr(0);
        } else {
            // Put THIS object ref on stack
            methodContext.getCode().aloadInstr(0);
            // Get field value
            methodContext.getCode().getfieldInstr(methodContext.clss.className, fieldName, field.type.toTypeRefSemi());
        }

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

        const lhsContext = MethodCompileContext.forAssignmentLHS(methodContext);
        const variable = this.handle(assignment.left, lhsContext);
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

        PropertyDefinition: this.handleNoOp.bind(this),
    }

    public handle(node: NodeWithType, context: CompileContext): CompileResult {
        const handler = this.handlerMap[node.type];
        if (handler === undefined) {
            throw new Error(`No handler for ${node.type}`)
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

export function compileSource(ast: AST<any>, classes: JavaClass[], fileName: string): SourceCompileResult {
    const compiler = new SourceCompiler();
    return compiler.compileSource(ast, classes, fileName);
}