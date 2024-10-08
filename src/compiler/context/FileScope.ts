import {JavaClass} from "../../assembler/JavaClass";
import {JavaQualifiedClassName, JavaSimpleClassName, JavaType} from "../../assembler/JavaType";
import {JavaMethodSignature} from "../../assembler/JavaMethod";
import {ClassMeta} from "../meta/ClassMeta";
import { FieldMeta } from "../meta/FieldMeta";

export class FileScope {
    private readonly importedClasses: Map<JavaSimpleClassName, JavaQualifiedClassName>;
    private readonly loadedClasses: Map<JavaQualifiedClassName, ClassMeta>;
    public readonly allClasses: JavaClass[];
    private readonly fileName: string;

    constructor(fileName: string, classes: JavaClass[] = []) {
        this.fileName = fileName;
        this.loadedClasses = new Map<string, ClassMeta>();
        this.loadedClasses.set(JavaType.OBJECT.name, {
            name: "Object",
            type: JavaType.OBJECT,
            fields: {},
            methods: {}
        });
        this.loadedClasses.set("me/doallen/tsjvm/Console", {
            name: "Console",
            type: JavaType.forClass("me/doallen/tsjvm/Console"),
            fields: {},
            methods: {
                "log": {
                    name: "log",
                    sig: JavaMethodSignature.fromTypes([
                        JavaType.STRING,
                    ], JavaType.VOID),
                }
            },
        });

        this.importedClasses = new Map<string, string>();
        this.importedClasses.set("Object", JavaType.OBJECT.name);
        this.importedClasses.set("console", "me/doallen/tsjvm/Console");

        this.allClasses = [];
        classes.forEach((cls) => {
            this.addClass(cls);
        });
    }

    public getQualifiedNameFor(name: JavaSimpleClassName): JavaQualifiedClassName {
        const qualifiedName = this.importedClasses.get(name);
        if (qualifiedName) {
            return qualifiedName;
        }
        throw new Error(`Undefined type ${name}`);
    }

    public getClassMeta(name: JavaQualifiedClassName): ClassMeta {
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

    public getMainClassName(): string {
        return this.getFileClassName() + "Main";
    }

    public addClass(cls: JavaClass) {
        this.allClasses.push(cls);
        this.loadedClasses.set(cls.className, ClassMeta.fromJavaClass(cls));
        this.importedClasses.set(cls.className, cls.className);
    }

    public getClass(name: JavaSimpleClassName): JavaClass | undefined {
        const qualifiedName = this.importedClasses.get(name);
        return this.allClasses.find((cls) => cls.className === qualifiedName);
    }
}