import {concatToBytes, asBytes, ToBytes, uint16, uint8} from "./utils";
import {JavaAttribute} from "./attributes/JavaAttribute";
import {JavaClass} from "./JavaClass";
import {JavaType} from "./JavaType";
import { JavaCode } from "./JavaCode";
import { ConstantPool } from "./ConstantPool";

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
        return `(${argString})${this.returns.toTypeRefSemi()}`;
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
    readonly code: JavaCode;

    constructor(clss: JavaClass, accessFlags: uint16, name: string, signature: JavaMethodSignature, existingCode: JavaCode | null = null) {
        this.accessFlags = accessFlags;
        this.name = name;
        this.signature = signature;
        this.attributes = [];
        this.clss = clss;

        this.code = existingCode ?? new JavaCode();
        // THIS is always the first local
        if ((accessFlags & JavaMethod.ACCESS.STATIC) === 0) {
            this.code.addLocal("this", clss.asType());
        }
        signature.args.forEach((arg) => {
            this.code.addLocal(arg.name, arg.type);
        });
    }

    public addAttribute(attr: JavaAttribute) {
        this.attributes.push(attr);
    }

    public toBytes(pool: ConstantPool): uint8[] {
        const nameHandle = pool.addUTF8(this.name);
        const sigHandle = pool.addUTF8(this.signature.getTypeString());

        this.addAttribute(this.code.toCodeAttribute(pool));

        return asBytes(this.accessFlags, 2)
            .concat(asBytes(nameHandle, 2))
            .concat(asBytes(sigHandle, 2))
            .concat(asBytes(this.attributes.length, 2))
            .concat(concatToBytes(this.attributes, pool))
    }
}