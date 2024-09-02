import { JavaField } from "../../assembler/JavaField";
import {JavaType} from "../../assembler/JavaType";

// Meta classes are used to store information about classes, fields, and methods that are not currently being compiled
export interface FieldMeta {
    readonly name: string;
    readonly clss: JavaType; // The type of the field
    readonly parent: JavaType; // The containing class
}

export class FieldMeta {
    public static fromJavaField(field: JavaField): FieldMeta {
        return {
            name: field.name,
            clss: field.type,
            parent: field.clss.asType(),
        };
    }
}