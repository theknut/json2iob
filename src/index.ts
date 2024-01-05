import JSONbig from "json-bigint";

type Options = {
  write?: boolean; // Activate write for all states.
  forceIndex?: boolean; // Instead of trying to find names for array entries, use the index as the name.
  disablePadIndex?: boolean; // Disables padding of array index numbers if forceIndex = true
  zeroBasedArrayIndex?: boolean; // start array index from 0 if forceIndex = true
  channelName?: string; // Set name of the root channel.
  preferedArrayName?: string; // Set key to use this as an array entry name.
  preferedArrayDesc?: string;
  autoCast?: boolean;
  descriptions?: any;
  states?: any;
  units?: any;
  parseBase64?: boolean;
  parseBase64byIds?: string[];
  deleteBeforeUpdate?: boolean;
  removePasswords?: boolean;
  excludeStateWithEnding?: string[];
  makeStateWritableWithEnding?: string[];
  dontSaveCreatedObjects?: boolean;
};

type iobCommon = {
  name?: string;
  role: string;
  type: string;
  write: boolean | undefined;
  read: boolean;
  states?: any;
  unit?: string;
};


type JsonObjectOptions = {
  write?: boolean; // make state writeable
};

type Mode = ("create" | "update" | "array" | "skipEnding" | "skipPassword" | "skipFunction");

class JsonObject {
  path: string;
  state: any;
  children: JsonObject[];
  common: iobCommon | undefined;
  mode: Mode;
  options: JsonObjectOptions | undefined;

  /**
   * Initialize an object to be created / updated
   * @param path Target path to the object or state
   * @param state Value of the state
   * @param children Child objects / states
   */
  constructor(path: string, state?: any | undefined, mode?: Mode | undefined, common?: iobCommon, options: JsonObjectOptions = { write: false}, children: JsonObject[] = []) {
    this.path = path;
    this.state = state;
    this.children = children;
    this.common = common;
    this.options = options;

    if (!mode) {
      throw new Error("Parameter mode has not been provided or invalid value");
    }
    this.mode = mode;
  }
}

// class SkippedJsonObject {
//   reason: string;
//   object: JsonObject;

//   /**
//    * Initialize an object which will not be created due to the reason specified
//    * @param reason Reason why this object will be skipped
//    * @param object Object which would have been created
//    */
//   constructor(reason: "ending" | "password" | "function", object: JsonObject) {
//     this.reason = reason;
//     this.object = object;
//   }
// }

interface ILogProvider {
  debug(message: string | unknown): void;
  warn(message: string | unknown): void;
  error(message: string | unknown): void;
}

class Json2iob {
  private adapter: any;
  private log : ILogProvider;
  private alreadyCreatedObjects : Record<string, JsonObject> = {}
  private objectTypes: any;
  private forbiddenCharsRegex: RegExp;

