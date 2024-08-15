import {CompileContext} from "./CompileContext";
import {FileScope} from "./FileScope";
import {JavaClass} from "../../assembler/JavaClass";
import { MethodCompileContext } from "./MethodCompileContext";
import { JavaMethod, JavaMethodSignature } from "../../assembler/JavaMethod";
import { JavaType } from "../../assembler/JavaType";

export class ClassCompileContext extends CompileContext {
    public readonly clss: JavaClass;

    constructor(globalCtx: FileScope, clss: JavaClass) {
        super(globalCtx);
        this.clss = clss;
    }

    public static createClassContext(globalCtx: FileScope, clss: JavaClass): ClassCompileContext {
        globalCtx.allClasses.push(clss);
        return new ClassCompileContext(globalCtx, clss);
    }

    public static createMainMethod(globalCtx: FileScope): MethodCompileContext {
        const mainClass = new JavaClass(JavaClass.ACCESS.PUBLIC, `${globalCtx.getFileClassName()}Main`, "java/lang/Object");

        const signature = new JavaMethodSignature([JavaType.STRING_ARR], JavaType.VOID);
        const mainMethod = new JavaMethod(JavaMethod.ACCESS.PUBLIC, 'main', signature);
        mainClass.addMethod(mainMethod);

        globalCtx.allClasses.push(mainClass);
        return new MethodCompileContext(globalCtx, mainClass, mainMethod);
    }

    public static assertType(context: CompileContext): ClassCompileContext {
        if (context instanceof ClassCompileContext) {
            return context;
        }

        throw new Error(`Expected instance of ClassCompileContext`);
    }
}