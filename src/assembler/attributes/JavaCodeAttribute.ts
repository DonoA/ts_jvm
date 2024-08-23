import {concatToBytes, toBytes, uint16, uint8} from "../utils";
import {JavaAttribute} from "./JavaAttribute";
import {ConstantPool} from "../ConstantPool";

export class JavaCodeAttribute extends JavaAttribute {
    private maxStack: uint16;
    private maxLocals: uint16;
    private code: uint8[];
    private exceptionTable: any[];
    private attributes: JavaAttribute[];
    private hasReturn: boolean;

    private readonly constantPool: ConstantPool;

    constructor(constantPool: ConstantPool) {
        super();
        this.maxStack = 0;
        this.maxLocals = 0;
        this.code = [];
        this.exceptionTable = [];
        this.attributes = [];
        this.hasReturn = false;

        this.constantPool = constantPool;
    }

    public setStackSize(count: uint8) {
        this.maxStack = (count);
    }

    public addLocal(count?: uint8) {
        this.maxLocals += (count ?? 1);
    }

    public addInstruction(bytes: uint8[]) {
        this.code = this.code.concat(bytes);
    }

    public addReturn() {
        this.addInstruction([0xb1]);
        this.hasReturn = true;
    }

    public toBytes(): uint8[] {
        const nameIdx = this.constantPool.addUTF8("Code");

        if (!this.hasReturn) {
            // A return is required
            this.addReturn();
        }

        const data = toBytes(this.maxStack, 2)
            .concat(toBytes(this.maxLocals, 2))
            .concat(toBytes(this.code.length, 4))
            .concat(this.code)
            .concat(toBytes(this.exceptionTable.length, 2))
            .concat(toBytes(this.attributes.length, 2))
            .concat(concatToBytes(this.attributes));

        return toBytes(nameIdx, 2)
            .concat(toBytes(data.length, 4))
            .concat(data);
    }
}
