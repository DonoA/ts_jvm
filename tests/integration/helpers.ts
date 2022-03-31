import { exec } from "child_process";
import fs from "fs";
import {compileFile} from "../../src/compile";

export interface JavaOutput {
    output: string;
    returnCode: number;
}

export function getJavaOutput(workingDir: string, className: string): Promise<JavaOutput> {
    return new Promise<JavaOutput>((res, rej) => {
        exec(`/usr/bin/java ${className}`, {
            cwd: workingDir
        }, (error, stdout, stderr) => {
            res({
                output: stdout,
                returnCode: error?.code ?? 0
            });
        });
    })
}

export async function compileAndRun(dir: string, infile: string, infileClass: string):
        Promise<JavaOutput> {
    const outfolder = `${dir}/out`;
    if (!fs.existsSync(outfolder)){
        fs.mkdirSync(outfolder, { recursive: true });
    }
    compileFile(`${dir}/resources/${infile}`, outfolder);
    return await getJavaOutput(outfolder, infileClass);

}