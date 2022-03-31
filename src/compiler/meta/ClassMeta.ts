import {JavaType} from "../../assembler/JavaType";
import {FieldMeta} from "./FieldMeta";
import {MethodMeta} from "./MethodMeta";

export interface ClassMeta {
    readonly name: string;
    readonly qualifiedName: JavaType;
    readonly fields: Record<string, FieldMeta>;
    readonly methods: Record<string, MethodMeta>;
}