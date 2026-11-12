// Same interop as the SDK Jest shim. build.mjs copies the real Node bindings
// beside the executable; the deployed application never imports test files.
const path = require('node:path');
const wasm = require(path.join(__dirname, 'wasm-node', 'wasm_wrappers.js'));
module.exports = { __esModule: true, ...wasm, default: async function initWasm() {} };
