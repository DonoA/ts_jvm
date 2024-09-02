import {JavaMethod, JavaMethodSignature} from "../../assembler/JavaMethod";

// Meta classes are used to store information about classes, fields, and methods that are not currently being compiled
export interface MethodMeta {
    readonly name: string;
    readonly sig: JavaMethodSignature;
}

export class MethodMeta {
    public static fromJavaMethod(method: JavaMethod): MethodMeta {
        return {
            name: method.name,
            sig: method.signature,
        };
    }
}