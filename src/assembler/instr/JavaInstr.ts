import { ConstantPool } from "../ConstantPool";
import { concatToBytes, ToBytes, uint8 } from "../utils";
import { ByteProvider } from "./ByteProvider";

export class JavaInstr implements ToBytes {
    readonly opcode: uint8;
    readonly args: ByteProvider[];

    constructor(opcode: uint8, args: ByteProvider[]) {
        this.opcode = opcode;
        this.args = args;
    }

    public toBytes(pool: ConstantPool): uint8[] {
        return [this.opcode, ...concatToBytes(this.args, pool)];
    }
}