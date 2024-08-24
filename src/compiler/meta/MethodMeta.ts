import {JavaMethodSignature} from "../../assembler/JavaMethod";

// Meta classes are used to store information about classes, fields, and methods that are not currently being compiled
export interface MethodMeta {
    readonly name: string;
    readonly sig: JavaMethodSignature;
}