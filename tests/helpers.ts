import { exec } from "child_process";
import fs from "fs";
import path from "path";
import {compileFile} from "../src/compile";
import { JavaClass } from "../src/assembler/JavaClass";
import { assemble } from "../src/assembler/assembler";

export interface JavaOutput {
    output: string;
    returnCode: number;
}

export function getJavaOutput(rootDir: string, workingDir: string, className: string): Promise<JavaOutput> {
    return new Promise<JavaOutput>((res, rej) => {
        console.log(`Running java -cp TsJvm-1.0-SNAPSHOT.jar:${workingDir} ${className}`);
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
    const projectRoot = path.resolve(`${dir}/../../../`);
    if (fs.existsSync(outfolder)){
        fs.rmdirSync(outfolder, { recursive: true });
    }
    fs.mkdirSync(outfolder, { recursive: true });
    compileFile(`${dir}/resources/${infile}`, outfolder);
    return await getJavaOutput(projectRoot, outfolder, infileClass);

}

export async function assembleAndRun(dir: string, mainClass: JavaClass, extraClasses: JavaClass[] = []):
        Promise<JavaOutput> {
    const outfolder = `${dir}/out`;
    const projectRoot = path.resolve(`${dir}/../../`);
    if (fs.existsSync(outfolder)){
        fs.rmdirSync(outfolder, { recursive: true });
    }
    fs.mkdirSync(outfolder, { recursive: true });
    extraClasses.forEach((clss) => {
        assemble(outfolder, clss);
    });
    assemble(outfolder, mainClass);
    return await getJavaOutput(projectRoot, outfolder, mainClass.className);
}