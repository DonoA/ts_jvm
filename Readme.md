![Logo](https://raw.githubusercontent.com/DonoA/ts_jvm/main/TsJvm.png)

ts_jvm
===
TypeScript compiler for the JVM

TypeScript enables developers to write applications using strongly typed classes and interfaces. The goal of this project is to enable strictly typed TypeScript projects to run on the Java Virtual Machine.

The NodeJS V8 runtime has many optimizations based on treats JavaScript objects as classes which allows it to process JavaScript faster than other runtimes. In spite of this, the JVM remains much fuller featured and performance oriented for server based applications than V8. The idea behind this project is that if TypeScript can be effectively compiled for the JVM, backend TypeScript applications (web servers) can take advantage of decades of VM optimizations offered by the JVM. In particular, V8 still lacks the degree of garbage collection tuning that the JVM offers. This could help optimize server applications beyond what is possible using V8 alone.

## Modules
ts_jvm has 3 core components
### Assembler
This project includes an assembler for JVM class files writing in TypeScript. This assembler supports:
- Classes
- Fields
- Methods
- Constant Pool Management
- Type Serializing
- Stack sizing and local reference tracking

The number of byte code instructions supported by the assembler is currently limited but easily extensible.

### Shim
To ensure that basic JavaScript builtins can still be used, a java shim is provided. This shim must be provided on the classpath when running a compiled TypeScript file to ensure that basic methods like `console.log` can be located.

### Compiler
The compile component is the most complicated and critical. The compiler uses a parser provided by eslint and translates the resulting AST into a java class file. Any functions defined outside of a class is added to a file default class based on the name of the file. Any executable code outside of functions and classes is added to a main function for that same file class. This allows for compiling and running of scripts even when they don't leverage a Java style main class.

## Testing
ts_jvm uses tsnode to run typescript source and test files through jest. Java, maven, node, and npm are required to run the tests:
 - `npm ci` to install all packages for node
 - under `JavaShim` run `build.sh` to create the shim jar and move it to the root directory
 - To run all the project's tests, use `npm test`

Each test case outputs both the parsed AST and java class files for execution into `{test dir}/out`.

To inspect the java class files use `javap -verbose <path to class>`
