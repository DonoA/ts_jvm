import {ToBytes, uint8} from "../utils";

export abstract class JavaAttribute implements ToBytes {
    public abstract toBytes(): uint8[];
}