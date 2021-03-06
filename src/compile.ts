import fs from "fs";
import {parse} from "@typescript-eslint/typescript-estree";
import {assemble} from "./assembler/assembler";
import {compile} from "./compiler/compiler";

export function compileFile(infile: string, outfolder: string) {

    const code = fs.readFileSync(infile, "utf-8");

    try {
        const ast = parse(code);

        fs.writeFileSync(`${outfolder}/ast.json`, JSON.stringify(ast));

        const classes = compile(ast);
        classes.forEach((clss) => {
            assemble(outfolder, clss);
        })

    } catch(e) {
        console.error("Failed to compile file", e);
    }
}