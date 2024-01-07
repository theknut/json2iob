import { expect, test } from '@jest/globals';
import { AdapterMock, ObjectNotExistsError, StateNotExistsError } from './AdapterMock';

var model : AdapterMock;
beforeEach(() => model = new AdapterMock());

describe("AdapterMock", () => {
    it.only.each([
        {description: "Should throw if no object exists for the given state", error: ObjectNotExistsError, expectedId: "path.to" },
        {description: "Should throw if no state exists for the given state", error: StateNotExistsError, expectedId: "path.to.state" }
    ])("$description", async ({description, error, expectedId}) => {
        const helper = async () => {
            if (error.name === "StateNotExistsError") {
                await model.setObjectNotExistsAsync("path.to", { _id: "path.to", type: "channel", common: { name: "to" }, native: {} });
            }
            await model.setStateAsync("path.to.state", "🥑")
        };

        try {
            await helper();
        } catch (e: any) {
            expect(e.constructor.name).toBe(error.name);
            expect((<any> e).id).toBe(expectedId);
        }
    });
});