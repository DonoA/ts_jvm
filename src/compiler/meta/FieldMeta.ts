import {JavaType} from "../../assembler/JavaType";

export interface FieldMeta {
    readonly name: string;
    readonly classes: JavaType[];
}