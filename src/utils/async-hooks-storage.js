const uuidV4 = require('uuid/v4');
const fs = require('fs');
const asyncHooks = require('async_hooks');

// Main storage object
const asyncHooksStorage = { entries: {} };

// Async Hooks list
const asyncHooksList = {};

// Log flag
let hasLog = false;

// Graph flag
let hasGraph = false;

// Graph persistence flag
let graphPersistence = false;

// Debug graph
const graph = [];

// Async Hooks Entry class with automatic UUIDV4 ids
class AsyncHooksEntry {
  constructor(type) {
    this.id = uuidV4();
    this.type = type;
    this.context = new Map();
  }
}

// eslint-disable-next-line
function syncLog(logStr, graphStr, asyncId, remove) {
  if (hasLog) {
    fs.writeSync(1, `${logStr}\n`);
  }
  if (hasGraph) {
    if (!graphPersistence && remove) {
      delete graph[asyncId];
    } else {
      // eslint-disable-next-line no-lonely-if
      if (graph[asyncId]) {
        graph[asyncId] += graphStr;
      } else {
        graph[asyncId] = graphStr;
      }
    }
  }
}

// Check if a specifc Async Hook Resource already exists
function existAsyncHooksEntry(asyncId) {
  return (typeof asyncHooksStorage.entries[asyncId] !== 'undefined');
}

// Initialize a new Async Hook Resource
function init(asyncId, type, triggerAsyncId) {
  if (existAsyncHooksEntry(triggerAsyncId)) {
    // Attach the asyncId entry with the parent entry
    asyncHooksStorage.entries[asyncId] = asyncHooksStorage.entries[triggerAsyncId];
  }
  syncLog(`init           ${asyncId}\t${triggerAsyncId}\t${type}`, `[${triggerAsyncId}] ${type} INIT `, asyncId, false);
}

// When an asynchronous operation is initiated or completes a callback is called to
// notify the user - the before callback is called just before said callback is executed
function before(asyncId) {
  if (existAsyncHooksEntry(asyncId)) {
    asyncHooksList[asyncId] = asyncHooksStorage.currentEntry;
    asyncHooksStorage.currentEntry = asyncHooksStorage.entries[asyncId];
  }
  syncLog(`before         ${asyncId}`, 'BEFORE ', asyncId, false);
}

// Called immediately after the callback specified in before is completed
function after(asyncId) {
  if (existAsyncHooksEntry(asyncId)) {
    asyncHooksStorage.currentEntry = asyncHooksList[asyncId];
  }
  syncLog(`after          ${asyncId}`, 'AFTER ', asyncId, false);
}

// Called after the resource corresponding to asyncId is destroyed
function destroy(asyncId) {
  if (existAsyncHooksEntry(asyncId)) {
    delete asyncHooksStorage.entries[asyncId];
    delete asyncHooksList[asyncId];
  }
  syncLog(`destroy        ${asyncId}`, 'DESTROY ', asyncId, true);
}

// Called when the resolve function passed to the Promise constructor is invoked
function promiseResolve(asyncId) {
  syncLog(`promiseResolve ${asyncId}`, 'PROMISERESOLVE ', asyncId, false);
}

// Enable the callbacks for a given AsyncHook instance
asyncHooksStorage.enable = (bLog = false, bGraph = false, bPersistence = false) => {
  hasLog = bLog;
  hasGraph = bGraph;
  graphPersistence = bPersistence;
  asyncHooks.createHook({
    after, before, destroy, init, promiseResolve,
  }).enable();
};

// Create new Entry into the asyncHooksStorage and link with the currentEntry property
asyncHooksStorage.newEntry = (type) => {
  asyncHooksStorage.currentEntry = new AsyncHooksEntry(type);
  asyncHooksStorage.entries[asyncHooks.executionAsyncId()] = asyncHooksStorage.currentEntry;

  return asyncHooksStorage.currentEntry;
};

// Get an asyncHookStorage entry or return undefined
asyncHooksStorage.getEntry = key => ((asyncHooksStorage.currentEntry
  && asyncHooksStorage.currentEntry.context)
  ? asyncHooksStorage.currentEntry.context.get(key) : undefined);

// Set a new asyncHookStorage entry
asyncHooksStorage.setEntry = (key, value) => {
  if (asyncHooksStorage.currentEntry && asyncHooksStorage.currentEntry.context) {
    asyncHooksStorage.currentEntry.context.set(key, value);

    return true;
  }

  return false;
};

// Get execution graph
asyncHooksStorage.getGraph = () => graph;

// Print graph
asyncHooksStorage.showGraph = () => {
  for (let counter = 0; counter < graph.length; counter += 1) {
    if (graph[counter]) fs.writeSync(1, `[${counter}] ${graph[counter]}\n`);
  }
};

module.exports = asyncHooksStorage;
