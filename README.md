# Json2iob

Convert json objects into ioBroker states

## Usage

const Json2iob = require("json2iob");

this.json2iob = new Json2iob(this);

this.json2iob.parse(path, json, { forceIndex: true });

### Options:

write //set common write variable to true

forceIndex //instead of trying to find names for array entries, use the index as the name

channelName //set name of the root channel

preferedArrayName //set key to use this as an array entry name

preferedArrayDec //set key to use this as an array entry description

autoCast (true false) // make JSON.parse to parse numbers correctly

descriptions: Object of names for state keys
Object of states to create for an id, new entries via json will be added automatically to the states

states: Object of states to create for an id, new entries via json will be added automatically to the states

parseBase64: (true false) // parse base64 encoded strings to utf8

parseBase64byIds: Array of ids to parse base64 encoded strings to utf8

deleteBeforeUpdate: Delete channel before update,

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
