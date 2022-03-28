import {concatToBytes, toBytes, ToBytes, uint16, uint8} from "./utils";
import {JavaAttribute} from "./attributes/JavaAttribute";
import {JavaClass} from "./JavaClass";
import {ConstantPool} from "./ConstantPool";

export class JavaMethod implements ToBytes<ConstantPool>{
    readonly accessFlags: uint16;
    readonly name: string;
    readonly signature: string;

    readonly attributes: JavaAttribute[];

    constructor(accessFlags: uint16, name: string, signature: string) {
        this.accessFlags = accessFlags;
        this.name = name;
        this.signature = signature;
        this.attributes = [];
    }

    public addAttribute(attr: JavaAttribute) {
        this.attributes.push(attr);
    }

    public toBytes(constantPool: ConstantPool): uint8[] {
        const nameHandle = constantPool.addUTF8(this.name);
        const sigHandle = constantPool.addUTF8(this.signature);

        return toBytes(this.accessFlags, 2)
            .concat(toBytes(nameHandle, 2))
            .concat(toBytes(sigHandle, 2))
            .concat(toBytes(this.attributes.length, 2))
            .concat(concatToBytes(this.attributes, constantPool))
    }
}