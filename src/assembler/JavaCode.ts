import { FieldMeta } from "../compiler/meta/FieldMeta";
import { JavaCodeAttribute } from "./attributes/JavaCodeAttribute";
import {ConstantPool} from "./ConstantPool";
import { ByteProvider } from "./instr/ByteProvider";
import { JavaInstr } from "./instr/JavaInstr";
import { JavaMethodSignature} from "./JavaMethod";
import { JavaCompiledClassName, JavaQualifiedClassName, JavaType } from "./JavaType";
import {asBytes, concatToBytes} from "./utils";

interface JavaLocal {
    name: string;
    localIndex: number;
    type: JavaType;
}

export class JavaCode {
    private readonly localByName: Map<string, JavaLocal>;
    private locals: JavaLocal[];

    private maxStack: number;
    private currentStack: number;
    private instructions: JavaInstr[];

    private hasReturn: boolean;

    constructor() {
        this.maxStack = this.currentStack = 0;
        this.instructions = [];

        this.localByName = new Map();
        this.locals = [];
        this.hasReturn = false;
    }

    private addStackSize(count: number) {
        this.currentStack += count;
        if (this.currentStack < 0) {
            throw new Error("Negative stack");
        }

        this.maxStack = Math.max(this.maxStack, this.currentStack);
    }

    public addLocal(name: string, type: JavaType) {
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

    private addInstr(opCode: number, args: ByteProvider[]) {
        this.instructions.push(new JavaInstr(opCode, args));
    }

    public loadconstInstr(value: string) {
        const stringHandle = ByteProvider.fromProvider((pool) => pool.addStringWithValue(value), 1);
        this.addInstr(0x12, [stringHandle]);

        this.addStackSize(1);
    }

    public dupInstr() {
        this.addInstr(0x59, []);

        this.addStackSize(1);
    }

    public invokevirtualInstr(ofClass: JavaQualifiedClassName, prop: string,
                            typeSignature: JavaMethodSignature) {
        const methodRefHandle = ByteProvider.fromProvider((pool) => pool.addMethodRefWithName(
            ofClass, prop, typeSignature.getTypeString()), 2);

        this.addInstr(0xb6, [methodRefHandle]);
        this.addStackSize(-typeSignature.args.length);
    }

    public invokespecialInstr(ofClass: JavaQualifiedClassName, prop: string,
                            typeSignature: JavaMethodSignature) {
        const methodRefHandle = ByteProvider.fromProvider((pool) => pool.addMethodRefWithName(
            ofClass, prop, typeSignature.getTypeString()), 2);

        this.addInstr(0xb7, [methodRefHandle]);
        this.addStackSize(-typeSignature.args.length);
    }

    public invokestaticInstr(ofClass: JavaQualifiedClassName, prop: string,
                            typeSignature: JavaMethodSignature) {
        const methodRefHandle = ByteProvider.fromProvider((pool) => pool.addMethodRefWithName(
            ofClass, prop, typeSignature.getTypeString()), 2);

        this.addInstr(0xb8, [methodRefHandle]);
        this.addStackSize(-typeSignature.args.length);
    }

    public returnInstr() {
        this.addInstr(0xb1, []);
        this.hasReturn = true;
    }

    public areturnInstr() {
        this.addInstr(0xb0, []);
        this.addStackSize(-1);
        this.hasReturn = true;
    }

    public getstaticInstr(ofClass: JavaQualifiedClassName, prop: string, type: JavaCompiledClassName) {
        const fieldRefHandle = ByteProvider.fromProvider((pool) =>
            pool.addFieldRefWithName(ofClass, prop, type), 2);
        this.addInstr(0xb2, [fieldRefHandle]);

        this.addStackSize(1);
    }

    public getfieldInstr(ofClass: JavaQualifiedClassName, prop: string, type: JavaCompiledClassName) {
        const fieldRefHandle = ByteProvider.fromProvider((pool) =>
            pool.addFieldRefWithName(ofClass, prop, type), 2);
        this.addInstr(0xb4, [fieldRefHandle]);

        this.addStackSize(0);
    }

    public putfieldInstr(field: FieldMeta) {
        const fieldRefHandle = ByteProvider.fromProvider((pool) =>
            pool.addFieldRefWithName(field.parent.name, field.name, field.clss.toTypeRefSemi()), 2);
        this.addInstr(0xb5, [fieldRefHandle]);

        this.addStackSize(-2);
    }

    public newInstr(className: JavaQualifiedClassName) {
        const classHandle = ByteProvider.fromProvider((pool) => pool.addClassWithName(className), 2);
        this.addInstr(0xbb, [classHandle]);

        this.addStackSize(1);
    }

    public astoreInstr(index: number) {
        this.addInstr(0x3a, [ByteProvider.fromValue(index, 1)]);

        this.addStackSize(-1);
        this.addLocal(`local${index}`, JavaType.OBJECT);
    }

    public astoreLocalInstr(name: string) {
        const local = this.localByName.get(name);
        if (local === undefined) {
            throw new Error(`Local ${name} not found`);
        }

        this.addInstr(0x3a, [ByteProvider.fromValue(local.localIndex, 1)])
        this.addStackSize(-1);
    }

    public aloadInstr(index: number) {
        this.addInstr(0x19, [ByteProvider.fromValue(index, 1)]);
        
        this.addStackSize(1);
    }

    public aloadLocalInstr(name: string) {
        const local = this.localByName.get(name);
        if (local === undefined) {
            throw new Error(`Local ${name} not found`);
        }
        this.addInstr(0x19, [ByteProvider.fromValue(local.localIndex, 1)]);
        
        this.addStackSize(1);
    }

    public injectAtHead(otherCode: JavaCode) {
        this.instructions = otherCode.instructions.concat(this.instructions);
        this.maxStack = Math.max(this.maxStack, otherCode.maxStack);
        otherCode.locals.forEach((local) => {
            this.addLocal(local.name, local.type);
        });
    }

    public toCodeAttribute(pool: ConstantPool): JavaCodeAttribute {
        if (!this.hasReturn) {
            this.returnInstr();
        }

        const codeBytes = concatToBytes(this.instructions, pool);

        return new JavaCodeAttribute(this.maxStack, this.locals.length, codeBytes);
    }
}