import {JavaType} from "./JavaType";

export class SimpleType implements JavaType {
    public static readonly VOID: SimpleType = new SimpleType("Void");

    private readonly name: string;

    constructor(name: string) {
        this.name = name;
    }

    public toTypeRef(): string {
        return this.name[0];
    }

    public getName(): string {
        return this.name;
    }
}