import {ConstantPool} from "../assembler/ConstantPool";
import {JavaMethod, JavaMethodSignature} from "../assembler/JavaMethod";
import {toBytes} from "../assembler/utils";

export class JavaCodeBlock {
    private readonly javaMethod: JavaMethod;
    private readonly constantPool: ConstantPool;

    private maxStack: number;
    private currentStack: number;

    private localCount: number;

    constructor(javaMethod: JavaMethod, constantPool: ConstantPool) {
        this.javaMethod = javaMethod;
        this.constantPool = constantPool;

        this.maxStack = this.currentStack = 0;

        this.localCount = 0;
        this.addLocal(javaMethod.signature.args.length);
    }

    private addStackSize(count: number) {
        this.currentStack += count;
        if (this.currentStack < 0) {
            throw new Error("Negative stack");
        }

        this.maxStack = Math.max(this.maxStack, this.currentStack);
        this.javaMethod.getCode().setStackSize(this.maxStack);
    }

    private addLocal(count: number) {
        this.javaMethod.getCode().addLocal(count);
        this.localCount += 1;
    }

    public invokevirtualInstr(ofClass: string, prop: string,
                         typeSignature: JavaMethodSignature) {
        const methodRefHandle = this.constantPool.addMethodRefWithName(ofClass,
            prop, typeSignature.getTypeString());
        this.javaMethod.getCode()
            .addInstruction([0xb6, ...toBytes(methodRefHandle, 2)])
        this.addStackSize(-typeSignature.args.length);
    }

    public returnInstr() {
        this.javaMethod.getCode().addInstruction([0xb1]);
    }

    public getstaticInstr(ofClass: string, prop: string, type: string) {
        const fieldRefHandle = this.constantPool
            .addFieldRefWithName(ofClass, prop, type);
        this.javaMethod.getCode()
            .addInstruction([0xb2, ...toBytes(fieldRefHandle, 2)])

        this.addStackSize(1);
    }

    public loadconstInstr(value: string) {
        const stringHandle = this.constantPool.addStringWithValue(value);
        this.javaMethod.getCode()
            .addInstruction([0x12, ...toBytes(stringHandle, 1)])

        this.addStackSize(1);
    }
}