import { expect, test } from '@jest/globals';
import { Json2iob } from '../src';

var fakeAdapter : FakeAdapter;
var consoleDebug  = console.debug;
var consoleWarn  = console.warn;
var consoleError  = console.error;
var debugMessages : string[] = [];
var warnMessages : string[] = [];
var errorMessages : string[] = [];

beforeAll(() => {
    console.debug = (message: string) => debugMessages.push(message);
    console.warn = (message: string) => warnMessages.push(message);
    console.error = (message: string) => errorMessages.push(message);
});

afterAll(() => {
    console.debug = consoleDebug;
    console.warn = consoleWarn;
    console.error = consoleError;
});

beforeEach(() => {
    debugMessages = [];
    warnMessages = [];
    errorMessages = [];
    fakeAdapter = new FakeAdapter();
})

test("Uses console logging if no adapter is provided", () => {    
    var model : any = new Json2iob();
    model.log.debug("🥑");
    model.log.warn("🍓");
    model.log.error("🍉");
    
    expect(debugMessages).toHaveLength(1);
    expect(warnMessages).toHaveLength(1);
    expect(errorMessages).toHaveLength(1);

    expect(debugMessages.pop()).toBe("🥑");
    expect(warnMessages.pop()).toBe("🍓");
    expect(errorMessages.pop()).toBe("🍉");
});

test("Uses adapter logging if adapter is provided", () => {
    var model : any = new Json2iob(fakeAdapter);
    model.log.debug("🥑");
    model.log.warn("🍓");
    model.log.error("🍉");
    
    expect(model.adapter.debugMessages).toHaveLength(1);
    expect(model.adapter.warnMessages).toHaveLength(1);
    expect(model.adapter.errorMessages).toHaveLength(1);

    expect(model.adapter.debugMessages.pop()).toBe("🥑");
    expect(model.adapter.warnMessages.pop()).toBe("🍓");
    expect(model.adapter.errorMessages.pop()).toBe("🍉");
    
    expect(debugMessages).toHaveLength(0);
    expect(warnMessages).toHaveLength(0);
    expect(errorMessages).toHaveLength(0);
});

class FakeAdapter {
    debugMessages : string[] = [];
    warnMessages : string[] = [];
    errorMessages : string[] = [];

    debug(message: string) {
        this.debugMessages.push(message);
    }

    warn(message: string) {        
        this.warnMessages.push(message);
    }

    error(message: string) {        
        this.errorMessages.push(message);
    }
}