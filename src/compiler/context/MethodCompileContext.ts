import {CompileContext} from "./CompileContext";
import {JavaMethod} from "../../assembler/JavaMethod";
import {Lazy} from "../../util/Lazy";
import {JavaCodeBlock} from "../JavaCodeBlock";
import {FileCompileContext} from "./FileCompileContext";
import {JavaClass} from "../../assembler/JavaClass";

export class MethodCompileContext extends CompileContext {
    private readonly method: JavaMethod;
    private code: Lazy<JavaCodeBlock>;

    constructor(globalCtx: FileCompileContext, clss: JavaClass, method: JavaMethod) {
        super(globalCtx, clss);
        this.method = method;
        this.code = new Lazy(() => new JavaCodeBlock(this.method,
            clss.constantPool));
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