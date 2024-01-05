import { describe, expect, test } from '@jest/globals';
import { Json2iob, JsonObject, Options, iobCommon } from '../src';
var model : Json2iob;

beforeEach(() => model = new Json2iob());

describe("writeAsync options: created objects", () => {
    it("Should not save created objects in deserializeAsync", async () => {
        const anyModel : any = model;
        expect(anyModel.alreadyCreatedObjects).not.toBeUndefined();
        expect(Object.keys(anyModel.alreadyCreatedObjects)).toHaveLength(0);

        await model.deserializeAsync("path.to.state", '{"name" : "John", "title" : "MD" }', <Options> { autoCast: true });

        expect(Object.keys(anyModel.alreadyCreatedObjects)).toHaveLength(0);
    });
    
    /*it("Should save created objects", async () => {
        const anyModel : any = model;
        expect(anyModel.alreadyCreatedObjects).not.toBeUndefined();
        expect(Object.keys(anyModel.alreadyCreatedObjects)).toHaveLength(0);

        const result = await model.deserializeAsync("path.to.state", '{"name" : "John", "title" : "MD" }', <Options> { autoCast: true });
        if (result) {
            await model.writeAsync(result);
        }

        expect(Object.keys(anyModel.alreadyCreatedObjects)).toHaveLength(0);
    });*/
});