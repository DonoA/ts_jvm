import {CompileContext} from "./CompileContext";
import {JavaMethod, JavaMethodSignature} from "../../assembler/JavaMethod";
import {JavaCodeBlock} from "../../assembler/JavaCodeBlock";
import {FileScope} from "./FileScope";
import {JavaClass} from "../../assembler/JavaClass";
import { ClassCompileContext } from "./ClassCompileContext";
import { uint16 } from "../../assembler/utils";

export class MethodCompileContext extends ClassCompileContext {
    private readonly method: JavaMethod;

    constructor(globalCtx: FileScope, clss: JavaClass, method: JavaMethod) {
        super(globalCtx, clss);
        this.method = method;
    }

    public static createMethodContext(compileContext: ClassCompileContext, accessFlags: uint16, name: string, signature: JavaMethodSignature): MethodCompileContext {
        const method = compileContext.clss.addMethod(accessFlags, name, signature);
        return new MethodCompileContext(compileContext.fileContext, compileContext.clss, method);
    }

    public getCode(): JavaCodeBlock {
        return this.method.code;
    }

    public static assertType(context: CompileContext): MethodCompileContext {
        if (context instanceof MethodCompileContext) {
            return context;
        }

        throw new Error(`Expected instance of MethodCompileContext`);
    }
}