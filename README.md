
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

´´´
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

    await this.json2iob.parse(path, json, { forceIndex: true, write: true, descriptions: this.descriptions, states: this.states });

´´´



### Changelog

2.2.0 Add base64 decoding
2.1.0 Add states definition
2.0.2 Add type check before setState and change type to mixed if its differs from creation type to the current value type