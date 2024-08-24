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

    constructor(fileName: string) {
        this.fileName = fileName;
        this.loadedClasses = new Map<string, ClassMeta>();
        this.loadedClasses.set(JavaType.OBJECT.name, {
            name: "Object",
            qualifiedName: JavaType.OBJECT,
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

    public addClass(cls: JavaClass) {
        this.allClasses.push(cls);
        this.loadedClasses.set(cls.className, this.toClassMeta(cls));
        this.importedClasses.set(cls.className, cls.className);
    }

    private toClassMeta(cls: JavaClass): ClassMeta {
        const fields: Record<string, FieldMeta> = {};
        cls.fields.forEach((field) => {
            fields[field.name] = {
                name: field.name,
                classes: [field.type],
            };
        });

        const methods: Record<string, {name: string, sig: JavaMethodSignature}> = {};
        cls.methods.forEach((method) => {
            methods[method.name] = {
                name: method.name,
                sig: method.signature,
            };
        });

        return {
            name: cls.className,
            qualifiedName: JavaType.forClass(cls.className),
            fields,
            methods,
        };
    }
}