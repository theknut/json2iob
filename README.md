![Tests](https://github.com/theknut/json2iob/actions/workflows/tests.yml/badge.svg)

# Json2iob

This package converts a json objects into ioBroker states. It can handle nested array and obects. It will also generated automaticly the type and roles based on the type of value.

## Usage

In a ioBroker Adapter

```
const Json2iob = require("json2iob");

this.json2iob = new Json2iob(this);

this.json2iob.parse(path, json, { forceIndex: true });
```

### Options:

```
write //set common write variable to true

forceIndex //instead of trying to find names for array entries, use the index as the name.
Otherweise the value of a key with id, name, label, labelText will use a name. This is key overriden by preferedArrayName

disablePadIndex //disables padding of array index numbers if forceIndex = true

zeroBasedArrayIndex //start array index from 0 if forceIndex = true

preferedArrayName //set key to use this as an array entry name

preferedArrayDec //set key to use this as an array entry description

channelName //set name of the root channel

autoCast (true false) // make JSON.parse on all values to parse numbers correctly

descriptions: //Object of names for state keys

states: // Object of states to create for an id, new entries via json will be added automatically to the states

units: // Object of units to create for an id.

parseBase64: (true false) // parse base64 encoded strings to utf8

parseBase64byIds: //Array of ids to parse base64 encoded strings to utf8

deleteBeforeUpdate: //Delete channel before update,

removePasswords: // remove the values from password keys

dontSaveCreatedObjects: //create objects but do not save them to alreadyCreatedObjects this leads to recreating at every parsing

excludeStateWithEnding: //Array of strings to exclude states with this ending

makeStateWritableWithEnding: //Array of strings to make states with this ending writable
```

```javascript
this.descriptions = {
  1: "POWER",
  2: "PLAY_PAUSE",
  3: "DIRECTION",
  5: "WORK_MODE",
};
this.states = {
  3: {
    FORWARD: "forward",
    BACKWARD: "back",
    LEFT: "left",
    RIGHT: "right",
  },
  5: {
    AUTO: "auto",
    SMALL_ROOM: "SmallRoom",
    SPOT: "Spot",
    EDGE: "Edge",
    NO_SWEEP: "Nosweep",
  },
};

await this.json2iob.parse(path, json, {
  forceIndex: true,
  write: true,
  descriptions: this.descriptions,
  states: this.states,
});
```

### Force recreation after manual deletion

```javascript
await this.delObjectAsync(id + ".clients", { recursive: true });
for (const key in this.json2iob.alreadyCreatedObjects) {
  if (key.startsWith(id + ".clients")) {
    delete this.json2iob.alreadyCreatedObjects[key];
  }
}
```

### Changelog

2.6.0 convert to TypeScript and add unit option

2.5.2 add forbidden charackter replacing

2.4.11 Add contidiontal writing with makeStateWritableWithEnding

2.4.9 Add time stamp detection

2.4.8 Add autocast to array elements

2.4.7 Add exclude filter

2.4.2 Fix for numeric id

2.4.0 Add deletePasswords, fix functions and null values

2.3.0 Add deleteBeforeUpdate

2.2.0 Add base64 decoding

2.1.0 Add states definition

2.0.2 Add type check before setState and change type to mixed if its differs from creation type to the current value type