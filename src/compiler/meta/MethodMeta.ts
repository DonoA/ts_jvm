import {JavaMethodSignature} from "../../assembler/JavaMethod";

export interface MethodMeta {
    readonly name: string;
    readonly sig: JavaMethodSignature;
}