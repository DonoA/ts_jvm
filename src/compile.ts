import fs from "fs";
import path from "path";
import {parse} from "@typescript-eslint/typescript-estree";
import {assemble} from "./assembler/assembler";
import {compileSource} from "./compiler/SourceCompiler";
import {compileStructure} from "./compiler/StructureCompiler";
import { NodeWithType } from "./compiler/AssertNodeType";

export function compileFile(infile: string, outfolder: string) {
    const fileName = path.basename(infile);
    const code = fs.readFileSync(infile, "utf-8");

    try {
        const ast = parse(code, {loc: true, range: true});

        fs.writeFileSync(`${outfolder}/ast.json`, JSON.stringify(ast, null, 2));

        const structureResult = compileStructure(ast, fileName);
        if (structureResult.error && structureResult.errorNode) {
            printError(code, structureResult.errorNode, structureResult.error);
            return;
        }
        const classes = structureResult.classes;
        const sourceResult = compileSource(ast, classes, fileName);
        if (sourceResult.error && sourceResult.errorNode) {
            printError(code, sourceResult.errorNode, sourceResult.error);
            return;
        }
        classes.forEach((clss) => {
            assemble(outfolder, clss);
        })

    } catch(e) {
        console.error("Failed to compile file", e);
    }
}

function printError(source: string, node: NodeWithType, error: Error) {
    console.error(`Error at line ${node.loc.start.line} col ${node.loc.start.column}: ${error.message}`);
    const snippet = source.substring(node.range[0], node.range[1]);
    console.error(snippet);
    console.error(error);
}