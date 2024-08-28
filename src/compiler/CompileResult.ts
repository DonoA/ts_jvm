import { JavaField } from "../assembler/JavaField";
import { JavaType } from "../assembler/JavaType";

export class CompileResult {
    private readonly type?: JavaType;
    private readonly value?: string;
    private readonly field?: JavaField;

    static ofType(type: JavaType): CompileResult {
        return new CompileResult(type);
    }

    static ofValue(value: string): CompileResult {
        return new CompileResult(undefined, value);
    }

    static ofField(field: JavaField): CompileResult {
        return new CompileResult(field.type, undefined, field);
    }

    static empty(): CompileResult {
        return new CompileResult();
    }

    private constructor(type?: JavaType, value?: string, field?: JavaField) {
        this.type = type;
        this.value = value;
        this.field = field;
    }

    public hasType(): boolean {
        return this.type !== undefined;
    }

    public getType(): JavaType {
        if (!this.type) {
            throw new Error(`No type available`);
        }
        return this.type;
    }

    public hasValue(): boolean {
        return this.value !== undefined;
    }

    public getValue(): string {
        if (!this.value) {
            throw new Error(`No value available`);
        }
        return this.value;
    }

    public hasField(): boolean {
        return this.field !== undefined;
    }

    public getField(): JavaField {
        if (!this.field) {
            throw new Error(`No field available`);
        }
        return this.field;
    }
}