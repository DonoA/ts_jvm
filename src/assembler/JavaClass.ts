import {concatToBytes, toBytes, uint16, uint32, uint8} from "./utils";
import {ConstantPool} from "./ConstantPool";
import {JavaMethod} from "./JavaMethod";
import {JavaAttribute} from "./attributes/JavaAttribute";

const JAVA_MAGIC = 0xcafebabe;

export class JavaClass {
    readonly className: string;

    readonly magic: uint32 = JAVA_MAGIC;
    readonly minorVersion: uint16;
    readonly majorVersion: uint16;
    readonly constantPool: ConstantPool;
    readonly accessFlags: uint16;
    readonly thisClass: uint16;
    readonly superClass: uint16;
    // u2           interfaces_count
    // u2             interfaces[interfaces_count];
    readonly interfaces: any[];
    // u2             fields_count;
    // field_info     fields[fields_count];
    readonly fields: any[];
    // u2             methods_count;
    // method_info    methods[methods_count];
    readonly methods: JavaMethod[];
    // u2             attributes_count;
    // attribute_info attributes[attributes_count];
    readonly attributes: JavaAttribute[];

    constructor(className: string, superClass: string, minor_version: uint16, major_version: uint16, access_flags: uint16) {
        this.className = className;

        this.minorVersion = minor_version;
        this.majorVersion = major_version;
        this.accessFlags = access_flags;

        this.constantPool = new ConstantPool();
        this.thisClass = this.constantPool.addClassWithName(className);
        this.superClass = this.constantPool.addClassWithName(superClass);

        this.interfaces = [];
        this.fields = [];
        this.methods = [];
        this.attributes = [];
    }

    public addMethod(method: JavaMethod) {
        this.methods.push(method);
    }

    toBytes(): uint8[] {
        const methods = this.methods.reduce<uint8[]>(
            (byteArray, val): uint8[] => {
            return byteArray.concat(val.toBytes(this.constantPool));
        }, []);

        return toBytes(this.magic, 4)
            .concat(toBytes(this.minorVersion, 2))
            .concat(toBytes(this.majorVersion, 2))
            .concat(this.constantPool.toBytes())
            .concat(toBytes(this.accessFlags, 2))
            .concat(toBytes(this.thisClass, 2))
            .concat(toBytes(this.superClass, 2))
            .concat(toBytes(this.interfaces.length, 2))
            .concat(toBytes(this.fields.length, 2))
            .concat(toBytes(this.methods.length, 2))
            .concat(methods)
            .concat(toBytes(this.attributes.length, 2));
    }
}