class HelloWorldClass {
    public String testData;
    
    public HelloWorldClass() {
        testData = "Hello world!";
    }

    public void printData() {
        System.out.println(testData);
    }
}

public class Main {
    public static void main(String[] args) {
        HelloWorldClass helloWorld = new HelloWorldClass();
        helloWorld.printData();
    }
}