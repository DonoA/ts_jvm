import {concatToBytes, asBytes, uint16, uint32, uint8} from "./utils";
import {ConstantPool} from "./ConstantPool";
import {JavaMethod, JavaMethodSignature} from "./JavaMethod";
import {JavaAttribute} from "./attributes/JavaAttribute";
import { JavaQualifiedClassName, JavaType } from "./JavaType";
import { JavaField } from "./JavaField";
import { JavaCode } from "./JavaCode";

const JAVA_MAGIC = 0xcafebabe;

export class JavaClass {
    static readonly majorVersion: number = 0x34;
    static readonly minorVersion: number = 0;
    public static ACCESS = {
        PUBLIC: 0x21
    }

    readonly className: string;
    readonly fieldsByName: Map<string, JavaField> = new Map();
    readonly methodsByName: Map<string, JavaMethod> = new Map();
    readonly superClassName: JavaQualifiedClassName;
    readonly constructorCode: JavaCode; // Code that will be added to the constructor

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
    readonly fields: JavaField[];
    // u2             methods_count;
    // method_info    methods[methods_count];
    readonly methods: JavaMethod[];
    // u2             attributes_count;
    // attribute_info attributes[attributes_count];
    readonly attributes: JavaAttribute[];

    constructor(access_flags: uint16, className: JavaQualifiedClassName, superClass: JavaQualifiedClassName) {
        this.className = className;

        this.minorVersion = JavaClass.minorVersion;
        this.majorVersion = JavaClass.majorVersion;
        this.accessFlags = access_flags;

        this.constantPool = new ConstantPool();
        this.thisClass = this.constantPool.addClassWithName(className);
        this.superClass = this.constantPool.addClassWithName(superClass);
        this.superClassName = superClass;

        this.interfaces = [];
        this.fields = [];
        this.methods = [];
        this.attributes = [];

        this.constructorCode = new JavaCode();
    }

    public addField(accessFlags: uint16, name: string, type: JavaType): JavaField {
        const field = new JavaField(this, accessFlags, name, type);
        this.fields.push(field);
        this.fieldsByName.set(name, field);
        return field;
    }

    public getField(name: string): JavaField {
        const field = this.fieldsByName.get(name);
        if (!field) {
            throw new Error(`Method ${name} not found in class ${this.className}`);
        }
        return field;
    }

    public addMethod(accessFlags: uint16, name: string, signature: JavaMethodSignature): JavaMethod {
        const method = new JavaMethod(this, accessFlags, name, signature);
        this.methods.push(method);
        this.methodsByName.set(name, method);
        return method;
    }

    public getMethod(name: string): JavaMethod {
        const method = this.methodsByName.get(name);
        if (!method) {
            throw new Error(`Method ${name} not found in class ${this.className}`);
        }
        return method;
    }

    public addConstructor(accessFlags: uint16, signature: JavaMethodSignature): JavaMethod {
        if (signature.returns !== JavaType.VOID) {
            throw new Error("Constructor must return void");
        }
        const method = new JavaMethod(this, accessFlags, "<init>", signature, this.constructorCode);
        this.methods.push(method);
        this.methodsByName.set("<init>", method);
        return method;
    }

    public asType(): JavaType {
        return JavaType.forClass(this.className);   
    }

    toBytes(): uint8[] {
        const methods = concatToBytes(this.methods, this.constantPool);
        const fields = concatToBytes(this.fields, this.constantPool);

        return asBytes(this.magic, 4)
            .concat(asBytes(this.minorVersion, 2))
            .concat(asBytes(this.majorVersion, 2))
            .concat(this.constantPool.toBytes())
            .concat(asBytes(this.accessFlags, 2))
            .concat(asBytes(this.thisClass, 2))
            .concat(asBytes(this.superClass, 2))
            .concat(asBytes(this.interfaces.length, 2))
            .concat(asBytes(this.fields.length, 2))
            .concat(fields)
            .concat(asBytes(this.methods.length, 2))
            .concat(methods)
            .concat(asBytes(this.attributes.length, 2));
    }
}