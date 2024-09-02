import { JavaClass } from "../../assembler/JavaClass";
import { JavaMethodSignature } from "../../assembler/JavaMethod";
import {JavaType} from "../../assembler/JavaType";
import {FieldMeta} from "./FieldMeta";
import {MethodMeta} from "./MethodMeta";

// Meta classes are used to store information about classes, fields, and methods that are not currently being compiled
export interface ClassMeta {
    readonly name: string;
    readonly type: JavaType;
    readonly fields: Record<string, FieldMeta>;
    readonly methods: Record<string, MethodMeta>;
}

export class ClassMeta {
    public static fromJavaClass(cls: JavaClass): ClassMeta {
        const fields: Record<string, FieldMeta> = {};
        cls.fields.forEach((field) => {
            fields[field.name] = FieldMeta.fromJavaField(field);
        });

        const methods: Record<string, {name: string, sig: JavaMethodSignature}> = {};
        cls.methods.forEach((method) => {
            methods[method.name] = MethodMeta.fromJavaMethod(method);
        });

        return {
            name: cls.className,
            type: JavaType.forClass(cls.className),
            fields,
            methods,
        };
    }
}