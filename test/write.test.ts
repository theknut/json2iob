import { describe, expect, test } from '@jest/globals';
import { Json2iob, JsonObject, Options, iobCommon } from '../src';
import { AdapterMock } from './AdapterMock';

var model : Json2iob;
beforeEach(() => model = new Json2iob(new AdapterMock()));

describe("writeAsync", () => {
    const input = `[
        { "item": "number 1" },
        { "item": "number 2" },
        { "item": "number 3" },
        { "item": "number 4" },
        { "item": "number 5" },
        { "item": "number 6" },
        { "item": "number 7" },
        { "item": "number 8" },
        { "item": "number 9" },
        { "item": "number 10" },
        { "item": "number 11" }
    ]`;

    it.only("Should parse base64 content", async () => {
        const result = await model.deserializeAsync("path.to.state", input, <Options> { autoCast: true, forceIndex: true });
        
        expect(result).not.toBeUndefined();
        //await model.writeAsync(result!);
    });
});