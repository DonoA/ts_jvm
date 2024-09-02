import {CompileContext} from "./CompileContext";
import {JavaMethod, JavaMethodSignature} from "../../assembler/JavaMethod";
import {JavaCode} from "../../assembler/JavaCode";
import {FileScope} from "./FileScope";
import {JavaClass} from "../../assembler/JavaClass";
import { ClassCompileContext } from "./ClassCompileContext";
import { uint16 } from "../../assembler/utils";

export class MethodCompileContext extends ClassCompileContext {
    public readonly code: JavaCode;
    public readonly assignmentLHS: boolean;

    constructor(globalCtx: FileScope, clss: JavaClass, code: JavaCode, assignmentLHS: boolean = false) {
        super(globalCtx, clss);
        this.code = code;
        this.assignmentLHS = assignmentLHS;
    }

    public static forAssignmentLHS(context: MethodCompileContext, assignmentLHS: boolean = true): MethodCompileContext {
        return new MethodCompileContext(context.fileContext, context.clss, context.code, assignmentLHS);
    }

    public static forJavaCode(context: ClassCompileContext, code: JavaCode): MethodCompileContext {
        return new MethodCompileContext(context.fileContext, context.clss, code);
    }

    public getCode(): JavaCode {
        return this.code;
    }

    public static assertType(context: CompileContext): MethodCompileContext {
        if (context instanceof MethodCompileContext) {
            return context;
        }

        throw new Error(`Expected instance of MethodCompileContext`);
    }
}