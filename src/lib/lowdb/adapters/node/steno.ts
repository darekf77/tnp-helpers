import { rename, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// Returns a temporary file
// Example: for /some/file will return /some/.file.tmp
function getTempFilename(file) {
    const f = file instanceof URL ? fileURLToPath(file) : file.toString();
    return join(dirname(f), `.${basename(f)}.tmp`);
}
// Retries an asynchronous operation with a delay between retries and a maximum retry count
async function retryAsyncOperation(fn, maxRetries, delayMs) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        }
        catch (error) {
            if (i < maxRetries - 1) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
            else {
                throw error; // Rethrow the error if max retries reached
            }
        }
    }
}
export class Writer {
    __filename;
    __tempFilename;
    __locked = false;
    __prev = null;
    __next = null;
    __nextPromise = null;
    __nextData = null;
    // File is locked, add data for later
    __add(data) {
        // Only keep most recent data
        this.__nextData = data;
        // Create a singleton promise to resolve all next promises once next data is written
        this.__nextPromise ||= new Promise((resolve, reject) => {
            this.__next = [resolve, reject];
        });
        // Return a promise that will resolve at the same time as next promise
        return new Promise((resolve, reject) => {
            this.__nextPromise?.then(resolve).catch(reject);
        });
    }
    // File isn't locked, write data
    async __write(data) {
        // Lock file
        this.__locked = true;
        try {
            // Atomic write
            await writeFile(this.__tempFilename, data, 'utf-8');
            await retryAsyncOperation(async () => {
                await rename(this.__tempFilename, this.__filename);
            }, 10, 100);
            // Call resolve
            this.__prev?.[0]();
        }
        catch (err) {
            // Call reject
            if (err instanceof Error) {
                this.__prev?.[1](err);
            }
            throw err;
        }
        finally {
            // Unlock file
            this.__locked = false;
            this.__prev = this.__next;
            this.__next = this.__nextPromise = null;
            if (this.__nextData !== null) {
                const nextData = this.__nextData;
                this.__nextData = null;
                await this.write(nextData);
            }
        }
    }
    constructor(filename) {
        this.__filename = filename;
        this.__tempFilename = getTempFilename(filename);
    }
    async write(data) {
        return this.__locked ? this.__add(data) : this.__write(data);
    }
}
