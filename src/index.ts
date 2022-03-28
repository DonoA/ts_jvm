import { parse } from '@typescript-eslint/typescript-estree';
import * as fs from "fs";
import { assemble } from "./assembler/assembler";
import {compile} from "./compiler/compiler";

const infile = "tests/inputs/test.ts"
const outfolder = "tests/outputs";

const code = fs.readFileSync(infile, "utf-8");

try {
    // const ast = parse(code, {
    //     loc: true,
    //     range: true,
    // });

    const ast = parse(code);

    fs.writeFileSync(`${outfolder}/ast.json`, JSON.stringify(ast));

    const classes = compile(ast);
    classes.forEach((clss) => {
        assemble(outfolder, clss);
    })

} catch(e) {
    console.error("Failed to compile file", e);
}

