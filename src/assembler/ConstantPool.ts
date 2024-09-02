import { JavaCompiledClassName, JavaQualifiedClassName } from "./JavaType";
import {ToBytes, uint16, uint8, asBytes} from "./utils";

export interface ConstantPoolInfo {
    tag: uint8;
    data: uint8[];
}

type ConstantType = "utf8" | "class" | "string" | "nameAndType" | "fieldRef" | "methodRef";
class PoolCacheKey {
    readonly type: ConstantType;
    readonly value: string;

    constructor(type: ConstantType, value: string) {
        this.type = type;
        this.value = value;
    }

    public toKey(): string {
        return `${this.type}:${this.value}`;
    }

    static fromString(type: ConstantType, str: string): PoolCacheKey {
        return new PoolCacheKey(type, str);
    }

    static fromHandle(type: ConstantType, handle: uint16): PoolCacheKey {
        return new PoolCacheKey(type, handle.toString());
    }

    static fromHandles(type: ConstantType, handle1: uint16, handle2: uint16): PoolCacheKey {
        return new PoolCacheKey(type, `${handle1}-${handle2}`);
    }
}

export class ConstantPool implements ToBytes {
    private pool: ConstantPoolInfo[];
    private poolCache: Map<string, uint16> = new Map();

    constructor() {
        this.pool = [];
    }

    public addClassWithName(name: JavaQualifiedClassName): uint16 {
        const nameHandle = this.addUTF8(name);
        return this.addClass(nameHandle);
    }

    public addClass(handle: uint16): uint16 {
        const poolKey = PoolCacheKey.fromHandle("class", handle).toKey();
        if (this.poolCache.has(poolKey)) {
            return this.poolCache.get(poolKey)!;
        }

        this.pool.push({
            tag: 7,
            data: asBytes(handle, 2)
        });
        const classHandle = this.pool.length;
        this.poolCache.set(poolKey, classHandle);
        return classHandle;
    }

    public addUTF8(str: string): uint16 {
        const poolKey = PoolCacheKey.fromString("utf8", str).toKey();
        if (this.poolCache.has(poolKey)) {
            return this.poolCache.get(poolKey)!;
        }

        const data = asBytes(str.length, 2)
        Buffer.from(str, "utf-8").forEach((value) => {
            data.push(value);
        })
        this.pool.push({
            tag: 1,
            data
        });
        const handle = this.pool.length;
        this.poolCache.set(poolKey, handle);
        return handle;
    }

    public addStringWithValue(value: string): uint16 {
        const valueHandle = this.addUTF8(value);
        return this.addString(valueHandle);
    }

    public addString(handle: uint16): uint16 {
        const poolKey = PoolCacheKey.fromHandle("string", handle).toKey();
        if (this.poolCache.has(poolKey)) {
            return this.poolCache.get(poolKey)!;
        }

        this.pool.push({
            tag: 8,
            data: asBytes(handle, 2)
        });
        const stringHandle = this.pool.length;
        this.poolCache.set(poolKey, stringHandle);
        return stringHandle;
    }

    public addNameAndType(nameHandle: uint16, descHandle: uint16): uint16 {
        const poolKey = PoolCacheKey.fromHandles("nameAndType", nameHandle, descHandle).toKey();
        if (this.poolCache.has(poolKey)) {
            return this.poolCache.get(poolKey)!;
        }

        this.pool.push({
            tag: 12,
            data: asBytes(nameHandle, 2).concat(asBytes(descHandle, 2))
        });
        const nameAndTypeHandle = this.pool.length;
        this.poolCache.set(poolKey, nameAndTypeHandle);
        return nameAndTypeHandle;
    }

    public addFieldRef(classHandle: uint16, nameAndTypeHandle: uint16): uint16 {
        const poolKey = PoolCacheKey.fromHandles("fieldRef", classHandle, nameAndTypeHandle).toKey();
        if (this.poolCache.has(poolKey)) {
            return this.poolCache.get(poolKey)!;
        }

        this.pool.push({
            tag: 9,
            data: asBytes(classHandle, 2).concat(asBytes(nameAndTypeHandle, 2))
        });
        const fieldRefHandle = this.pool.length;
        this.poolCache.set(poolKey, fieldRefHandle);
        return fieldRefHandle;
    }

    public addFieldRefWithName(className: JavaQualifiedClassName, fieldName: string, fieldType: JavaCompiledClassName): uint16 {
        const classHandle = this.addClassWithName(className);
        const fieldHandle = this.addUTF8(fieldName);
        const fieldTypeHandle = this.addUTF8(fieldType);
        const nameAndTypeHandle = this.addNameAndType(fieldHandle, fieldTypeHandle);
        return this.addFieldRef(classHandle, nameAndTypeHandle);
    }

    public addMethodRef(classHandle: uint16, nameAndTypeHandle: uint16): uint16 {
        const poolKey = PoolCacheKey.fromHandles("methodRef", classHandle, nameAndTypeHandle).toKey();
        if (this.poolCache.has(poolKey)) {
            return this.poolCache.get(poolKey)!;
        } 

        this.pool.push({
            tag: 10,
            data: asBytes(classHandle, 2).concat(asBytes(nameAndTypeHandle, 2))
        });
        const methodRefHandle = this.pool.length;
        this.poolCache.set(poolKey, methodRefHandle);
        return methodRefHandle;
    }

    public addMethodRefWithName(className: string, methodName: string, methodType: string): uint16 {
        const classHandle = this.addClassWithName(className);
        const methodHandle = this.addUTF8(methodName);
        const methodTypeHandle = this.addUTF8(methodType);
        const nameAndTypeHandle = this.addNameAndType(methodHandle, methodTypeHandle);
        return this.addMethodRef(classHandle, nameAndTypeHandle);
    }

    public toBytes(): uint8[] {
        let bytes = asBytes(this.pool.length + 1, 2);
        this.pool.forEach((entry) => {
            bytes.push(entry.tag)
            bytes = bytes.concat(entry.data);
        })
        return bytes;
    }

}