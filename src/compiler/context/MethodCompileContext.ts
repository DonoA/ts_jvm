import {CompileContext} from "./CompileContext";
import {JavaMethod} from "../../assembler/JavaMethod";
import {Lazy} from "../../util/Lazy";
import {JavaCodeBlock} from "../JavaCodeBlock";
import {FileScope} from "./FileScope";
import {JavaClass} from "../../assembler/JavaClass";
import { ClassCompileContext } from "./ClassCompileContext";

export class MethodCompileContext extends ClassCompileContext {
    private readonly method: JavaMethod;
    private code: Lazy<JavaCodeBlock>;

    constructor(globalCtx: FileScope, clss: JavaClass, method: JavaMethod) {
        super(globalCtx, clss);
        this.method = method;
        this.code = new Lazy(() => new JavaCodeBlock(this.method,
            clss.constantPool));
    }

    public static createMethodContext(compileContext: ClassCompileContext, method: JavaMethod): MethodCompileContext {
        compileContext.clss.addMethod(method);
        return new MethodCompileContext(compileContext.fileContext, compileContext.clss, method);
    }

    public getCode(): JavaCodeBlock {
        return this.code.get();
    }

    public static assertType(context: CompileContext): MethodCompileContext {
        if (context instanceof MethodCompileContext) {
            return context;
        }

        throw new Error(`Expected instance of MethodCompileContext`);
    }
}