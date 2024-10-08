import {CompileContext} from "./CompileContext";
import {FileScope} from "./FileScope";
import {JavaClass} from "../../assembler/JavaClass";
import { MethodCompileContext } from "./MethodCompileContext";
import { JavaMethod, JavaMethodSignature } from "../../assembler/JavaMethod";
import { JavaSimpleClassName, JavaType } from "../../assembler/JavaType";
import { JavaCode } from "../../assembler/JavaCode";

export class ClassCompileContext extends CompileContext {
    public readonly clss: JavaClass;
    public readonly ctrSuper: JavaCode;
    public readonly ctrFieldInit: JavaCode;

    constructor(globalCtx: FileScope, clss: JavaClass) {
        super(globalCtx);
        this.clss = clss;

        this.ctrSuper = new JavaCode();
        this.ctrSuper.aloadInstr(0);
        this.ctrSuper.invokespecialInstr(clss.superClassName, "<init>", JavaMethodSignature.fromTypes([], JavaType.VOID));

        this.ctrFieldInit = new JavaCode();
    }

    public static createClassContext(globalCtx: FileScope, clss: JavaClass): ClassCompileContext {
        return new ClassCompileContext(globalCtx, clss);
    }

    public static loadClassContext(globalCtx: FileScope, name: JavaSimpleClassName): ClassCompileContext {
        const clss = globalCtx.getClass(name)!;
        return new ClassCompileContext(globalCtx, clss);
    }

    public static loadMainMethod(globalCtx: FileScope): MethodCompileContext {
        const cls = globalCtx.getClass(globalCtx.getMainClassName())!;
        const mainMethod = cls.getMethod('main');
        return new MethodCompileContext(globalCtx, cls, mainMethod.code);
    }

    public static createMainMethod(globalCtx: FileScope): MethodCompileContext {
        const mainClass = new JavaClass(JavaClass.ACCESS.PUBLIC, globalCtx.getMainClassName(), JavaType.OBJECT.name);

        const signature = JavaMethodSignature.MAIN;
        const mainMethod = mainClass.addMethod(JavaMethod.ACCESS.PUBLIC | JavaMethod.ACCESS.STATIC, 'main', signature);

        globalCtx.allClasses.push(mainClass);
        return new MethodCompileContext(globalCtx, mainClass, mainMethod.code);
    }

    public static assertType(context: CompileContext): ClassCompileContext {
        if (context instanceof ClassCompileContext) {
            return context;
        }

        throw new Error(`Expected instance of ClassCompileContext`);
    }
}