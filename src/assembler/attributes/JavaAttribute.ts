import {ToBytes, uint8} from "../utils";
import {ConstantPool} from "../ConstantPool";

export abstract class JavaAttribute implements ToBytes<ConstantPool> {
    public abstract toBytes(constantPool: ConstantPool): uint8[];
}