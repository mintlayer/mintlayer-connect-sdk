jest.mock('@mintlayer/wasm-lib')

import initWasm, { encode_outpoint_source_id } from '@mintlayer/wasm-lib'

test('wasm-lib loads', async () => {
  await initWasm()
  expect(typeof encode_outpoint_source_id).toBe('function')
})
