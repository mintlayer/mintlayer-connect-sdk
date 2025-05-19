const wasm = require('../pkg-node');

async function initWasm() {
  return;
}

module.exports = {
  __esModule: true, // 👈 магия для Jest/TS чтобы `import default` работал
  ...wasm,
  default: initWasm,
};