  constructor(adapter?: any) {
    this.adapter = adapter;
    this.log = this.adapter ?? <ILogProvider> console;
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
  async deserializeAsync(path: string, element: any, options: Options = { write: false }) : Promise<JsonObject | undefined> {
    if (path === null || path === undefined || path === "") {
      this.log.debug(`Cannot extract to path '${path}'`);
      return undefined;
    }
    
    if (element === null || element === undefined) {
      this.log.debug(`Cannot extract element '${element}' to path '${path}'`);
      return undefined;
    }

    if (!options || !options.write) {
      if (!options) {
        options = { write: false };
      } else {
        options["write"] = false;
      }
    }

    path = path.toString().replace(this.forbiddenCharsRegex, "_");
    const pathSegments = path.split(".");
    const lastPathElement = pathSegments.pop();

    if (!lastPathElement) {
      this.log.warn(`Invalid path ${path}`);
      return undefined;
    } 

    const jsonObjectOptions = <JsonObjectOptions> { write: options.write };

    if (this._pathHasEnding(lastPathElement?.toLowerCase(), options.excludeStateWithEnding)) {
      return new JsonObject(path, element, "skipEnding", undefined, jsonObjectOptions);
    }
    
    if (options.removePasswords && path.toString().toLowerCase().includes("password")) {
      return new JsonObject(path, element, "skipPassword", undefined, jsonObjectOptions);
    }   

    if (this._isJsonString(element) && options.autoCast) {
      element = JSONbig.parse(element);
    }

    if (typeof element === "function") {
      return new JsonObject(path, element, "skipFunction", undefined, jsonObjectOptions)
    }

    const isStringElement = typeof element === "string";
    const isNumberElement = typeof element === "number";
    const isBooleanElement = typeof element === "boolean";
    const stateAlreadyCreated = this.alreadyCreatedObjects[path] !== undefined;

    if (isStringElement || isNumberElement || isBooleanElement) {
      //remove ending . from path
      if (path.endsWith(".")) {
        path = path.slice(0, -1);
      }

      if (this._shouldParseBase64(path, element, options)) {
        try {
          element = Buffer.from(element, "base64").toString("utf8");
          if (this._isJsonString(element)) {
            element = JSONbig.parse(element);
          }
        } catch (error) {
          this.log.warn(`Cannot parse base64 for ${path}: ${error}`);
        }
      }

      const makeStateWriteable = this._pathHasEnding(lastPathElement?.toLowerCase(), options.makeStateWritableWithEnding);
      const stateIsWriteable = options.write || makeStateWriteable;
      if (makeStateWriteable) {
        this.log.debug(`make state with ending writable: ${path}`);
      }
      let objectName = lastPathElement;
      if (options.descriptions && options.descriptions[lastPathElement]) {
        objectName = options.descriptions[lastPathElement];
      }

      const common: iobCommon = {
        name: objectName,
        role: this._getRole(element, stateIsWriteable),
        write: stateIsWriteable,
        read: true,
        type: typeof element,
        states: undefined
      };

      if (!stateAlreadyCreated || this._stateTypeChanged(path, element, this.objectTypes)) {
        let type = element !== null ? typeof element : "mixed";
        if (this.objectTypes[path]) {
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

        common.type = type;
        common.states = states;
        common.unit = options.units?.[path];

        //await this._createState(path, common, options);
        return new JsonObject(path, element, "create", common, {write: stateIsWriteable});
      }
      //await this.adapter.setStateAsync(path, element, true);
      return new JsonObject(path, element, "update", common, jsonObjectOptions);
    }

    if (Array.isArray(element)) {
      const result = await this._extractArray(element, "", path, options);
      return result;
    }

    if (typeof element === "object") {      
      const jsonObject = new JsonObject(path, undefined, "create", undefined, jsonObjectOptions);

      const objectKeys = Object.keys(element);
      for (const key of objectKeys) {      
        const childObject = await this.deserializeAsync(path + "." + key, element[key], options);
        if (childObject) {
          jsonObject.children.push(childObject);
        }
      }

      return jsonObject;
    }    
    
    this.log.error(`Unsupported element type '${typeof element}'`);
    return undefined;
  }
  
  async writeAsync(object: JsonObject, options: Options = { write: false }) : Promise<void> {
    if (options.deleteBeforeUpdate && this.alreadyCreatedObjects[object.path]) {
      this.log.debug(`Deleting ${object.path} before update`);
      for (const key in this.alreadyCreatedObjects) {
        if (key.startsWith(object.path)) {
          delete this.alreadyCreatedObjects[key];
        }
      }
      await this.adapter.delObjectAsync(object.path, { recursive: true });
    }

    if (!this.alreadyCreatedObjects[object.path]) {
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
            this.alreadyCreatedObjects[object.path] = object;
          }
          options.channelName = undefined;
          options.deleteBeforeUpdate = undefined;
        })
        .catch((error: any) => {
          this.adapter.log.error(error);
        });
    }

    if (object.mode.startsWith("skip")) {
      this.log.debug(`Skipping ${object.path} (Reason '${object.mode}')`)
      return;
    } else if (object.mode == "create"
        || !this.alreadyCreatedObjects[object.path]) {
      this._createState(object, options);
      return;
    }

