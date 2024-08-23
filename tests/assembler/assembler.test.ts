import { JavaClass } from "../../src/assembler/JavaClass";
import { JavaMethod, JavaMethodSignature } from "../../src/assembler/JavaMethod";
import { JavaType } from "../../src/assembler/JavaType";
import { assembleAndRun } from "../helpers";

test('Print Hello World', async () => {
    const mainClass = new JavaClass(JavaClass.ACCESS.PUBLIC, "HelloWorldMain", JavaType.OBJECT.name);
    const mainMethod = mainClass.addMethod(JavaMethod.ACCESS.PUBLIC | JavaMethod.ACCESS.STATIC, "main", JavaMethodSignature.MAIN);

    mainMethod.code.getstaticInstr("java/lang/System", "out", "Ljava/io/PrintStream;");
    mainMethod.code.loadconstInstr("Hello World!");
    mainMethod.code.invokevirtualInstr("java/io/PrintStream", "println", JavaMethodSignature.fromTypes([JavaType.STRING], JavaType.VOID));
    mainMethod.code.returnInstr();

    const output = await assembleAndRun(__dirname, mainClass);
    expect(output.output).toBe("Hello World!\n");
    expect(output.returnCode).toBe(0);
});

test('Call Different Class', async () => {
    const printerClass = new JavaClass(JavaClass.ACCESS.PUBLIC, "PrinterClass", JavaType.OBJECT.name);
    const printerCtr = printerClass.addConstructor(JavaMethod.ACCESS.PUBLIC, JavaMethodSignature.EMPTY);

    printerCtr.code.aloadInstr(0);
    printerCtr.code.invokespecialInstr("java/lang/Object", "<init>", JavaMethodSignature.EMPTY);
    printerCtr.code.returnInstr();

    const printerMethod = printerClass.addMethod(JavaMethod.ACCESS.PUBLIC, "print", JavaMethodSignature.EMPTY);

    printerMethod.code.getstaticInstr("java/lang/System", "out", "Ljava/io/PrintStream;");
    printerMethod.code.loadconstInstr("Hello World From Printer!");
    printerMethod.code.invokevirtualInstr("java/io/PrintStream", "println", JavaMethodSignature.fromTypes([JavaType.STRING], JavaType.VOID));
    printerMethod.code.returnInstr();

    const mainClass = new JavaClass(JavaClass.ACCESS.PUBLIC, "Main", JavaType.OBJECT.name);
    const mainMethod = mainClass.addMethod(JavaMethod.ACCESS.PUBLIC | JavaMethod.ACCESS.STATIC, "main", JavaMethodSignature.MAIN);

    mainMethod.code.newInstr(printerClass.className);
    mainMethod.code.dupInstr();
    mainMethod.code.invokespecialInstr(printerClass.className, "<init>", JavaMethodSignature.EMPTY);
    mainMethod.code.invokevirtualInstr(printerClass.className, printerMethod.name, printerMethod.signature);

    const output = await assembleAndRun(__dirname, mainClass, [printerClass]);
    expect(output.output).toBe("Hello World From Printer!\n");
    expect(output.returnCode).toBe(0);
});

test('Read and assign locals', async () => {
    const mainClass = new JavaClass(JavaClass.ACCESS.PUBLIC, "Main", JavaType.OBJECT.name);
    const mainMethod = mainClass.addMethod(JavaMethod.ACCESS.PUBLIC | JavaMethod.ACCESS.STATIC, "main", JavaMethodSignature.MAIN);

    const localName = "testVar";
    mainMethod.code.addLocal(localName, JavaType.STRING);

    mainMethod.code.loadconstInstr("Print 2");
    mainMethod.code.astoreLocalInstr(localName);

    mainMethod.code.getstaticInstr("java/lang/System", "out", "Ljava/io/PrintStream;");
    mainMethod.code.loadconstInstr("Print 1");
    mainMethod.code.invokevirtualInstr("java/io/PrintStream", "println", JavaMethodSignature.fromTypes([JavaType.STRING], JavaType.VOID));

    mainMethod.code.getstaticInstr("java/lang/System", "out", "Ljava/io/PrintStream;");
    mainMethod.code.aloadLocalInstr(localName);
    mainMethod.code.invokevirtualInstr("java/io/PrintStream", "println", JavaMethodSignature.fromTypes([JavaType.STRING], JavaType.VOID));

    const output = await assembleAndRun(__dirname, mainClass);
    expect(output.output).toBe("Print 1\nPrint 2\n");
    expect(output.returnCode).toBe(0);
});

test('Define local variable', async () => {
    const mainClass = new JavaClass(JavaClass.ACCESS.PUBLIC, "LocalVarMain", JavaType.OBJECT.name);
    const mainMethod = mainClass.addMethod(JavaMethod.ACCESS.PUBLIC | JavaMethod.ACCESS.STATIC, "main", JavaMethodSignature.MAIN);

    mainMethod.code.loadconstInstr("Hello Local World!");
    mainMethod.code.astoreInstr(0);
    mainMethod.code.getstaticInstr("java/lang/System", "out", "Ljava/io/PrintStream;");
    mainMethod.code.aloadInstr(0);
    mainMethod.code.invokevirtualInstr("java/io/PrintStream", "println", JavaMethodSignature.fromTypes([JavaType.STRING], JavaType.VOID));
    mainMethod.code.returnInstr();

    const output = await assembleAndRun(__dirname, mainClass);
    expect(output.output).toBe("Hello Local World!\n");
    expect(output.returnCode).toBe(0);
});