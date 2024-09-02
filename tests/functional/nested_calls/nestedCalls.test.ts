import {compileAndRun} from "../../helpers";

test('Nested Calls', async () => {
    const output = await compileAndRun(__dirname, "nestedCalls.ts",
        "NestedCallsMain");
    expect(output.output).toBe("Default Data\n");
    expect(output.returnCode).toBe(0);
});