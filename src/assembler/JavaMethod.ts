import {concatToBytes, toBytes, ToBytes, uint16, uint8} from "./utils";
import {JavaAttribute} from "./attributes/JavaAttribute";
import {JavaClass} from "./JavaClass";
import {ConstantPool} from "./ConstantPool";
import {JavaCodeAttribute} from "./attributes/JavaCodeAttribute";
import {JavaType} from "./JavaType";

export class JavaMethodSignature {
    readonly args: JavaType[];
    readonly returns: JavaType;

    constructor(args: JavaType[], returns: JavaType) {
        this.args = args;
        this.returns = returns;
    }

    public getTypeString(): string {
        return `(${JavaType.join(this.args)})${this.returns.toTypeRef()}`;
    }
}

export class JavaMethod implements ToBytes<ConstantPool>{
    readonly accessFlags: uint16;
    readonly name: string;
    readonly signature: JavaMethodSignature;

    readonly attributes: JavaAttribute[];

    private codeAttribute: JavaCodeAttribute | null;

    constructor(accessFlags: uint16, name: string, signature: JavaMethodSignature) {
        this.accessFlags = accessFlags;
        this.name = name;
        this.signature = signature;
        this.attributes = [];

        this.codeAttribute = null;
    }

    public addAttribute(attr: JavaAttribute) {
        this.attributes.push(attr);
    }

    public getCode(): JavaCodeAttribute {
        if(!this.codeAttribute) {
            this.codeAttribute = new JavaCodeAttribute();
            this.addAttribute(this.codeAttribute);
        }

        return this.codeAttribute;
    }

    public toBytes(constantPool: ConstantPool): uint8[] {
        const nameHandle = constantPool.addUTF8(this.name);
        const sigHandle = constantPool.addUTF8(this.signature.getTypeString());

        return toBytes(this.accessFlags, 2)
            .concat(toBytes(nameHandle, 2))
            .concat(toBytes(sigHandle, 2))
            .concat(toBytes(this.attributes.length, 2))
            .concat(concatToBytes(this.attributes, constantPool))
    }
}