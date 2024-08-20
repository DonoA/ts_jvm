import {concatToBytes, toBytes, ToBytes, uint16, uint8} from "./utils";
import {JavaAttribute} from "./attributes/JavaAttribute";
import {JavaClass} from "./JavaClass";
import {JavaType} from "./JavaType";
import { JavaCodeBlock } from "./JavaCodeBlock";

export class JavaMethodSignature {
    static EMPTY = new JavaMethodSignature([], JavaType.VOID);
    static MAIN = new JavaMethodSignature([JavaType.STRING_ARR], JavaType.VOID);

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

export class JavaMethod implements ToBytes{
    static ACCESS = {
        PUBLIC: 0x0001,
        STATIC: 0x0008,
    }

    readonly accessFlags: uint16;
    readonly name: string;
    readonly signature: JavaMethodSignature;
    readonly clss: JavaClass;

    readonly attributes: JavaAttribute[];
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