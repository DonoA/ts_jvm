import fs from "fs";
import path from "path";
import {parse} from "@typescript-eslint/typescript-estree";
import {assemble} from "./assembler/assembler";
import {compile} from "./compiler/Compiler";

export function compileFile(infile: string, outfolder: string) {
    const fileName = path.basename(infile);
    const code = fs.readFileSync(infile, "utf-8");

    try {
        const ast = parse(code);

        fs.writeFileSync(`${outfolder}/ast.json`, JSON.stringify(ast, null, 2));

        const classes = compile(ast, fileName);
        classes.forEach((clss) => {
            assemble(outfolder, clss);
        })

    } catch(e) {
        console.error("Failed to compile file", e);
    }
}