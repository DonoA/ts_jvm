import {JavaType} from "./JavaType";

export class ClassNameType implements JavaType {
    private readonly name: string;
    private readonly isArray: boolean;

    constructor(name: string, isArray?: boolean) {
        this.name = name;
        this.isArray = isArray ?? false;
    }

    public toTypeRef(): string {
        return (this.isArray ? "[" : "") + "L" + this.name;
    }

    public getName(): string {
        return this.name;
    }
}