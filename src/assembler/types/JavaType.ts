export abstract class JavaType {
    public abstract toTypeRef(): string;
    public abstract getName(): string;

    static join(types: JavaType[]): string {
        return types.map((typ) => typ.toTypeRef() + ";").join("");
    }
}