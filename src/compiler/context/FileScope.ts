import {JavaClass} from "../../assembler/JavaClass";
import {JavaType} from "../../assembler/JavaType";
import {JavaMethod, JavaMethodSignature} from "../../assembler/JavaMethod";
import {CompileContext} from "./CompileContext";
import {ClassMeta} from "../meta/ClassMeta";
import { ClassCompileContext } from "./ClassCompileContext";
import { MethodCompileContext } from "./MethodCompileContext";

export class FileScope {
    private readonly importedClasses: Map<string, string>;
    private readonly loadedClasses: Map<string, ClassMeta>;
    public readonly allClasses: JavaClass[];
    private readonly fileName: string;

    constructor(fileName: string) {
        this.fileName = fileName;
        this.loadedClasses = new Map<string, ClassMeta>();
        this.loadedClasses.set("java/lang/Object", {
            name: "Object",
            qualifiedName: JavaType.forClass("java/lang/Object"),
            fields: {},
            methods: {}
        });
        this.loadedClasses.set("me/doallen/tsjvm/Console", {
            name: "Console",
            qualifiedName: JavaType.forClass("me/doallen/tsjvm/Console"),
            fields: {},
            methods: {
                "log": {
                    name: "log",
                    sig: new JavaMethodSignature([
                        JavaType.forClass("java/lang/String"),
                    ], JavaType.VOID),
                }
            },
        });

        this.importedClasses = new Map<string, string>();
        this.importedClasses.set("Object", "java/lang/Object");
        this.importedClasses.set("console", "me/doallen/tsjvm/Console");

        this.allClasses = [];
    }

    public getQualifiedNameFor(name: string): string {
        const qualifiedName = this.importedClasses.get(name);
        if (qualifiedName) {
            return qualifiedName;
        }
        throw new Error(`Undefined type ${name}`);
    }

    public getClassMeta(name: string): ClassMeta {
        const meta = this.loadedClasses.get(name);
        if (meta) {
            return meta;
        }
        throw new Error(`Unloaded type ${name}`);
    }

    public getFileClassName(): string {
        const file = this.fileName.replace(".ts", "");
        return file[0].toUpperCase() + file.slice(1);
    }
}