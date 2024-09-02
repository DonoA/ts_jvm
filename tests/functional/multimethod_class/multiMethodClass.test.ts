import {compileAndRun} from "../../helpers";

test('Multi Method Class', async () => {
    const output = await compileAndRun(__dirname, "multiMethodClass.ts",
        "MultiMethodClassMain");
    expect(output.output).toBe("Hello Multi Method Class!\n");
    expect(output.returnCode).toBe(0);
});