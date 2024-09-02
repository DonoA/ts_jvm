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
    AssignmentExpression,
    ReturnStatement,
    PropertyDefinition
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
import { CommonCompiler } from "./CommonCompiler";
import { FieldMeta } from "./meta/FieldMeta";

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
        const name = CommonCompiler.getIdentValue(classDeclaration.id!);
        const classContext = ClassCompileContext.loadClassContext(context.fileContext, name);

        this.handle(classDeclaration.body, classContext);

        const ctrMethod = classContext.clss.getMethod("<init>");
        // Add field init code to constructor
        ctrMethod.code.injectAtHead(classContext.ctrFieldInit);
        // Add super code, this will be injected above all other code in the constructor
        ctrMethod.code.injectAtHead(classContext.ctrSuper);

        return CompileResult.empty();
    }

    public handleIdent(node: NodeWithType, context: CompileContext): CompileResult {
        const identifier: Identifier = assertNodeType(node, AST_NODE_TYPES.Identifier);
        const methodContext = MethodCompileContext.assertType(context);
        
        const name = identifier.name;

        if(methodContext.getCode().hasLocal(name)) {
            methodContext.getCode().aloadLocalInstr(name);
            return CompileResult.ofType(methodContext.getCode().getLocalType(name));
        } else if (methodContext.clss.fieldsByName.has(name)) {
            const field = methodContext.clss.fieldsByName.get(name)!;
            methodContext.getCode().aloadInstr(0);
            methodContext.getCode().getfieldInstr(methodContext.clss.className, name, field.type.toTypeRefSemi());
            return CompileResult.ofType(field.type);
        } else {
            throw new Error(`Variable ${name} not found`);
        }
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
        let name = CommonCompiler.getIdentValue(namedNode.key);
        const isConstructor = namedNode.kind === "constructor";
        if (isConstructor) {
            name = "<init>";
        }
        const classContext = ClassCompileContext.assertType(context);
        const method = classContext.clss.getMethod(name);
        const methodContext = MethodCompileContext.forJavaCode(classContext, method.code);

        this.handle(namedNode.value, methodContext);
        return CompileResult.empty();
    }

    public handlePropertyDef(node: NodeWithType, context: CompileContext): CompileResult {
        const propertyNode: PropertyDefinition = assertNodeType(node,
            AST_NODE_TYPES.PropertyDefinition);

        // The structure compiler already handled this
        if (propertyNode.value === null) {
            return CompileResult.empty();
        }

        const classContext = ClassCompileContext.assertType(context);
        const initCode = classContext.ctrFieldInit;

        // The value needs to be added to the constructor
        const name = CommonCompiler.getIdentValue(propertyNode.key);
        const fieldInitContext = MethodCompileContext.forJavaCode(classContext, classContext.ctrFieldInit);

        // Load value onto stack
        this.handle(propertyNode.value, fieldInitContext);
        const field = classContext.clss.getField(name);
        const fieldMeta = FieldMeta.fromJavaField(field);
        initCode.putfieldInstr(fieldMeta);

        return CompileResult.ofField(fieldMeta);
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
        const objIdent = CommonCompiler.getIdentValue(memberExpr.object);

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

        const propName = CommonCompiler.getIdentValue(memberExpr.property);
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

        const propName = CommonCompiler.getIdentValue(memberExpr.property);
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

        const propName = CommonCompiler.getIdentValue(memberExpr.property);
        const methodMeta = methodContext.getClassMeta(qualifiedObjClass).methods[propName];
        methodContext.getCode().invokestaticInstr(qualifiedObjClass, propName,
            methodMeta.sig);

        return CompileResult.ofType(methodMeta.sig.returns);
    }

    public handleMemberExpr(node: NodeWithType, context: CompileContext): CompileResult {
        const memberExpr: MemberExpression = assertNodeType(node, AST_NODE_TYPES.MemberExpression);
        const methodContext = MethodCompileContext.assertType(context);

        // The method context here might have assignmentLHS set to true, we don't actually want that informatiion
        // to be passed down to the field handling
        const cleanMethodContext = MethodCompileContext.forAssignmentLHS(methodContext, false);

        const fieldName = CommonCompiler.getIdentValue(memberExpr.property);
        // Load object ref onto stack
        const objResult = this.handle(memberExpr.object, cleanMethodContext);

        const objClass = methodContext.getClassMeta(objResult.getType().name);
        const field = objClass.fields[fieldName];
        if (field === undefined) {
            throw new Error(`Field ${fieldName} not found in class ${objClass.name}`);
        }

        // We can't know if we are getting the value of the field here or simply setting up to assign to it
        if (!methodContext.assignmentLHS) {
            methodContext.getCode().getfieldInstr(objClass.type.name, fieldName, field.clss.toTypeRefSemi());
        }

        return CompileResult.ofField(field);
    }

    public handleThisExpr(node: NodeWithType, context: CompileContext): CompileResult {
        const thisNode = assertNodeType(node, AST_NODE_TYPES.ThisExpression);
        const methodContext = MethodCompileContext.assertType(context);
        methodContext.getCode().aloadInstr(0);
        return CompileResult.ofType(methodContext.clss.asType());
    }

    public handleNewExpr(node: NodeWithType, context: CompileContext): CompileResult {
        const newExpr: NewExpression = assertNodeType(node, AST_NODE_TYPES.NewExpression);
        const methodContext = MethodCompileContext.assertType(context);

        const className = CommonCompiler.getIdentValue(newExpr.callee);
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

        const name = CommonCompiler.getIdentValue(varDecl.id);
        if (varDecl.init === null) {
            throw new Error(`Variable ${name} must be initialized`);
        }
        const initValue = this.handle(varDecl.init, methodContext);

        methodContext.getCode().addLocal(name, initValue.getType());
        methodContext.getCode().astoreLocalInstr(name);

        return CompileResult.empty();
    }

    public handleReturn(node: NodeWithType, context: CompileContext): CompileResult {
        const methodContext = MethodCompileContext.assertType(context);
        const ret: ReturnStatement = assertNodeType(node, AST_NODE_TYPES.ReturnStatement);

        if (ret.argument === null) {
            methodContext.getCode().returnInstr();
            return CompileResult.empty();
        }

        const retValue = this.handle(ret.argument, methodContext);
        methodContext.getCode().areturnInstr();

        return CompileResult.ofType(retValue.getType());
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
        PropertyDefinition: this.handlePropertyDef.bind(this),
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
        ReturnStatement: this.handleReturn.bind(this),

        ThisExpression: this.handleThisExpr.bind(this),
        Literal: this.handleLiteral.bind(this),
        Identifier: this.handleIdent.bind(this),
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