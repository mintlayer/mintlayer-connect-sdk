import {
  Transaction,
} from '../src/transaction';

const CHANGE_ADDR = 'tmt1qycauu4rc92v80vpjrtkqjv2utr7jl5ygve28sdt';
const RECIPIENT = 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc';
const COIN_UTXO = {
  outpoint: {
    index: 0,
    input_type: 'UTXO',
    source_id: '5b43a37eb8c73e981c9a718c52706a897dac9b0093182da9af2997803c1508f1',
    source_type: 'Transaction',
  },
  utxo: {
    destination: CHANGE_ADDR,
    type: 'Transfer',
    value: {
      amount: {
        atoms: '2000000000000',
        decimal: '20',
      },
      type: 'Coin',
    },
  },
};

const TOKEN_ID = 'tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq';
const TOKEN_UTXO = {
  outpoint: {
    index: 1,
    input_type: 'UTXO',
    source_id: 'aa43a37eb8c73e981c9a718c52706a897dac9b0093182da9af2997803c1508f1',
    source_type: 'Transaction',
  },
  utxo: {
    destination: CHANGE_ADDR,
    type: 'Transfer',
    value: {
      type: 'TokenV1',
      token_id: TOKEN_ID,
      amount: {
        atoms: '1000',
        decimal: '10',
      },
    },
  },
};

const NFT_TOKEN_ID = 'tmltk1hulyp284e3kc522ta435wyckrqy4j4842perueyge6ctjlp2mpds65mcx8';
const NFT_UTXO = {
  outpoint: {
    index: 2,
    input_type: 'UTXO',
    source_id: 'bb43a37eb8c73e981c9a718c52706a897dac9b0093182da9af2997803c1508f1',
    source_type: 'Transaction',
  },
  utxo: {
    destination: CHANGE_ADDR,
    type: 'IssueNft',
    token_id: NFT_TOKEN_ID,
    data: {
      name: { hex: '', string: 'NFT' },
      ticker: { hex: '', string: 'NFT' },
      description: { hex: '', string: '' },
      media_hash: { hex: '', string: '' },
      media_uri: { hex: '', string: '' },
      icon_uri: { hex: '', string: '' },
      additional_metadata_uri: { hex: '', string: '' },
      creator: null,
    },
  },
};

test('single transfer output', () => {
  const transaction = new Transaction();

  transaction.addOutput(transaction.transfer(RECIPIENT, '10'));
  transaction.setChangeAddress(CHANGE_ADDR);
  transaction.withUTXO(COIN_UTXO);

  transaction.build();

  expect(transaction).toBeDefined();
});

test('double transfer output', () => {
  const transaction = new Transaction();

  transaction.addOutput(transaction.transfer(RECIPIENT, '10'));
  transaction.addOutput(transaction.transfer(RECIPIENT, '12'));
  transaction.withUTXO(COIN_UTXO);
  transaction.setChangeAddress(CHANGE_ADDR);

  transaction.build();

  expect(transaction).toBeDefined();
});

test('coin transfer exposes a positive fee on the built transaction', () => {
  const transaction = new Transaction()
    .setChangeAddress(CHANGE_ADDR)
    .withUTXO(COIN_UTXO)
    .addOutput(new Transaction().transfer(RECIPIENT, '10'))
    .build();

  const json = transaction.json();
  expect(json.fee).toBeDefined();
  expect(json.fee).toHaveProperty('atoms');
  expect(json.fee).toHaveProperty('decimal');
  // @ts-ignore
  expect(BigInt(json.fee!.atoms)).toBeGreaterThan(0n);

  const fee = transaction.getFee();
  expect(fee.atoms).toBe(json.fee!.atoms);
  expect(fee.decimal).toBe(json.fee!.decimal);

  expect(typeof json.id).toBe('string');
  expect(json.id.length).toBeGreaterThan(0);
  expect(transaction.hex().length).toBeGreaterThan(0);
});

