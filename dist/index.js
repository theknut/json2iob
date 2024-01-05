"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const json_bigint_1 = __importDefault(require("json-bigint"));
class JsonObject {
    path;
    state;
    children = [];
}
class PendingJsonObject extends JsonObject {
    common;
}
class SkippedJsonObject extends JsonObject {
    reason;
}
class Json2iob {
    adapter;
    log;
    alreadyCreatedObjects;
    objectTypes;
    forbiddenCharsRegex;
    constructor(adapter) {
        if (!adapter) {
            throw new Error("ioBroker Adapter is not defined!");
        }
        this.adapter = adapter;
        this.log = this.adapter ?? console;
        this.alreadyCreatedObjects = {};
        this.objectTypes = {};
        this.forbiddenCharsRegex = /[^._\-/ :!#$%&()+=@^{}|~\p{Ll}\p{Lu}\p{Nd}]+/gu;
        if (this.adapter && this.adapter.FORBIDDEN_CHARS) {
            this.forbiddenCharsRegex = this.adapter.FORBIDDEN_CHARS;
        }
    }
    /**
     * Parses the given element and creates states in the adapter based on the element's structure.
     * @method parse
     * @param {string} path - The ioBroker object path which the element should be saved to.
     * @param {any} element - The element to be parsed.
     * @param {Options} [options={}] - The parsing options.
     * @param {boolean} [options.write] - Activate write for all states.
     * @param {boolean} [options.forceIndex] - Instead of trying to find names for array entries, use the index as the name.
     * @param {boolean} [options.disablePadIndex] - Disables padding of array index numbers if forceIndex = true
     * @param {boolean} [options.zeroBasedArrayIndex] - Start array index from 0 if forceIndex = true
     * @param {string} [options.channelName] - Set name of the root channel.
     * @param {string} [options.preferedArrayName] - Set key to use this as an array entry name.
     * @param {string} [options.preferedArrayDesc] - Set key to use this as an array entry description.
     * @param {boolean} [options.autoCast] - Make JSON.parse to parse numbers correctly.
     * @param {Object} [options.descriptions] - Object of names for state keys.
     * @param {Object} [options.states] - Object of states to create for an id, new entries via json will be added automatically to the states.
     * @param {Object} [options.units] - Object of untis to create for an id
     * @param {boolean} [options.parseBase64] - Parse base64 encoded strings to utf8.
     * @param {string[]} [options.parseBase64byIds] - Array of ids to parse base64 encoded strings to utf8.
     * @param {boolean} [options.deleteBeforeUpdate] - Delete channel before update.
     * @param {boolean} [options.removePasswords] - Remove password from log.
     * @param {string[]} [options.excludeStateWithEnding] - Array of strings to exclude states with this ending.
     * @param {string[]} [options.makeStateWritableWithEnding] - Array of strings to make states with this ending writable.
     * @param {boolean} [options.dontSaveCreatedObjects] - Create objects but do not save them to alreadyCreatedObjects.
     * @returns {Promise<void>} - A promise that resolves when the parsing is complete.
     */
    async deserializeAsync(path, element, options = { write: false }) {
        if (element === null || element === undefined) {
            this.log.debug("Cannot extract empty: " + path);
            return undefined;
        }
        if ((options.parseBase64 && this._isBase64(element)) ||
            (options.parseBase64byIds && options.parseBase64byIds.includes(path))) {
            try {
                element = Buffer.from(element, "base64").toString("utf8");
                if (this._isJsonString(element)) {
                    element = json_bigint_1.default.parse(element);
                }
            }
            catch (error) {
                this.log.warn(`Cannot parse base64 for ${path}: ${error}`);
            }
        }
        const objectKeys = Object.keys(element);
        if (!options || !options.write) {
            if (!options) {
                options = { write: false };
            }
            else {
                options["write"] = false;
            }
        }
        path = path.toString().replace(this.forbiddenCharsRegex, "_");
        const pathSegments = path.split(".");
        if (typeof element === "string" || typeof element === "number") {
            //remove ending . from path
            if (path.endsWith(".")) {
                path = path.slice(0, -1);
            }
            const lastPathElement = pathSegments.pop();
            if (options.excludeStateWithEnding && lastPathElement) {
                for (const excludeEnding of options.excludeStateWithEnding) {
                    if (lastPathElement.endsWith(excludeEnding)) {
                        this.log.debug(`skip state with ending : ${path}`);
                        return undefined;
                    }
                }
            }
            if (options.makeStateWritableWithEnding && lastPathElement) {
                for (const writingEnding of options.makeStateWritableWithEnding) {
                    if (lastPathElement.toLowerCase().endsWith(writingEnding)) {
                        this.log.debug(`make state with ending writable : ${path}`);
                        options.write = true;
                    }
                }
            }
            if (!this.alreadyCreatedObjects[path] || this.objectTypes[path] !== typeof element) {
                let type = element !== null ? typeof element : "mixed";
                if (this.objectTypes[path] && this.objectTypes[path] !== typeof element) {
                    type = "mixed";
                    this.log.debug(`Type changed for ${path} from ${this.objectTypes[path]} to ${type}`);
                }
                let states;
                if (options.states && options.states[path]) {
                    states = options.states[path];
                    if (!states[element]) {
                        states[element] = element;
                    }
                }
                const common = {
                    name: lastPathElement,
                    role: this._getRole(element, options.write || false),
                    type: type,
                    write: options.write,
                    read: true,
                    states: states,
                };
                if (options.units && options.units[path]) {
                    common.unit = options.units[path];
                }
                //await this._createState(path, common, options);
                return { path: path, common: common, state: element };
            }
            //await this.adapter.setStateAsync(path, element, true);
            return { path: path, state: element };
        }
        if (options.removePasswords && path.toString().toLowerCase().includes("password")) {
            return { path: path, state: element, reason: "password" };
        }
        if ((!this.alreadyCreatedObjects[path] || options.deleteBeforeUpdate) && options.excludeStateWithEnding) {
            for (const excludeEnding of options.excludeStateWithEnding) {
                if (path.endsWith(excludeEnding)) {
                    //this.log.debug(`skip state with ending : ${path}`);
                    return { path: path, state: element, reason: "ending" };
                }
            }
        }
        if (Array.isArray(element)) {
            await this._extractArray(element, "", path, options);
            return undefined;
        }
        let jsonObject = { path: path };
        for (const key of objectKeys) {
            if (key.toLowerCase().includes("password") && options.removePasswords) {
                return { path: path, state: element, reason: "password" };
            }
            if (typeof element[key] === "function") {
                this.log.debug("Skip function: " + path + "." + key);
                jsonObject.children.push({ path: path + "." + key, state: element[key], reason: "function" });
                continue;
            }
            if (element[key] == null) {
                element[key] = "";
            }
            if (this._isJsonString(element[key]) && options.autoCast) {
                element[key] = json_bigint_1.default.parse(element[key]);
            }
            if ((options.parseBase64 && this._isBase64(element[key])) ||
                (options.parseBase64byIds && options.parseBase64byIds.includes(key))) {
                try {
                    element[key] = Buffer.from(element[key], "base64").toString("utf8");
                    if (this._isJsonString(element[key])) {
                        element[key] = json_bigint_1.default.parse(element[key]);
                    }
                }
                catch (error) {
                    this.log.warn(`Cannot parse base64 for ${path + "." + key}: ${error}`);
                }
            }
            if (Array.isArray(element[key])) {
                await this._extractArray(element, key, path, options);
            }
            else if (element[key] !== null && typeof element[key] === "object") {
                const childObject = await this.deserializeAsync(path + "." + key, element[key], options);
                if (childObject) {
                    jsonObject.children.push(childObject);
                }
            }
            else {
                const pathKey = key.replace(/\./g, "_");
                if (!this.alreadyCreatedObjects[path + "." + pathKey] ||
                    this.objectTypes[path + "." + pathKey] !== typeof element[key]) {
                    let objectName = key;
                    if (options.descriptions && options.descriptions[key]) {
                        objectName = options.descriptions[key];
                    }
                    let type = element[key] !== null ? typeof element[key] : "mixed";
                    if (this.objectTypes[path + "." + pathKey] &&
                        this.objectTypes[path + "." + pathKey] !== typeof element[key]) {
                        type = "mixed";
                        this.log.debug(`Type changed for ${path + "." + pathKey} from ${this.objectTypes[path + "." + pathKey]} to ${type}`);
                    }
                    let states;
                    if (options.states && options.states[key]) {
                        states = options.states[key];
                        if (!states[element[key]]) {
                            states[element[key]] = element[key];
                        }
                    }
                    const common = {
                        name: objectName,
                        role: this._getRole(element[key], options.write || false),
                        type: type,
                        write: options.write,
                        read: true,
                        states: states,
                    };
                    if (options.units && options.units[key]) {
                        common.unit = options.units[key]; // Assign the value to the 'unit' property
                    }
                    //await this._createState(path + "." + pathKey, common, options);
                    jsonObject.children.push({ path: path + "." + pathKey, common: common, state: element[key] });
                    continue;
                }
                //await this.adapter.setStateAsync(path + "." + pathKey, element[key], true);
                jsonObject.children.push({ path: path + "." + pathKey, state: element[key] });
            }
        }
    }
    async writeAsync(object, options = { write: false }) {
        if (object instanceof PendingJsonObject) {
            this._createState(object.path, object.common, options);
        }
        else if (object instanceof SkippedJsonObject) {
            this.log.debug(`Skipping ${object.path} (Reason '${object.reason}')`);
            return;
        }
        if (!this.alreadyCreatedObjects[object.path] || options.deleteBeforeUpdate) {
            if (options.makeStateWritableWithEnding) {
                for (const writingEnding of options.makeStateWritableWithEnding) {
                    if (object.path.toLowerCase().endsWith(writingEnding)) {
                        this.log.debug(`make state with ending writable : ${object.path}`);
                        options.write = true;
                    }
                }
            }
            if (options.deleteBeforeUpdate) {
                this.log.debug(`Deleting ${object.path} before update`);
                for (const key in this.alreadyCreatedObjects) {
                    if (key.startsWith(object.path)) {
                        delete this.alreadyCreatedObjects[key];
                    }
                }
                await this.adapter.delObjectAsync(object.path, { recursive: true });
            }
            let name = options.channelName || "";
            if (options.preferedArrayDesc && object.state[options.preferedArrayDesc]) {
                name = object.state[options.preferedArrayDesc];
            }
            await this.adapter
                .setObjectNotExistsAsync(object.path, {
                type: "channel",
                common: {
                    name: name,
                    write: false,
                    read: true,
                },
                native: {},
            })
                .then(() => {
                if (!options.dontSaveCreatedObjects) {
                    this.alreadyCreatedObjects[object.path] = true;
                }
                options.channelName = undefined;
                options.deleteBeforeUpdate = undefined;
            })
                .catch((error) => {
                this.adapter.log.error(error);
            });
        }
        await this.adapter.setStateAsync(object.path, object.state, true);
        for (const childObject of object.children) {
            await this.writeAsync(childObject, options);
        }
    }
    async parse(path, element, options = { write: false }) {
        try {
            const deserializedObject = await this.deserializeAsync(path, element);
            if (deserializedObject === undefined) {
                return;
            }
            await this.writeAsync(deserializedObject, options);
        }
        catch (error) {
            this.log.error("Error extract keys: " + path + " " + JSON.stringify(element));
            this.log.error(error);
        }
    }
    /**
     * Creates a state object in the adapter's namespace.
     * @param {string} path - The path of the state object.
     * @param {object} common - The common object for the state.
     * @param {object} [options] - Optional parameters.
     * @param {boolean} [options.dontSaveCreatedObjects] - If true, the created object will not be saved.
     * @returns {Promise<void>} - A promise that resolves when the state object is created.
     */
    async _createState(path, common, options = {}) {
        await this.adapter
            .extendObjectAsync(path, {
            type: "state",
            common: common,
            native: {},
        })
            .then(() => {
            if (!options.dontSaveCreatedObjects) {
                this.alreadyCreatedObjects[path] = true;
            }
            this.objectTypes[path] = common.type;
        })
            .catch((error) => {
            this.log.error(error);
        });
    }
    /**
     * Extracts an array from the given element and recursively parses its elements.
     *
     * @param {object} element - The element containing the array.
     * @param {string} key - The key of the array in the element.
     * @param {string} path - The current path in the object hierarchy.
     * @param {object} options - The parsing options.
     * @returns {Promise<void>} - A promise that resolves when the array extraction and parsing is complete.
     */
    async _extractArray(element, key, path, options) {
        try {
            if (key) {
                element = element[key];
            }
            let jsonObject = { path: path + "." + key };
            for (let index in element) {
                let arrayElement = element[index];
                if (arrayElement == null) {
                    this.log.debug("Cannot extract empty: " + path + "." + key + "." + index);
                    continue;
                }
                let indexNumber = parseInt(index) + 1;
                index = indexNumber.toString();
                if (indexNumber < 10) {
                    index = "0" + index;
                }
                if (options.autoCast && typeof arrayElement === "string" && this._isJsonString(arrayElement)) {
                    try {
                        element[index] = json_bigint_1.default.parse(arrayElement);
                        arrayElement = element[index];
                    }
                    catch (error) {
                        this.log.warn(`Cannot parse json value for ${path + "." + key + "." + index}: ${error}`);
                    }
                }
                let arrayPath = key + index;
                if (typeof arrayElement === "string" && key !== "") {
                    const childObject = await this.deserializeAsync(path + "." + key + "." + arrayElement, arrayElement, options);
                    if (childObject) {
                        jsonObject.children.push(childObject);
                    }
                    continue;
                }
                if (typeof arrayElement[Object.keys(arrayElement)[0]] === "string") {
                    arrayPath = arrayElement[Object.keys(arrayElement)[0]];
                }
                for (const keyName of Object.keys(arrayElement)) {
                    if (keyName.endsWith("Id") && arrayElement[keyName] !== null) {
                        if (arrayElement[keyName] && arrayElement[keyName].replace) {
                            arrayPath = arrayElement[keyName].replace(/\./g, "");
                        }
                        else {
                            arrayPath = arrayElement[keyName];
                        }
                    }
                }
                for (const keyName in Object.keys(arrayElement)) {
                    if (keyName.endsWith("Name")) {
                        if (arrayElement[keyName] && arrayElement[keyName].replace) {
                            arrayPath = arrayElement[keyName].replace(/\./g, "");
                        }
                        else {
                            arrayPath = arrayElement[keyName];
                        }
                    }
                }
                if (arrayElement.id) {
                    if (arrayElement.id.replace) {
                        arrayPath = arrayElement.id.replace(/\./g, "");
                    }
                    else {
                        arrayPath = arrayElement.id;
                    }
                }
                if (arrayElement.name) {
                    arrayPath = arrayElement.name.replace(/\./g, "");
                }
                if (arrayElement.label) {
                    arrayPath = arrayElement.label.replace(/\./g, "");
                }
                if (arrayElement.labelText) {
                    arrayPath = arrayElement.labelText.replace(/\./g, "");
                }
                if (arrayElement.start_date_time) {
                    arrayPath = arrayElement.start_date_time.replace(/\./g, "");
                }
                if (options.preferedArrayName && options.preferedArrayName.indexOf("+") !== -1) {
                    const preferedArrayNameArray = options.preferedArrayName.split("+");
                    if (arrayElement[preferedArrayNameArray[0]] !== undefined) {
                        const element0 = arrayElement[preferedArrayNameArray[0]].toString().replace(/\./g, "").replace(/ /g, "");
                        let element1 = "";
                        if (preferedArrayNameArray[1].indexOf("/") !== -1) {
                            const subArray = preferedArrayNameArray[1].split("/");
                            const subElement = arrayElement[subArray[0]];
                            if (subElement && subElement[subArray[1]] !== undefined) {
                                element1 = subElement[subArray[1]];
                            }
                            else if (arrayElement[subArray[1]] !== undefined) {
                                element1 = arrayElement[subArray[1]];
                            }
                        }
                        else {
                            element1 = arrayElement[preferedArrayNameArray[1]].toString().replace(/\./g, "").replace(/ /g, "");
                        }
                        arrayPath = element0 + "-" + element1;
                    }
                }
                else if (options.preferedArrayName && options.preferedArrayName.indexOf("/") !== -1) {
                    const preferedArrayNameArray = options.preferedArrayName.split("/");
                    const subElement = arrayElement[preferedArrayNameArray[0]];
                    if (subElement) {
                        arrayPath = subElement[preferedArrayNameArray[1]].toString().replace(/\./g, "").replace(/ /g, "");
                    }
                }
                else if (options.preferedArrayName && arrayElement[options.preferedArrayName]) {
                    arrayPath = arrayElement[options.preferedArrayName].toString().replace(/\./g, "");
                }
                if (options.forceIndex) {
                    if (options.zeroBasedArrayIndex === true) {
                        indexNumber -= 1;
                    }
                    if (options.disablePadIndex) {
                        index = indexNumber.toString();
                    }
                    else if (indexNumber < 10) {
                        // reassign index in case zeroBasedarrayIndex is enabled
                        index = `0${indexNumber}`;
                    }
                    arrayPath = key + index;
                }
                //special case array with 2 string objects
                if (!options.forceIndex &&
                    Object.keys(arrayElement).length === 2 &&
                    typeof Object.keys(arrayElement)[0] === "string" &&
                    typeof Object.keys(arrayElement)[1] === "string" &&
                    typeof arrayElement[Object.keys(arrayElement)[0]] !== "object" &&
                    typeof arrayElement[Object.keys(arrayElement)[1]] !== "object" &&
                    arrayElement[Object.keys(arrayElement)[0]] !== "null") {
                    let subKey = arrayElement[Object.keys(arrayElement)[0]];
                    let subValue = arrayElement[Object.keys(arrayElement)[1]];
                    if ((options.parseBase64 && this._isBase64(subValue)) ||
                        (options.parseBase64byIds && options.parseBase64byIds.includes(subKey))) {
                        try {
                            subValue = Buffer.from(subValue, "base64").toString("utf8");
                            if (this._isJsonString(subValue)) {
                                subValue = json_bigint_1.default.parse(subValue);
                            }
                        }
                        catch (error) {
                            this.log.warn(`Cannot parse base64 value ${subValue} for ${path + "." + subKey}: ${error}`);
                        }
                    }
                    const subName = Object.keys(arrayElement)[0] + " " + Object.keys(arrayElement)[1];
                    if (key) {
                        subKey = key + "." + subKey;
                    }
                    if (!this.alreadyCreatedObjects[path + "." + subKey] ||
                        this.objectTypes[path + "." + subKey] !== typeof subValue) {
                        let type = subValue !== null ? typeof subValue : "mixed";
                        if (this.objectTypes[path + "." + subKey] && this.objectTypes[path + "." + subKey] !== typeof subValue) {
                            this.log.debug(`Type of ${path + "." + subKey} changed from ${this.objectTypes[path + "." + subKey]} to ${typeof subValue}!`);
                            type = "mixed";
                        }
                        let states;
                        if (options.states && options.states[subKey]) {
                            states = options.states[subKey];
                            if (!states[subValue]) {
                                states[subValue] = subValue;
                            }
                        }
                        const common = {
                            name: subName,
                            role: this._getRole(subValue, options.write || false),
                            type: type,
                            write: options.write,
                            read: true,
                            states: states,
                        };
                        if (options.units && options.units[subKey]) {
                            common.unit = options.units[subKey];
                        }
                        //await this._createState(path + "." + subKey, common, options);
                        jsonObject.children.push({ path: path + "." + subKey, common: common, state: subValue });
                        continue;
                    }
                    //await this.adapter.setStateAsync(path + "." + subKey, subValue, true);
                    jsonObject.children.push({ path: path + "." + subKey, state: subValue });
                    continue;
                }
                const childObject = await this.deserializeAsync(path + "." + arrayPath, arrayElement, options);
                if (childObject) {
                    jsonObject.children.push(childObject);
                }
            }
            return jsonObject;
        }
        catch (error) {
            this.log.error("Cannot extract array " + path);
            this.log.error(error);
        }
        return undefined;
    }
    /**
     * Checks if a string is a valid base64 encoded string.
     *
     * @param {string} str - The string to be checked.
     * @returns {boolean} - Returns true if the string is a valid base64 encoded string, otherwise returns false.
     */
    _isBase64(str) {
        if (!str || typeof str !== "string") {
            return false;
        }
        const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))/;
        return base64regex.test(str);
    }
    /**
     * Checks if a given string is a valid JSON string.
     * @param {string} str - The string to be checked.
     * @returns {boolean} - Returns true if the string is a valid JSON string, otherwise false.
     */
    _isJsonString(str) {
        try {
            JSON.parse(str);
        }
        catch (e) {
            return false;
        }
        return true;
    }
    /**
     * Determines the role of an element based on its type and write mode.
     * @param {any} element - The element to determine the role for.
     * @param {boolean} write - Indicates whether the element is being written to.
     * @returns {string} - The role of the element.
     */
    _getRole(element, write) {
        if (typeof element === "boolean" && !write) {
            return "indicator";
        }
        if (typeof element === "boolean" && write) {
            return "switch";
        }
        if (typeof element === "number" && !write) {
            if (element && element.toString().length === 13) {
                if (element > 1500000000000 && element < 2000000000000) {
                    return "value.time";
                }
            }
            return "value";
        }
        if (typeof element === "number" && write) {
            return "level";
        }
        if (typeof element === "string") {
            return "text";
        }
        return "state";
    }
}
module.exports = Json2iob;
