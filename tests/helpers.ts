import { exec } from "child_process";
import fs from "fs";
import path from "path";
import {compileFile} from "../src/compile";

export interface JavaOutput {
    output: string;
    returnCode: number;
}

export function getJavaOutput(rootDir: string, workingDir: string, className: string): Promise<JavaOutput> {
    return new Promise<JavaOutput>((res, rej) => {
        exec(`/usr/bin/java -cp TsJvm-1.0-SNAPSHOT.jar:${workingDir} ${className}`, {
            cwd: rootDir
        }, (error, stdout, stderr) => {
            if (stderr) {
                console.error(stderr);
            }
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
    const projectRoot = path.resolve(`${dir}/../../`);
    if (!fs.existsSync(outfolder)){
        fs.mkdirSync(outfolder, { recursive: true });
    }
    compileFile(`${dir}/resources/${infile}`, outfolder);
    return await getJavaOutput(projectRoot, outfolder, infileClass);

}