import { ConstantPool } from "../ConstantPool";
import { asBytes, ToBytes, uint8 } from "../utils";

type ToBytesInterface = (pool: ConstantPool) => number;
export class ByteProvider implements ToBytes {
    readonly exactValue: number | null;
    readonly provider: ToBytesInterface | null;
    readonly byteCount: number;

    private constructor(value: number | null, provider: ToBytesInterface | null, byteCount: number) {
        this.exactValue = value;
        this.provider = provider;
        this.byteCount = byteCount;
    }

    static fromProvider(provider: ToBytesInterface, byteCount: number): ByteProvider {
        return new ByteProvider(null, provider, byteCount);
    }

    static fromValue(value: number, byteCount: number): ByteProvider {
        return new ByteProvider(value, null, byteCount);
    }

    toBytes(pool: ConstantPool): uint8[] {
        let result;
        if (this.exactValue !== null) {
            result = this.exactValue;
        } else if (this.provider !== null) {
            result = this.provider(pool);
        } else {
            throw new Error("Invalid state");
        }

        return asBytes(result, this.byteCount);
    }
}