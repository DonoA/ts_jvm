import {compileFile} from "./compile";

const infile = "tests/inputs/helloWorld.ts"
const outfolder = "tests/outputs";

compileFile(infile, outfolder);

