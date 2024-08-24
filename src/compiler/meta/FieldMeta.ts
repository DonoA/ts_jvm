import {JavaType} from "../../assembler/JavaType";

// Meta classes are used to store information about classes, fields, and methods that are not currently being compiled
export interface FieldMeta {
    readonly name: string;
    readonly classes: JavaType[];
}