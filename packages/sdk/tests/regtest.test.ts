import {
  Amount,
  encode_input_for_utxo,
  encode_outpoint_source_id,
  encode_output_transfer, encode_signed_transaction,
  encode_transaction, encode_witness, encode_witness_no_signature, make_default_account_privkey, make_private_key,
  Network, SignatureHashType, SourceId,
} from '@mintlayer/wasm-lib';

test('build tx fro regtest', async () => {

  const s = 'efcdf78d8c51794c01471e473bbfbd51db60559a63ece2a7b29114357672e845';
  const uint8array = new Uint8Array(s.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  const source_id = encode_outpoint_source_id(uint8array, SourceId.Transaction);
  const input = encode_input_for_utxo(source_id, 0)
  const output = encode_output_transfer(Amount.from_atoms('10000000000000'), 'rmt1q9rtv4aruzc4g0rym87kde00fx48j7ughs9lr8mt', Network.Regtest);

  const t = encode_transaction(
    input,
    output,
    BigInt(0),
  )

  const t_hex = Array.from(new Uint8Array(t)).map((b) => b.toString(16).padStart(2, '0')).join('');
  console.log('t_hex', t_hex);

  const witness = encode_witness_no_signature()
  const signed_tx = encode_signed_transaction(t, witness);

  console.log('signed_tx', signed_tx);

  const t_s_hex = Array.from(new Uint8Array(signed_tx)).map((b) => b.toString(16).padStart(2, '0')).join('');
  console.log('t_s_hex', t_s_hex);
})
