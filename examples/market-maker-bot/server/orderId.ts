import { Network, get_order_id } from '@mintlayer/wasm-lib';
import { Transaction } from '@mintlayer/sdk';

export function orderIdFromInputs(inputs: Uint8Array[], network: 'testnet' | 'mainnet'): string {
  const bytes = new Uint8Array(inputs.reduce((size, input) => size + input.length, 0));
  let offset = 0;
  for (const input of inputs) {
    bytes.set(input, offset);
    offset += input.length;
  }
  return get_order_id(bytes, network === 'testnet' ? Network.Testnet : Network.Mainnet);
}
export function orderIdFromJson(inputs: unknown[], network: 'testnet' | 'mainnet', height: number): string {
  // Encoding remains in SDK/WASM; this only joins the SDK-encoded input bytes.
  const encoded = new Transaction({ network, currentBlockHeight: height }).getTransactionBINrepresentation(
    { inputs, outputs: [] } as any,
    network === 'testnet' ? Network.Testnet : Network.Mainnet,
    height,
  );
  return orderIdFromInputs(encoded.inputs, network);
}
