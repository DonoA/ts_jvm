import {concatToBytes, toBytes, ToBytes, uint16, uint8} from "./utils";
import {JavaAttribute} from "./attributes/JavaAttribute";
import {JavaClass} from "./JavaClass";
import {JavaType} from "./JavaType";
import { JavaCodeBlock } from "./JavaCodeBlock";

export interface JavaParameter {
    name: string;
    type: JavaType;
}

export class JavaMethodSignature {
    static EMPTY = new JavaMethodSignature([], JavaType.VOID);
    static MAIN = new JavaMethodSignature([{name: "args", type: JavaType.STRING_ARR}], JavaType.VOID);

    readonly args: JavaParameter[];
    readonly returns: JavaType;

    constructor(args: JavaParameter[], returns: JavaType) {
        this.args = args;
        this.returns = returns;
    }

    public static fromTypes(args: JavaType[], returns: JavaType): JavaMethodSignature {
        return new JavaMethodSignature(args.map((arg, i) => ({name: `arg${i}`, type: arg})), returns);
    }

    public getTypeString(): string {
        const argString = this.args.map((arg) => arg.type.toTypeRefSemi()).join("");
        return `(${argString})${this.returns.toTypeRef()}`;
    }
}

export class JavaMethod implements ToBytes{
    static ACCESS = {
        PUBLIC: 0x0001,
        STATIC: 0x0008,
    }

    // u2             access_flags;
    readonly accessFlags: uint16;
    // u2             name_index;
    readonly name: string;
    // u2             descriptor_index;
    readonly signature: JavaMethodSignature;

    // u2             attributes_count;
    // attribute_info attributes[attributes_count];
    readonly attributes: JavaAttribute[];

    readonly clss: JavaClass;
    readonly code: JavaCodeBlock;

    constructor(clss: JavaClass, accessFlags: uint16, name: string, signature: JavaMethodSignature) {
        this.accessFlags = accessFlags;
        this.name = name;
        this.signature = signature;
        this.attributes = [];
        this.clss = clss;

        this.code = new JavaCodeBlock(this, clss.constantPool);
        this.addAttribute(this.code.getCodeAttribute());
    }

    public addAttribute(attr: JavaAttribute) {
        this.attributes.push(attr);
    }

    public toBytes(): uint8[] {
        const nameHandle = this.clss.constantPool.addUTF8(this.name);
        const sigHandle = this.clss.constantPool.addUTF8(this.signature.getTypeString());

        return toBytes(this.accessFlags, 2)
            .concat(toBytes(nameHandle, 2))
            .concat(toBytes(sigHandle, 2))
            .concat(toBytes(this.attributes.length, 2))
            .concat(concatToBytes(this.attributes))
    }
}