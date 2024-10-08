import {compileAndRun} from "../../helpers";

test('Hello World', async () => {
    const output = await compileAndRun(__dirname, "helloWorld.ts",
        "HelloWorldMain");
    expect(output.output).toBe("Hello World!\n");
    expect(output.returnCode).toBe(0);
});