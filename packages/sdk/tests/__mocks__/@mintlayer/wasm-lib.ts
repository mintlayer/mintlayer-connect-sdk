const wasm = require('../pkg-node')

async function initWasm() {
  return
}

module.exports = {
  __esModule: true,
  ...wasm,
  default: initWasm,
}
