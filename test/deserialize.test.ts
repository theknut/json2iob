import { describe, expect, test } from '@jest/globals';
import { Json2iob, JsonObject, Options, iobCommon } from '../src';
import exp from 'constants';
var model : Json2iob;
var testInput : string;

beforeAll(() => {
    testInput = JSON.parse(`[
        {
           "product":"🍔",
           "expiringAt":"2023-12-15T09:20:00.000Z",
           "willKillYouEventually": true,
           "nutritionFacts": {
              "calories": 550,
              "fat": {
                "total": 29,
                "amounts": [
                    {"name": "saturated", "amount": 10},
                    {"name": "trans", "amount": 1.5}
                ]
              },
              "cholesterol": 0.075,
              "sodium": 1,
              "carbohydrate": {
                "total": 46,
                "amounts": [
                    {"name": "dietary fiber", "amount": 3},
                    {"name": "sugars", "amount": 9}
                ]
              },
              "protein": 25,
              "calcium": 0.26,
              "potassium": 0
           }
        },
        {
           "product":"🥗",
           "expiringAt":"2023-12-15T09:30:00.000Z",
           "willKillYouEventually": false,
           "nutritionFacts": {
              "calories": 80,
              "fat": {
                "total": 4,
                "amounts": [
                    {"name": "saturated", "amount": 0},
                    {"name": "trans", "amount": 0}
                ]
              },
              "cholesterol": 0.005,
              "sodium": 0.4,
              "carbohydrate": {
                "total": 9,
                "amounts": [
                    {"name": "dietary fiber", "amount": 3},
                    {"name": "sugars", "amount": 5}
                ]
              },
              "protein": 3,
              "calcium": 0.52,
              "potassium": 0.317
           }
        }
    ]`);
});

beforeEach(() => model = new Json2iob());

describe("deserializeAsync: paramter input test", () => {
    it("Should handle null input", async () => {
        const result = await model.deserializeAsync("🥑", null);
        expect(result).toBeUndefined();
    });
    it("Should handle undefined input", async () => {
        const result = await model.deserializeAsync("🥑", undefined);
        expect(result).toBeUndefined();
    });
    it("Should handle null path", async () => {
        const path : any = null;
        const result = await model.deserializeAsync(path, "🥑");
        expect(result).toBeUndefined();
    });
    it("Should handle undefined path", async () => {
        const path : any = undefined;
        const result = await model.deserializeAsync(path, "🥑");
        expect(result).toBeUndefined();
    });
    it("Should handle empty path", async () => {
        const path : any = undefined;
        const result = await model.deserializeAsync(path, "🥑");
        expect(result).toBeUndefined();
    });
    it("Should replace invalid chars", async () => {
        const result = await model.deserializeAsync("🍓", "🥑");
        expect(result?.path).toBe("_");
        expect(result?.state).toBe("🥑");
    });
});

describe("deserializeAsync: non JSON object value", () => {
    it.each([
        {value: "🥑", role: "text", type: "string" },
        {value: 888, role: "value", type: "number" },
        //{value: true, role: "indicator", type: "boolean" },
    ])("Basic type should not have any children ('$value', $role, '$type')", async ({value, role, type}) => {
        const result = await model.deserializeAsync("path.to.state", value);
        expect(result).toBeInstanceOf(JsonObject);
        expect(result).toEqual(<JsonObject> {
            path: "path.to.state",
            state: value,
            mode: "create",
            common: {
              name: "state",
              read: true,
              role: role,
              states: undefined,
              type: type,
              write: false,
            },
            children: []
        });
    });
});


