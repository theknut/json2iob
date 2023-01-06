
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