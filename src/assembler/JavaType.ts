export class JavaType {
    static readonly VOID: JavaType = JavaType.forPrimitive("Void");
    static readonly STRING: JavaType = JavaType.forClass("java/lang/String");
    static readonly STRING_ARR: JavaType = JavaType.forClass("java/lang/String", 1);
    static readonly OBJECT: JavaType = JavaType.forClass("java/lang/Object");

    readonly name: string;
    private readonly primitive: boolean;

    private arrayCount: number;

    private constructor(name: string, arrayCount: number, primitive: boolean) {
        this.name = name;
        this.arrayCount = arrayCount;
        this.primitive = primitive;
    }

    public addArrayCount(): JavaType {
        this.arrayCount++;
        return this;
    }

    public toTypeRef(): string {
        let arrayPrefix = "";
        for (let i = 0; i < this.arrayCount; i++) {
            arrayPrefix += "[";
        }

        if (this.primitive) {
            return arrayPrefix + this.name[0];
        } else {
            return arrayPrefix + "L" + this.name;
        }
    }

    public static join(types: JavaType[]): string {
        return types.map((typ) => typ.toTypeRef() + ";").join("");
    }

    public static forClass(name: string, arrayCount?: number): JavaType {
        return new JavaType(name, arrayCount ?? 0, false);
    }

    public static forPrimitive(name: string, arrayCount?: number): JavaType {
        return new JavaType(name, arrayCount ?? 0, true);
    }
}