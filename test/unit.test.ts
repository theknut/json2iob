import { describe, expect, test } from '@jest/globals';
import { Json2iob } from '../src';
var model : Json2iob;
const endings = ["state", "object"];

beforeEach(() => model = new Json2iob());

it.each([
    {path: null, expectedResult: false},
    {path: undefined, expectedResult: false},
    {path: "my.path.state.ending", expectedResult: true},
    {path: "my.path.stateEnding", expectedResult: false},
    {path: "my.path.state", expectedResult: true},
    {path: "my.path.object", expectedResult: true},
])("Should exclude ending '$path': $expectedResult", (path, expectedResult) => {
    const anyModel : any = model;
    expect(anyModel._hasPathEndingToExclude(path, endings)).toBe(expectedResult);
});