import { expect } from '@jest/globals';
import { Json2iob, Options } from '../src';
import { AdapterMock } from './AdapterMock';

var model : Json2iob;
const endings = ["state", "object"];

it.each([
    {path: null, expectedResult: false},
    {path: undefined, expectedResult: false},
    {path: "my.path.state.ending", expectedResult: false},
    {path: "my.path.stateEnding", expectedResult: false},
    {path: "my.path.state", expectedResult: true},
    {path: "my.path.object", expectedResult: true},
])("Should exclude ending '$path': $expectedResult", ({path, expectedResult}) => {
    const anyModel : any = new Json2iob();
    expect(anyModel._pathHasEnding(path, endings)).toBe(expectedResult);
});

it("Should use forbidden chars if provided by adapter", async () => {
    model = new Json2iob(new AdapterMock(/lucky\s/));
    const result = await model.deserializeAsync("path.to.state", '{"lucky number" : "8" }', <Options> { autoCast: true });

    expect(result).not.toBeUndefined();
    expect(result!.children).toHaveLength(1);
    expect(result!.children[0].path).toBe("path.to.state._number");
    expect(result!.children[0].state).toBe(8);
});

it("Should replace forbidden chars", async () => {
    model = new Json2iob(new AdapterMock());
    const result = await model.deserializeAsync("path.to.state", '{"😋" : "😎" }', <Options> { autoCast: true });

    expect(result).not.toBeUndefined();
    expect(result!.children).toHaveLength(1);
    expect(result!.children[0].path).toBe("path.to.state._");
    expect(result!.children[0].state).toBe("😎");
});