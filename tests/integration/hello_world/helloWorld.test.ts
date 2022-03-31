// @ts-ignore
import {compileAndRun} from "../helpers";

test('Hello World', async () => {
    const output = await compileAndRun(__dirname, "helloWorld.ts",
        "HelloClass");
    expect(output.output).toBe("Hello World Class!\n");
    expect(output.returnCode).toBe(0);
});