import { JavaCompiledClassName, JavaQualifiedClassName } from "./JavaType";
import {ToBytes, uint16, uint8, toBytes} from "./utils";

export interface ConstantPoolInfo {
    tag: uint8;
    data: uint8[];
}

export class ConstantPool implements ToBytes {
    private pool: ConstantPoolInfo[];

    constructor() {
        this.pool = [];
    }

    public addClassWithName(name: JavaQualifiedClassName): uint16 {
        const nameHandle = this.addUTF8(name);
        return this.addClass(nameHandle);
    }

    public addClass(handle: uint16): uint16 {
        this.pool.push({
            tag: 7,
            data: toBytes(handle, 2)
        });
        return this.pool.length;
    }

    public addUTF8(str: string): uint16 {
        const data = toBytes(str.length, 2)
        Buffer.from(str, "utf-8").forEach((value) => {
            data.push(value);
        })
        this.pool.push({
            tag: 1,
            data
        });
        return this.pool.length;
    }

    public addStringWithValue(value: string): uint16 {
        const valueHandle = this.addUTF8(value);
        return this.addString(valueHandle);
    }

    public addString(handle: uint16): uint16 {
        this.pool.push({
            tag: 8,
            data: toBytes(handle, 2)
        });
        return this.pool.length;
    }

    public addNameAndType(nameHandle: uint16, descHandle: uint16): uint16 {
        this.pool.push({
            tag: 12,
            data: toBytes(nameHandle, 2).concat(toBytes(descHandle, 2))
        });
        return this.pool.length;
    }

    public addFieldRef(classHandle: uint16, nameAndTypeHandle: uint16): uint16 {
        this.pool.push({
            tag: 9,
            data: toBytes(classHandle, 2).concat(toBytes(nameAndTypeHandle, 2))
        });
        return this.pool.length;
    }

    public addFieldRefWithName(className: JavaQualifiedClassName, fieldName: string, fieldType: JavaCompiledClassName): uint16 {
        const classHandle = this.addClassWithName(className);
        const fieldHandle = this.addUTF8(fieldName);
        const fieldTypeHandle = this.addUTF8(fieldType);
        const nameAndTypeHandle = this.addNameAndType(fieldHandle, fieldTypeHandle);
        return this.addFieldRef(classHandle, nameAndTypeHandle);
    }

    public addMethodRef(classHandle: uint16, nameAndTypeHandle: uint16): uint16 {
        this.pool.push({
            tag: 10,
            data: toBytes(classHandle, 2).concat(toBytes(nameAndTypeHandle, 2))
        });
        return this.pool.length;
    }

    public addMethodRefWithName(className: string, methodName: string, methodType: string): uint16 {
        const classHandle = this.addClassWithName(className);
        const methodHandle = this.addUTF8(methodName);
        const methodTypeHandle = this.addUTF8(methodType);
        const nameAndTypeHandle = this.addNameAndType(methodHandle, methodTypeHandle);
        return this.addMethodRef(classHandle, nameAndTypeHandle);
    }

    public toBytes(): uint8[] {
        let bytes = toBytes(this.pool.length + 1, 2);
        this.pool.forEach((entry) => {
            bytes.push(entry.tag)
            bytes = bytes.concat(entry.data);
        })
        return bytes;
    }

}