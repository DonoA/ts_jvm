import {JavaClass} from "../../assembler/JavaClass";
import {FileScope} from "./FileScope";
import {ClassMeta} from "../meta/ClassMeta";
import { MethodCompileContext } from "./MethodCompileContext";
import { JavaMethod } from "../../assembler/JavaMethod";

export abstract class CompileContext {
    public readonly fileContext: FileScope;

    constructor(globalCtx: FileScope) {
        this.fileContext = globalCtx;
    }

    public getQualifiedNameFor(name: string): string {
        return this.fileContext.getQualifiedNameFor(name);
    }

    public getClassMeta(name: string): ClassMeta {
        return this.fileContext.getClassMeta(name);
    }
}