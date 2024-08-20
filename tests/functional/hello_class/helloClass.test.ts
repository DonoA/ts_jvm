import {compileAndRun} from "../../helpers";

test('Hello Class', async () => {
    const output = await compileAndRun(__dirname, "helloWorldClass.ts",
        "HelloWorldClassMain");
    expect(output.output).toBe("Hello World Class!\n");
    expect(output.returnCode).toBe(0);
});