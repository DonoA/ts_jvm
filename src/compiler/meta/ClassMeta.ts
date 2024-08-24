import {JavaType} from "../../assembler/JavaType";
import {FieldMeta} from "./FieldMeta";
import {MethodMeta} from "./MethodMeta";

// Meta classes are used to store information about classes, fields, and methods that are not currently being compiled
export interface ClassMeta {
    readonly name: string;
    readonly qualifiedName: JavaType;
    readonly fields: Record<string, FieldMeta>;
    readonly methods: Record<string, MethodMeta>;
}