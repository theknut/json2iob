import * as utils from "@iobroker/adapter-core";

interface ILogProvider {
  debug(message: string | unknown): void;
  warn(message: string | unknown): void;
  error(message: string | unknown): void;
  silly(message: string | unknown): void;
}

class Log implements ILogProvider {
    
    sillyMessages: string[] = [];
    debugMessages: string[] = [];
    warnMessages: string[] = [];
    errorMessages: string[] = [];

    silly(message: string) {
        this.sillyMessages.push(message);
    }

    debug(message: string) {
        this.debugMessages.push(message);
    }

    warn(message: string) {
        this.warnMessages.push(message);
    }

    error(message: string) {
        this.errorMessages.push(message);
    }
}

export class AdapterMock {
    log: ILogProvider;
    FORBIDDEN_CHARS: RegExp | undefined;
    states : Record<string, any> = {};
    objects : Record<string, ioBroker.AnyObject> = {};

    constructor(forbiddenChars?: RegExp) {
        this.log = new Log();
        this.FORBIDDEN_CHARS = forbiddenChars;
    }

    async setStateAsync(
        id: string,
        state: ioBroker.State | ioBroker.StateValue | ioBroker.SettableState,
        ack?: boolean
    ): ioBroker.SetStatePromise {
        const item = this.states[id]
        const split = id.split(".");
        const name = split[split.length - 1];
        const pathWithoutName = id.replace(`.${name}`, ``);

        if (!this.objects[pathWithoutName]) {
            throw new ObjectNotExistsError(`Object ${pathWithoutName} does not exist for ${id}`, pathWithoutName);
        } else if (!item) {
            throw new StateNotExistsError(`State ${id} does not exist`, id);
        }

        this.states[id] = { state, ack };
        return <ioBroker.SetStatePromise>{  };
    }

    async extendObjectAsync(
        id: string,
        objPart: ioBroker.AnyObject,
        options?: ioBroker.ExtendObjectOptions
    ): ioBroker.SetObjectPromise {
        const item = this.objects[id]
        if (!item) {
            throw new Error(`Object ${id} does not exist`);
        }
        this.objects[id] = objPart;

        return (<ioBroker.SetObjectPromise>{});
    }

    async setObjectNotExistsAsync<T extends string>(
        id: T,
        obj: ioBroker.AnyObject
    ): ioBroker.SetObjectPromise {
        this.objects[id] = obj;
        
        return (<ioBroker.SetObjectPromise>{});
    }

    async delObjectAsync(id: string, options?: ioBroker.DelObjectOptions): Promise<void> {
        for (const key in this.objects) {
            const item = this.objects[key];

            if (item?._id
                && options?.recursive
                    ? item._id.startsWith(id)
                    : item._id === id) {
                delete this.objects[key];

                if (options?.recursive) {
                    for (const stateKey in this.states) {
                        const stateItem = this.states[stateKey];
                        
                        if (stateItem?._id &&  stateItem._id.startsWith(id)) {
                            delete this.states[key];
                        }
                    }
                }
            }
        }
    }
}

export class StateNotExistsError extends Error {
    id : string;

    constructor(message: string, id: string) {
        super(message);
        this.id = id;    
    }
}

export class ObjectNotExistsError extends Error {
    id : string;

    constructor(message: string, id: string) {
        super(message);
        this.id = id;    
    }
}