test('token transfer produces token change and a fee', () => {
  const tx = new Transaction()
    .setChangeAddress(CHANGE_ADDR)
    .withUTXO([COIN_UTXO, TOKEN_UTXO]);

  tx.addOutput(tx.transferToken(RECIPIENT, '400', TOKEN_ID));
  tx.build();

  const json = tx.json();

  // fee is exposed and non-zero
  // @ts-ignore
  expect(BigInt(json.fee!.atoms)).toBeGreaterThan(0n);

  // a coin input was selected (to pay the fee) and at least one token input
  const coinInputs = json.inputs.filter(
    (i: any) => i.utxo?.value?.type === 'Coin',
  );
  const tokenInputs = json.inputs.filter(
    (i: any) => i.utxo?.value?.type === 'TokenV1',
  );
  expect(coinInputs.length).toBeGreaterThan(0);
  expect(tokenInputs.length).toBeGreaterThan(0);

  // token change returns 600 atoms back to the change address
  const tokenChange = json.outputs.find(
    (o: any) =>
      o.type === 'Transfer' &&
      o.destination === CHANGE_ADDR &&
      o.value?.type === 'TokenV1' &&
      o.value?.token_id === TOKEN_ID,
  ) as any;
  expect(tokenChange).toBeDefined();
  expect(tokenChange.value.amount.atoms).toBe('600');
});

test('network parameter reaches the encoder (mainnet rejects testnet addresses)', () => {
  // Baseline: testnet builder with testnet addresses succeeds.
  const testnetTx = new Transaction({ network: 'testnet' })
    .setChangeAddress(CHANGE_ADDR)
    .withUTXO(COIN_UTXO)
    .addOutput(new Transaction().transfer(RECIPIENT, '10'))
    .build();
  expect(testnetTx.hex().length).toBeGreaterThan(0);

  // Same fixtures but network flipped to mainnet — the address prefixes no
  // longer match the network, so the wasm encoder must reject the build.
  // This proves the `network` option is actually forwarded to the encoder.
  expect(() => {
    new Transaction({ network: 'mainnet' })
      .setChangeAddress(CHANGE_ADDR)
      .withUTXO(COIN_UTXO)
      .addOutput(new Transaction().transfer(RECIPIENT, '10'))
      .build();
  }).toThrow();
});

test('setNetwork overrides the constructor default', () => {
  const tx = new Transaction()
    .setNetwork('testnet')
    .setChangeAddress(CHANGE_ADDR)
    .withUTXO(COIN_UTXO)
    .addOutput(new Transaction().transfer(RECIPIENT, '10'))
    .build();

  expect(tx.json().fee).toBeDefined();
  expect(tx.hex().length).toBeGreaterThan(0);
});

test('nft transfer produces no token change and a fee', () => {
  const tx = new Transaction()
    .setChangeAddress(CHANGE_ADDR)
    .withUTXO([COIN_UTXO, NFT_UTXO]);

  tx.addOutput(tx.transferNft(RECIPIENT, NFT_TOKEN_ID));
  tx.build();

  const json = tx.json();

  // @ts-ignore
  expect(BigInt(json.fee!.atoms)).toBeGreaterThan(0n);

  // NFT is spent fully — no token change output for NFT_TOKEN_ID
  const nftChange = json.outputs.find(
    (o: any) =>
      o.destination === CHANGE_ADDR &&
      o.value?.type === 'TokenV1' &&
      o.value?.token_id === NFT_TOKEN_ID,
  );
  expect(nftChange).toBeUndefined();

  // NFT output is present to the recipient
  const nftOut = json.outputs.find(
    (o: any) =>
      o.destination === RECIPIENT &&
      o.value?.type === 'TokenV1' &&
      o.value?.token_id === NFT_TOKEN_ID,
  ) as any;
  expect(nftOut).toBeDefined();
  expect(nftOut.value.amount.atoms).toBe('1');
});
