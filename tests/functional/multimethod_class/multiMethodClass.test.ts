import {compileAndRun} from "../../helpers";

test('Hello Class', async () => {
    const output = await compileAndRun(__dirname, "multiMethodClass.ts",
        "MultiMethodClassMain");
    expect(output.output).toBe("Hello World Class!\n");
    expect(output.returnCode).toBe(0);
});