    await this.adapter.setStateAsync(object.path, object.state, true);

    for (const childObject of object.children) {
      await this.writeAsync(childObject, options);
    }
  }

  async parse(path: string, element: any, options: Options = { write: false }): Promise<void> {
    try {
      const deserializedObject = await this.deserializeAsync(path, element);

      if (!deserializedObject) {
        return;
      }

      await this.writeAsync(deserializedObject, options);
    } catch (error) {
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
  private async _createState(object: JsonObject, options: Options = {}): Promise<void> {
    await this.adapter
      .extendObjectAsync(object.path, {
        type: "state",
        common: object.common,
        native: {},
      })
      .then(() => {
        if (!options.dontSaveCreatedObjects) {
          this.alreadyCreatedObjects[object.path] = object;
        }

        if (object.common) {
          this.objectTypes[object.path] = object.common.type;
        }
      })
      .catch((error: any) => {
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
  private async _extractArray(element: any, key: string, path: string, options: Options): Promise<JsonObject | undefined> {
    try {
      if (key) {
        element = element[key];
      }

      const jsonObjectOptions = <JsonObjectOptions> { write: options.write };
      const jsonObject = new JsonObject(path + (this._isNullOrEmpty(key) ? "" : ("." + key)), undefined, "array", undefined, jsonObjectOptions);

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
            element[index] = JSONbig.parse(arrayElement);
            arrayElement = element[index];
          } catch (error) {
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
            } else {
              arrayPath = arrayElement[keyName];
            }
          }
          
          if (keyName.endsWith("Name")) {
            if (arrayElement[keyName] && arrayElement[keyName].replace) {
              arrayPath = arrayElement[keyName].replace(/\./g, "");
            } else {
              arrayPath = arrayElement[keyName];
            }
          }
        }

        if (arrayElement.id) {
          if (arrayElement.id.replace) {
            arrayPath = arrayElement.id.replace(/\./g, "");
          } else {
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
              } else if (arrayElement[subArray[1]] !== undefined) {
                element1 = arrayElement[subArray[1]];
              }
            } else {
              element1 = arrayElement[preferedArrayNameArray[1]].toString().replace(/\./g, "").replace(/ /g, "");
            }
            arrayPath = element0 + "-" + element1;
          }
        } else if (options.preferedArrayName && options.preferedArrayName.indexOf("/") !== -1) {
          const preferedArrayNameArray = options.preferedArrayName.split("/");
          const subElement = arrayElement[preferedArrayNameArray[0]];
          if (subElement) {
            arrayPath = subElement[preferedArrayNameArray[1]].toString().replace(/\./g, "").replace(/ /g, "");
          }
        } else if (options.preferedArrayName && arrayElement[options.preferedArrayName]) {
          arrayPath = arrayElement[options.preferedArrayName].toString().replace(/\./g, "");
        }

        if (options.forceIndex) {
          if (options.zeroBasedArrayIndex === true) {
            indexNumber -= 1;
          }

          if (options.disablePadIndex) {
            index = indexNumber.toString();
          } else {
            // reassign index in case zeroBasedarrayIndex is enabled
            index = `${indexNumber < 10 ? "0" : ""}${indexNumber}`;
          }

          arrayPath = (this._isNullOrEmpty(key) ? "" : key + ".") + index;
        }
        //special case array with 2 string objects
        if (
          !options.forceIndex &&
          Object.keys(arrayElement).length === 2 &&
          typeof Object.keys(arrayElement)[0] === "string" &&
          typeof Object.keys(arrayElement)[1] === "string" &&
          typeof arrayElement[Object.keys(arrayElement)[0]] !== "object" &&
          typeof arrayElement[Object.keys(arrayElement)[1]] !== "object" &&
          arrayElement[Object.keys(arrayElement)[0]] !== "null"
        ) {
          let subKey = arrayElement[Object.keys(arrayElement)[0]];
          let subValue = arrayElement[Object.keys(arrayElement)[1]];

          if (
            (options.parseBase64 && this._isBase64(subValue)) ||
            (options.parseBase64byIds && options.parseBase64byIds.includes(subKey))
          ) {
            try {
              subValue = Buffer.from(subValue, "base64").toString("utf8");
              if (this._isJsonString(subValue)) {
                subValue = JSONbig.parse(subValue);
              }
            } catch (error) {
              this.log.warn(`Cannot parse base64 value ${subValue} for ${path + "." + subKey}: ${error}`);
            }
          }

          const subName = Object.keys(arrayElement)[0] + " " + Object.keys(arrayElement)[1];
          if (key) {
            subKey = key + "." + subKey;
          }
          if (
            !this.alreadyCreatedObjects[path + "." + subKey] ||
            this.objectTypes[path + "." + subKey] !== typeof subValue
          ) {
            let type = subValue !== null ? typeof subValue : "mixed";
            if (this.objectTypes[path + "." + subKey] && this.objectTypes[path + "." + subKey] !== typeof subValue) {
              this.log.debug(
                `Type of ${path + "." + subKey} changed from ${
                  this.objectTypes[path + "." + subKey]
                } to ${typeof subValue}!`,
              );
              type = "mixed";
            }
            let states;
            if (options.states && options.states[subKey]) {
              states = options.states[subKey];
              if (!states[subValue]) {
                states[subValue] = subValue;
              }
            }

            const makeStateWriteable = this._pathHasEnding(subName?.toLowerCase(), options.makeStateWritableWithEnding);
            const stateIsWriteable = options.write || makeStateWriteable;
            if (makeStateWriteable) {
              this.log.debug(`make state with ending writable: ${path}`);
            }

            const common: iobCommon = {
              name: subName,
              role: this._getRole(subValue, stateIsWriteable),
              type: type,
              write: stateIsWriteable,
              read: true,
              states: states,
            };
            if (options.units && options.units[subKey]) {
              common.unit = options.units[subKey];
            }
            //await this._createState(path + "." + subKey, common, options);
            jsonObject.children.push(new JsonObject(path + "." + subKey, subValue, "create", common, jsonObjectOptions));
            continue;
          }
          //await this.adapter.setStateAsync(path + "." + subKey, subValue, true);
          jsonObject.children.push(new JsonObject(path + "." + subKey, subValue, "update", undefined, jsonObjectOptions));
          continue;
        }

        const childObject = await this.deserializeAsync(path + "." + arrayPath, arrayElement, options);
        if (childObject) {
          jsonObject.children.push(childObject);
        }
      }

      return jsonObject;
    } catch (error) {
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
  private _isBase64(str: string): boolean {
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
  private _isJsonString(str: string): boolean {
    try {
      JSON.parse(str);
    } catch (e) {
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
  private _getRole(element: any, write: boolean): "indicator" | "switch" | "value.time" | "value" | "level" | "text" | "state" {
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

  /**
   * Checks if a string is null / undefined or empty
   * @param str Test candiate
   * @returns True if str is null or undefined or empty, otherwise false
   */
  private _isNullOrEmpty(str: string | undefined): boolean {
    return !str || str.length === 0;
  }

  /**
   * 
   * @param path Path to check
   * @param endings Path endings to exclude
   * @returns True if the path ends with any ending provided in endings
   */
  private _pathHasEnding(path: string | undefined, endings: string[] | undefined): boolean {
    if (this._isNullOrEmpty(path) || !endings) {
      return false;
    }

    for (const excludeEnding of endings) {
      if (path!.endsWith(excludeEnding)) {
        return true;
      }
    }

    return false;
  }

  private _shouldParseBase64(path: string, element: any, options: Options) {
    return typeof element === "string" && (options.parseBase64 && this._isBase64(element)) || (options.parseBase64byIds && options.parseBase64byIds.includes(path));
  }

  private _stateTypeChanged(path: string, element: any, objectTypes: any) {
    return objectTypes[path] !== typeof element;
  }
}

export { Json2iob, JsonObject, iobCommon, Options };