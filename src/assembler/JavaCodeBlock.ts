import { JavaCodeAttribute } from "./attributes/JavaCodeAttribute";
import {ConstantPool} from "./ConstantPool";
import { JavaField } from "./JavaField";
import {JavaMethod, JavaMethodSignature} from "./JavaMethod";
import { JavaCompiledClassName, JavaQualifiedClassName, JavaType } from "./JavaType";
import {toBytes} from "./utils";

interface JavaLocal {
    name: string;
    localIndex: number;
    type: JavaType;
}

export class JavaCodeBlock {
    private readonly javaMethod: JavaMethod;
    private readonly constantPool: ConstantPool;
    private readonly localByName: Map<string, JavaLocal>;
    private locals: JavaLocal[];

    private maxStack: number;
    private currentStack: number;
    private codeBytes: JavaCodeAttribute;

    constructor(javaMethod: JavaMethod, constantPool: ConstantPool) {
        this.javaMethod = javaMethod;
        this.constantPool = constantPool;

        this.maxStack = this.currentStack = 0;
        this.codeBytes = new JavaCodeAttribute(constantPool);

        this.localByName = new Map();
        this.locals = [];
        // THIS is always the first local
        if ((javaMethod.accessFlags & JavaMethod.ACCESS.STATIC) === 0) {
            this.addLocal("this", javaMethod.clss.asType());
        }
        javaMethod.signature.args.forEach((arg) => {
            this.addLocal(arg.name, arg.type);
        });
    }

    private addStackSize(count: number) {
        this.currentStack += count;
        if (this.currentStack < 0) {
            throw new Error("Negative stack");
        }

        this.maxStack = Math.max(this.maxStack, this.currentStack);
        this.codeBytes.setStackSize(this.maxStack);
    }

    public addLocal(name: string, type: JavaType) {
        this.codeBytes.addLocal();
        const newLocal = {name, localIndex: this.locals.length, type};
        this.locals.push(newLocal);
        this.localByName.set(name, newLocal);
    }

    public getLocalType(name: string): JavaType {
        const local = this.localByName.get(name);
        if (local === undefined) {
            throw new Error(`Local ${name} not found`);
        }
        return local.type;
    }

    public hasLocal(name: string): boolean {
        return this.localByName.has(name);
    }

    public loadconstInstr(value: string) {
        const stringHandle = this.constantPool.addStringWithValue(value);
        this.codeBytes.addInstruction([0x12, ...toBytes(stringHandle, 1)])

        this.addStackSize(1);
    }

    public dupInstr() {
        this.codeBytes.addInstruction([0x59])

        this.addStackSize(1);
    }

    public invokevirtualInstr(ofClass: JavaQualifiedClassName, prop: string,
                            typeSignature: JavaMethodSignature) {
        const methodRefHandle = this.constantPool.addMethodRefWithName(ofClass,
            prop, typeSignature.getTypeString());
        this.codeBytes.addInstruction([0xb6, ...toBytes(methodRefHandle, 2)])
        this.addStackSize(-typeSignature.args.length);
    }

    public invokespecialInstr(ofClass: JavaQualifiedClassName, prop: string,
                            typeSignature: JavaMethodSignature) {
        const methodRefHandle = this.constantPool.addMethodRefWithName(ofClass,
        prop, typeSignature.getTypeString());
        this.codeBytes.addInstruction([0xb7, ...toBytes(methodRefHandle, 2)])
        this.addStackSize(-typeSignature.args.length);
    }

    public invokestaticInstr(ofClass: JavaQualifiedClassName, prop: string,
                            typeSignature: JavaMethodSignature) {
        const methodRefHandle = this.constantPool.addMethodRefWithName(ofClass,
            prop, typeSignature.getTypeString());
        this.codeBytes.addInstruction([0xb8, ...toBytes(methodRefHandle, 2)])
        this.addStackSize(-typeSignature.args.length);
    }

    public returnInstr() {
        this.codeBytes.addInstruction([0xb1]);
        this.codeBytes.setHasReturn();
    }

    public areturnInstr() {
        this.codeBytes.addInstruction([0xb0])
        this.addStackSize(-1);
        this.codeBytes.setHasReturn();
    }

    public getstaticInstr(ofClass: JavaQualifiedClassName, prop: string, type: JavaCompiledClassName) {
        const fieldRefHandle = this.constantPool
            .addFieldRefWithName(ofClass, prop, type);
        this.codeBytes.addInstruction([0xb2, ...toBytes(fieldRefHandle, 2)])

        this.addStackSize(1);
    }

    public getfieldInstr(ofClass: JavaQualifiedClassName, prop: string, type: JavaCompiledClassName) {
        const fieldRefHandle = this.constantPool
            .addFieldRefWithName(ofClass, prop, type);
        this.codeBytes.addInstruction([0xb4, ...toBytes(fieldRefHandle, 2)])

        this.addStackSize(0);
    }

    public putfieldInstr(field: JavaField) {
        const fieldRefHandle = this.constantPool
            .addFieldRefWithName(field.clss.className, field.name, field.type.toTypeRefSemi());
        this.codeBytes.addInstruction([0xb5, ...toBytes(fieldRefHandle, 2)])

        this.addStackSize(-2);
    }

    public newInstr(className: JavaQualifiedClassName) {
        const classHandle = this.constantPool.addClassWithName(className);
        this.codeBytes.addInstruction([0xbb, ...toBytes(classHandle, 2)])

        this.addStackSize(1);
    }

    public astoreInstr(index: number) {
        this.codeBytes.addInstruction([0x3a, ...toBytes(index, 1)])

        this.addStackSize(-1);
        this.addLocal(`local${index}`, JavaType.OBJECT);
    }

    public astoreLocalInstr(name: string) {
        const local = this.localByName.get(name);
        if (local === undefined) {
            throw new Error(`Local ${name} not found`);
        }

        this.codeBytes.addInstruction([0x3a, ...toBytes(local.localIndex, 1)])
        this.addStackSize(-1);
    }

    public aloadInstr(index: number) {
        this.codeBytes.addInstruction([0x19, ...toBytes(index, 1)]);
        
        this.addStackSize(1);
    }

    public aloadLocalInstr(name: string) {
        const local = this.localByName.get(name);
        if (local === undefined) {
            throw new Error(`Local ${name} not found`);
        }
        this.codeBytes.addInstruction([0x19, ...toBytes(local.localIndex, 1)]);
        
        this.addStackSize(1);
    }


    public getCodeAttribute(): JavaCodeAttribute {
        return this.codeBytes;
    }
}