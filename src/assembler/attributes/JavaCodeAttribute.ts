import {concatToBytes, asBytes, uint16, uint8} from "../utils";
import {JavaAttribute} from "./JavaAttribute";
import {ConstantPool} from "../ConstantPool";

export class JavaCodeAttribute extends JavaAttribute {
    private maxStack: uint16;
    private maxLocals: uint16;
    private code: uint8[];
    private exceptionTable: any[];
    private attributes: JavaAttribute[];

    constructor(
        maxStack: number,
        maxLocals: number,
        code: number[],
    ) {
        super();
        this.maxStack = maxStack;
        this.maxLocals = maxLocals;
        this.code = code;
        this.exceptionTable = [];
        this.attributes = [];
    }

    public toBytes(pool: ConstantPool): uint8[] {
        const nameIdx = pool.addUTF8("Code");

        const data = asBytes(this.maxStack, 2)
            .concat(asBytes(this.maxLocals, 2))
            .concat(asBytes(this.code.length, 4))
            .concat(this.code)
            .concat(asBytes(this.exceptionTable.length, 2))
            .concat(asBytes(this.attributes.length, 2))
            .concat(concatToBytes(this.attributes, pool));

        return asBytes(nameIdx, 2)
            .concat(asBytes(data.length, 4))
            .concat(data);
    }
}
