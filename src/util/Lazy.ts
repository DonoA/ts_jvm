export class Lazy<T> {
    private readonly provider: () => T;
    private value: T | null;

    constructor(provider: () => T) {
        this.provider = provider;
        this.value = null;
    }

    public get(): T {
        if (!this.value) {
            this.value = this.provider();
        }

        return this.value;
    }

    public present(): boolean {
        return this.value !== null;
    }
}