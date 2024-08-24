import {FileScope} from "./FileScope";
import {ClassMeta} from "../meta/ClassMeta";
import { JavaQualifiedClassName, JavaSimpleClassName } from "../../assembler/JavaType";

export abstract class CompileContext {
    public readonly fileContext: FileScope;

    constructor(globalCtx: FileScope) {
        this.fileContext = globalCtx;
    }

    public getQualifiedNameFor(name: JavaSimpleClassName): JavaQualifiedClassName {
        return this.fileContext.getQualifiedNameFor(name);
    }

    public getClassMeta(name: JavaQualifiedClassName): ClassMeta {
        return this.fileContext.getClassMeta(name);
    }
}