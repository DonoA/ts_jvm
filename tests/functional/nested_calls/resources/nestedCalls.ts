class NestingClass1 {
    innerClass: NestingClass2;
    
    constructor() {
        this.innerClass = new NestingClass2();
    }

}

class NestingClass2 {
    innerClass: NestingClass3;
    
    constructor() {
        this.innerClass = new NestingClass3();
    }
}

class NestingClass3 {
    innerMostData: string = "Default Data";
}

const nester = new NestingClass1();
console.log(nester.innerClass.innerClass.innerMostData);