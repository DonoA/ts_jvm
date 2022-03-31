import {JavaClass} from "../../assembler/JavaClass";
import {FileCompileContext} from "./FileCompileContext";
import {ClassMeta} from "../meta/ClassMeta";

export class CompileContext {
    public readonly globalCtx: FileCompileContext;
    private readonly clss: JavaClass;

    constructor(globalCtx: FileCompileContext, clss: JavaClass) {
        this.clss = clss;
        this.globalCtx = globalCtx;
    }

    public getQualifiedNameFor(name: string): string {
        return this.globalCtx.getQualifiedNameFor(name);
    }

    public getClassMeta(name: string): ClassMeta {
        return this.globalCtx.getClassMeta(name);
    }

    public getCurrentClass(): JavaClass {
        return this.clss;
    }
}