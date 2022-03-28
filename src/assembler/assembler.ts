import * as fs from "fs";
import {JavaClass} from "./JavaClass";

export function assemble(outfolder: string, clss: JavaClass) {
    const outfile = `${outfolder}/${clss.className}.class`;
    fs.writeFileSync(outfile, Buffer.from(clss.toBytes()));
    console.log("Wrote class to", outfile);
}