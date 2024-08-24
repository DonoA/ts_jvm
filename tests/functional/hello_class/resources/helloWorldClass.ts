class HelloWorldClass {
    testData: string;
    
    constructor() {
        this.testData = "Hello World Class!";
    }

    printData() {
        console.log(this.testData);
    }
}

const helloWorld = new HelloWorldClass();
helloWorld.printData();
