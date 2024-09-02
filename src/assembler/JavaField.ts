import { JavaAttribute } from "./attributes/JavaAttribute";
import { ConstantPool } from "./ConstantPool";
import { JavaClass } from "./JavaClass";
import { JavaType } from "./JavaType";
import { concatToBytes, asBytes, ToBytes, uint16, uint8 } from "./utils";

export class JavaField implements ToBytes {
    static ACCESS = {
        PUBLIC: 0x0001,
        STATIC: 0x0008,
    }

    // u2             access_flags;
    readonly accessFlags: uint16;
    // u2             name_index;
    readonly name: string;
    // u2             descriptor_index;
    readonly type: JavaType;
    
    // u2             attributes_count;
    // attribute_info attributes[attributes_count];
    readonly attributes: JavaAttribute[];

    readonly clss: JavaClass;

    constructor(clss: JavaClass, accessFlags: uint16, name: string, type: JavaType) {
        this.clss = clss;
        this.accessFlags = accessFlags;
        this.name = name;
        this.type = type;
        this.attributes = [];
    }

    toBytes(pool: ConstantPool): uint8[] {
        const nameHandle = pool.addUTF8(this.name);
        const sigHandle = pool.addUTF8(this.type.toTypeRefSemi());

        return asBytes(this.accessFlags, 2)
            .concat(asBytes(nameHandle, 2))
            .concat(asBytes(sigHandle, 2))
            .concat(asBytes(this.attributes.length, 2))
            .concat(concatToBytes(this.attributes, pool))
    }
}