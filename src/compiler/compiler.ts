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
    MemberExpression,
    MethodDefinitionComputedName,
    TSEmptyBodyFunctionExpression,
    Literal
} from "@typescript-eslint/types/dist/generated/ast-spec";
import {JavaClass} from "../assembler/JavaClass";
import {JavaMethod} from "../assembler/JavaMethod";
import {JavaCodeAttribute} from "../assembler/attributes/JavaCodeAttribute";
import {toBytes} from "../assembler/utils";

interface NodeWithType {
    type: AST_NODE_TYPES;
}

function assertNodeType<T extends NodeWithType>(node: NodeWithType, expected: AST_NODE_TYPES): T {
    if (node.type !== expected) {
        throw new Error(`Node is of type ${node.type}, expected ${expected}`)
    }

    return node as T;
}

interface FieldMeta {
    readonly name: string;
    readonly classes: ToTypeRef[];
}

interface MethodMeta {
    readonly name: string;
    readonly args: ToTypeRef[];
    readonly returns: ToTypeRef;
}

interface ClassMeta {
    readonly name: string;
    readonly qualifiedName: ToTypeRef;
    readonly fields: Record<string, FieldMeta>;
    readonly methods: Record<string, MethodMeta>;
}

interface ToTypeRef {
    toTypeRef(): string;
    getName(): string;
}

class ClassName implements ToTypeRef {
    private readonly name: string;

    constructor(name: string) {
        this.name = name;
    }

    public toTypeRef(): string {
        return "L" + this.name;
    }

    public getName(): string {
        return this.name;
    }
}

class SimpleType implements ToTypeRef {
    private readonly name: string;

    constructor(name: string) {
        this.name = name;
    }

    public toTypeRef(): string {
        return this.name[0];
    }

    public getName(): string {
        return this.name;
    }
}

class GlobalCompileContext {
    private readonly importedClasses: Map<string, string>;
    private readonly loadedClasses: Map<string, ClassMeta>;
    public readonly allClasses: JavaClass[];

    constructor() {
        this.loadedClasses = new Map<string, ClassMeta>();
        this.loadedClasses.set("java/lang/Object", {
            name: "Object",
            qualifiedName: new ClassName("java/lang/Object"),
            fields: {},
            methods: {}
        });
        this.loadedClasses.set("java/lang/System", {
            name: "System",
            qualifiedName: new ClassName("java/lang/System"),
            fields: {
                "out": {
                    name: "out",
                    classes: [new ClassName("java/io/PrintStream")],
                }
            },
            methods: {}
        });
        this.loadedClasses.set("java/io/PrintStream", {
            name: "PrintStream",
            qualifiedName: new ClassName("java/io/PrintStream"),
            fields: {
            },
            methods: {
                "println": {
                    name: "println",
                    args: [
                        new ClassName("java/lang/String"),
                    ],
                    returns: new SimpleType("Void"),
                }
            }
        });

        this.importedClasses = new Map<string, string>();
        this.importedClasses.set("Object", "java/lang/Object");
        this.importedClasses.set("System", "java/lang/System");

        this.allClasses = [];
    }

    public getQualifiedNameFor(name: string): string {
        const qualifiedName = this.importedClasses.get(name);
        if (qualifiedName) {
            return qualifiedName;
        }
        throw new Error(`Undefined type ${name}`);
    }

    public getClassMeta(name: string): ClassMeta {
        const meta = this.loadedClasses.get(name);
        if (meta) {
            return meta;
        }
        throw new Error(`Unloaded type ${name}`);
    }

    public createContext(clss: JavaClass): CompileContext {
        this.allClasses.push(clss);
        return new CompileContext(this, clss);
    }

}

class CompileContext {
    public readonly globalCtx: GlobalCompileContext;
    private readonly clss: JavaClass;

    constructor(globalCtx: GlobalCompileContext, clss: JavaClass) {
        this.clss = clss;
        this.globalCtx = globalCtx;
    }

    public getQualifiedNameFor(name: string): string {
        return this.globalCtx.getQualifiedNameFor(name);
    }