describe("deserializeAsync: child hierarchy", () => {
    it("Should parse arrays within arrays", async () => {
        const result = await model.deserializeAsync("mymeals.today", testInput, <Options> { forceIndex: true, zeroBasedArrayIndex: true, disablePadIndex: true });
        
        expect(result).not.toBeUndefined();
        expect(result).toBeInstanceOf(JsonObject);
        expect(result!.path).toBe("mymeals.today");
        expect(result!.mode).toBe("array");
        expect(result!.state).toBeUndefined;
        expect(result!.children).toHaveLength(2);

        const burger = result?.children[0];
        expect(burger!.path).toBe("mymeals.today.0");
        expect(burger!.children).toHaveLength(4);
            testStringObject(burger!.children[0], "mymeals.today.0.product", "🍔");                
            testStringObject(burger!.children[1], "mymeals.today.0.expiringAt", "2023-12-15T09:20:00.000Z");                
            testBooleanObject(burger!.children[2], "mymeals.today.0.willKillYouEventually", true);
            expect(burger!.children[3].path).toBe("mymeals.today.0.nutritionFacts");
            expect(burger!.children[3].state).toBeUndefined();
            expect(burger!.children[3].children).toHaveLength(8);
                testNumberObject(burger!.children[3].children[0], "mymeals.today.0.nutritionFacts.calories", 550);                
                expect(burger!.children[3].children[1].path).toBe("mymeals.today.0.nutritionFacts.fat");
                expect(burger!.children[3].children[1].state).toBeUndefined();
                expect(burger!.children[3].children[1].children).toHaveLength(2);
                testNumberObject(burger!.children[3].children[1].children[0], "mymeals.today.0.nutritionFacts.fat.total", 29);   
                    expect(burger!.children[3].children[1].children[1].path).toBe("mymeals.today.0.nutritionFacts.fat.amounts");
                    expect(burger!.children[3].children[1].children[1].state).toBeUndefined();              
                    expect(burger!.children[3].children[1].children[1].children).toHaveLength(2);                          
                        testStringObject(burger!.children[3].children[1].children[1].children[0].children[0], "mymeals.today.0.nutritionFacts.fat.amounts.0.name", "saturated");
                        testNumberObject(burger!.children[3].children[1].children[1].children[0].children[1], "mymeals.today.0.nutritionFacts.fat.amounts.0.amount", 10);         
                        testStringObject(burger!.children[3].children[1].children[1].children[1].children[0], "mymeals.today.0.nutritionFacts.fat.amounts.1.name", "trans");
                        testNumberObject(burger!.children[3].children[1].children[1].children[1].children[1], "mymeals.today.0.nutritionFacts.fat.amounts.1.amount", 1.5);                
                testNumberObject(burger!.children[3].children[2], "mymeals.today.0.nutritionFacts.cholesterol", 0.075);
                testNumberObject(burger!.children[3].children[3], "mymeals.today.0.nutritionFacts.sodium", 1);
                expect(burger!.children[3].children[4].path).toBe("mymeals.today.0.nutritionFacts.carbohydrate");
                expect(burger!.children[3].children[4].state).toBeUndefined();
                expect(burger!.children[3].children[4].children).toHaveLength(2);
                    testNumberObject(burger!.children[3].children[4].children[0], "mymeals.today.0.nutritionFacts.carbohydrate.total", 46);   
                    expect(burger!.children[3].children[4].children[1].path).toBe("mymeals.today.0.nutritionFacts.carbohydrate.amounts");
                    expect(burger!.children[3].children[4].children[1].state).toBeUndefined();              
                    expect(burger!.children[3].children[4].children[1].children).toHaveLength(2);           
                        testStringObject(burger!.children[3].children[4].children[1].children[0].children[0], "mymeals.today.0.nutritionFacts.carbohydrate.amounts.0.name", "dietary fiber");
                        testNumberObject(burger!.children[3].children[4].children[1].children[0].children[1], "mymeals.today.0.nutritionFacts.carbohydrate.amounts.0.amount", 3);         
                        testStringObject(burger!.children[3].children[4].children[1].children[1].children[0], "mymeals.today.0.nutritionFacts.carbohydrate.amounts.1.name", "sugars");
                        testNumberObject(burger!.children[3].children[4].children[1].children[1].children[1], "mymeals.today.0.nutritionFacts.carbohydrate.amounts.1.amount", 9); 
                testNumberObject(burger!.children[3].children[5], "mymeals.today.0.nutritionFacts.protein", 25);
                testNumberObject(burger!.children[3].children[6], "mymeals.today.0.nutritionFacts.calcium", 0.26);
                testNumberObject(burger!.children[3].children[7], "mymeals.today.0.nutritionFacts.potassium", 0);

        const salad = result?.children[1];
        expect(salad!.path).toBe("mymeals.today.1");
        expect(salad!.children).toHaveLength(4);
            testStringObject(salad!.children[0], "mymeals.today.1.product", "🥗");                
            testStringObject(salad!.children[1], "mymeals.today.1.expiringAt", "2023-12-15T09:30:00.000Z");
            testBooleanObject(salad!.children[2], "mymeals.today.1.willKillYouEventually", false);
            expect(salad!.children[3].path).toBe("mymeals.today.1.nutritionFacts");
            expect(salad!.children[3].state).toBeUndefined();
            expect(salad!.children[3].children).toHaveLength(8);
                testNumberObject(salad!.children[3].children[0], "mymeals.today.1.nutritionFacts.calories", 80);
    });
});


describe("deserializeAsync: base64 options", () => {
    it.todo("String base64 with parse base64");
    it.todo("String base64 without parse base64");
    it.todo("Number with parse base64");
});

describe("deserializeAsync: skip options", () => {
    it.each([
        {path: "path.to.state", value: "🥑", expectedMode: "skipEnding" },
        {path: "path.to.stateName", value: 888, expectedMode: "create" },
        {path: "path.state.name", value: 888, expectedMode: "create" },
        {path: "state", value: true, expectedMode: "skipEnding" },
        {path: "state", value: '{"fruit": "🍒"}', expectedMode: "skipEnding" },
    ])("Should exclude path with ending ('$path', '$value', '$expectedMode')", async ({path, value, expectedMode}) => {
        const result = await model.deserializeAsync(path, value, <Options> { excludeStateWithEnding: ["state"] } );
        expect(result).not.toBeUndefined();
        expect(result!.path).toBe(path);
        expect(result!.mode).toBe(expectedMode);
    });
    
    it.each([
        {path: "path.to", value: '{"state": "🍒"}', expectedMode: "skipEnding" },
        {path: "path.to", value: '{"stateName": "🍒"}', expectedMode: "create" }
    ])("Should exclude path with ending recursive ('$path', $value, '$expectedMode')", async ({path, value, expectedMode}) => {
        const result = await model.deserializeAsync(path, JSON.parse(value), <Options> { excludeStateWithEnding: ["state"] } );
        expect(result).not.toBeUndefined();
        expect(result!.path).toBe(path);
        expect(result!.mode).toBe("create");
        expect(result!.children).toHaveLength(1);
        expect(result!.children[0].mode).toBe(expectedMode);
    });
});

function testObject(object: JsonObject, path: string, state: any | undefined, role: string, type: string) {
    expect(object.path).toBe(path);
    expect(object.state).toBe(state);
    expect(object.common?.role).toBe(role);
    expect(object.common?.type).toBe(type);
}

function testStringObject(object: JsonObject, path: string, state: any | undefined, role: string = "text", type: string = "string") {
    testObject(object, path, state, role, type);
}

function testNumberObject(object: JsonObject, path: string, state: number | undefined, role: string = "value", type: string = "number") {
    testObject(object, path, state, role, type);
}

function testBooleanObject(object: JsonObject, path: string, state: boolean | undefined, role: string = "indicator", type: string = "boolean") {
    testObject(object, path, state, role, type);
}