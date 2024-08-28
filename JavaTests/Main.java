class HelloWorldClass {
    public String testData;
    
    public HelloWorldClass() {
        testData = "Hello world!";
    }

    public String printData() {
        return testData;
    }
}

public class Main {
    public static void main(String[] args) {
        HelloWorldClass helloWorld = new HelloWorldClass();
        helloWorld.printData();
    }
}