    public getClassMeta(name: string): ClassMeta {
        return this.globalCtx.getClassMeta(name);
    }

    public getCurrentClass(): JavaClass {
        return this.clss;
    }
}

class MethodCompileContext extends CompileContext {
    private readonly method: JavaMethod;
    private codeAttribute: JavaCodeAttribute | null;

    constructor(globalCtx: GlobalCompileContext, clss: JavaClass, method: JavaMethod) {
        super(globalCtx, clss);
        this.method = method;
        this.codeAttribute = null;
    }

    public getMethod(): JavaMethod {
        return this.method;
    }

    public getCode(): JavaCodeAttribute {
        if(!this.codeAttribute) {
            this.codeAttribute = new JavaCodeAttribute();
            this.method.addAttribute(this.codeAttribute);
        }

        return this.codeAttribute;
    }

    public static assertType(context: CompileContext): MethodCompileContext {
        if (context instanceof MethodCompileContext) {
            return context;
        }

        throw new Error(`Expected instance of MethodCompileContext`);
    }
}

type NodeHandler = (node: any, context: CompileContext) => void;
type NodeEvaluator = (node: any, context: CompileContext) => string;

class Compiler {

    readonly globalClass: JavaClass;

    readonly majorVersion: number = 0x34;
    readonly minorVersion: number = 0;

    constructor() {
        this.globalClass = new JavaClass("GlobalClass",
            "java/lang/Object", this.minorVersion, this.majorVersion,
            0x21);
    }

    public compile(node: AST<any>): JavaClass[] {
        const globalContext = new GlobalCompileContext();
        const context = globalContext.createContext(this.globalClass);
        this.handle(node, context);
        return globalContext.allClasses;
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
        const clss = new JavaClass(name,
            superClass, this.minorVersion, this.majorVersion,
            0x21);

        const newContext = context.globalCtx.createContext(clss);

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

        const signature = this.extractSignature(namedNode.value);

        const method = new JavaMethod(0x9, name, signature)
        const methodContext = new MethodCompileContext(context.globalCtx,
            context.getCurrentClass(), method);
        context.getCurrentClass().addMethod(method);
        methodContext.getCode().addLocal(1);
        methodContext.getCode().addStackSize(2);

        this.handle(namedNode.value, methodContext);

    //    Assume there was no return
        methodContext.getCode().addInstruction([0xb1]);
    }

    private extractSignature(node: FunctionExpression | TSEmptyBodyFunctionExpression): string {
        // Method dec sig
        return "([Ljava/lang/String;)V";
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
        const field = this.handleMemberFieldExpr(memberExpr.object as MemberExpression, methodContext);

        // Load params
        call.arguments.forEach((arg) => {
            this.handle(arg, methodContext);
        });

        // Invoke method
        const fieldClass = field.classes[0].getName();
        const propName = this.evaluate(memberExpr.property as Expression, context);
        const methodMeta = methodContext.getClassMeta(fieldClass).methods[propName];
        const methodRefHandle = methodContext.getCurrentClass().constantPool.addMethodRefWithName(
            fieldClass,
            propName,
            this.toTypeRefWithReturn(methodMeta.args, methodMeta.returns)
        );
        methodContext.getCode()
            .addInstruction([0xb6, ...toBytes(methodRefHandle, 2)])

    }

    private handleMemberFieldExpr(node: MemberExpression, methodContext: MethodCompileContext): FieldMeta {
        const obj = this.evaluate(node.object, methodContext);
        const prop = this.evaluate(node.property as Identifier, methodContext);

        const qualifiedObjClass = methodContext.getQualifiedNameFor(obj);
        const classMeta = methodContext.getClassMeta(qualifiedObjClass);
        const propMeta = classMeta.fields[prop];
        const propType = this.toTypeRef(propMeta.classes);

        const fieldRefHandle = methodContext.getCurrentClass().constantPool
            .addFieldRefWithName(qualifiedObjClass, prop, propType);
        methodContext.getCode().addInstruction([0xb2, ...toBytes(fieldRefHandle, 2)])
        return propMeta;
    }

    private toTypeRef(types: ToTypeRef[]): string {
        return types.map((typ) => typ.toTypeRef() + ";").join("");
    }

