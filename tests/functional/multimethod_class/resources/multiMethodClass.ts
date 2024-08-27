class MultiMethodClass {
    private testData: string;
    
    constructor() {
        this.testData = "Default Hello";
    }
    
    static run() {
        const helloWorld = new MultiMethodClass();
        helloWorld.setTestData("Hello Multi Method Class!");
        helloWorld.printTestData();
    }

    public setTestData(data: string) {
        this.testData = data;
    }

    public getTestData() {
        return this.testData;
    }

    public printTestData() {
        console.log(this.getTestData());
    }
}

MultiMethodClass.run();
