export type uint8 = number;
export type uint16 = number;
export type uint32 = number;

export interface ToBytes {
    toBytes(): uint8[];
}

export function toBytes(num: number, byteCount: number): uint8[] {
    const data = []
    for (let i = byteCount - 1; i >= 0; i--) {
        const byte = ((0xff << i*8) & num) >>> (i*8);
        data.push(byte);
    }
    return data;
}

export function concatToBytes<T>(data: ToBytes[]): uint8[] {
    return data.reduce<uint8[]>((byteArray, val): uint8[] => {
        return byteArray.concat(val.toBytes());
    }, []);
}