    private toTypeRefWithReturn(types: ToTypeRef[], returns: ToTypeRef): string {
        return `(${this.toTypeRef(types)})${returns.toTypeRef()}`;
    }

    public handleLiteral(node: NodeWithType, context: CompileContext) {
        const literal: Literal = assertNodeType(node, AST_NODE_TYPES.Literal)
        const methodContext = MethodCompileContext.assertType(context);

        const literalValue = literal.value ?? "null";

        const stringHandle = context.getCurrentClass().constantPool
            .addStringWithValue(literalValue.toString());
        methodContext.getCode().addInstruction([0x12, ...toBytes(stringHandle, 1)])
    }

    public evalTSType(node: any, context: CompileContext): string {
        return "";
    }

    public evalTSArrayType(node: any, context: CompileContext): string {
        return "";
    }

    public evalTSStringKeyword(node: any, context: CompileContext): string {
        return "";
    }

    readonly handlerMap: Record<string, NodeHandler> = {
        "Program": this.handleProgram.bind(this),
        "ClassDeclaration": this.handleClassDef.bind(this),
        "ClassBody": this.handleClassBody.bind(this),
        "MethodDefinition": this.handleMethodDef.bind(this),
        "FunctionExpression": this.handleFunctionExpr.bind(this),
        "BlockStatement": this.handleBlock.bind(this),
        "ExpressionStatement": this.handleExpr.bind(this),
        "CallExpression": this.handleCallExpr.bind(this),
        // "MemberExpression": this.handleMemberExpr.bind(this),
        "Literal": this.handleLiteral.bind(this),
    }

    public handle(node: BaseNode, context: CompileContext) {
        const handler = this.handlerMap[node.type];
        if (handler === undefined) {
            throw new Error(`No handler for ${node.type}`)
        }
        handler(node, context);
    }

    readonly evaluatorMap: Record<string, NodeEvaluator> = {
        "Identifier": this.evalIdent.bind(this),
        "TSTypeAnnotation": this.evalTSType.bind(this),
        "TSArrayType": this.evalTSArrayType.bind(this),
        "TSStringKeyword": this.evalTSStringKeyword.bind(this),
    }

    public evaluate(node: Expression, context: CompileContext): string {
        const handler = this.evaluatorMap[node.type];
        if (handler === undefined) {
            throw new Error(`No evaluator for ${node.type}`)
        }
        return handler(node, context);
    }
}

export function compile(ast: AST<any>): JavaClass[] {
    const compiler = new Compiler();
    return compiler.compile(ast);

    // const clss = new JavaClass("HelloClass", "java/lang/Object", 0x0, 0x34, 0x21);
    //
    // const mainHandle = clss.constantPool.addUTF8("main");
    // const mainSigHandle = clss.constantPool.addUTF8("([Ljava/lang/String;)V");
    // const codeHandle = clss.constantPool.addUTF8("Code");
    //
    // const helloWorldMethod = new JavaMethod(0x9, mainHandle, mainSigHandle);
    // const codeAttribute = new JavaCodeAttribute(codeHandle);
    // codeAttribute.addStackSize(2);
    // codeAttribute.addLocal(1);
    // const fieldRefHandle = clss.constantPool.addFieldRefWithName("java/lang/System", "out", "Ljava/io/PrintStream;");
    // codeAttribute.addInstruction([0xb2, ...toBytes(fieldRefHandle, 2)])
    //
    // const stringHandle = clss.constantPool.addStringWithValue("Hello World!");
    // codeAttribute.addInstruction([0x12, ...toBytes(stringHandle, 1)])
    //
    // const methodRefHandle = clss.constantPool.addMethodRefWithName("java/io/PrintStream", "println", "(Ljava/lang/String;)V");
    // codeAttribute.addInstruction([0xb6, ...toBytes(methodRefHandle, 2)])
    //
    // codeAttribute.addInstruction([0xb1]);
    //
    // helloWorldMethod.addAttribute(codeAttribute);
    // clss.methods.push(helloWorldMethod);
    //
    // return clss;
}