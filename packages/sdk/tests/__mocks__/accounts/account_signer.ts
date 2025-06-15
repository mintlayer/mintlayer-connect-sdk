export const seed_phrase = process.env.TEST_SEED_PHRASE || 'test';

export const addresses: any = {
  mainnet: {},
  testnet: {
    receiving: ['tmt1qycauu4rc92v80vpjrtkqjv2utr7jl5ygve28sdt'],
    change: ['tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6'],
  },
};

export const private_keys: any = {
  tmt1qycauu4rc92v80vpjrtkqjv2utr7jl5ygve28sdt: new Uint8Array([
    0, 139, 105, 103, 196, 210, 140, 25, 46, 11, 136, 102, 78, 67, 84, 72, 173, 232, 249, 67, 162, 63, 19, 205, 61, 111,
    80, 28, 151, 253, 179, 245, 236,
  ]),
};

export const utxos: any = [
  {
    outpoint: {
      index: 0,
      source_id: '5b43a37eb8c73e981c9a718c52706a897dac9b0093182da9af2997803c1508f1',
      source_type: 'Transaction',
    },
    utxo: {
      destination: 'tmt1qycauu4rc92v80vpjrtkqjv2utr7jl5ygve28sdt',
      type: 'Transfer',
      value: {
        amount: {
          atoms: '2000000000000',
          decimal: '20',
        },
        type: 'Coin',
      },
    },
  },
  {
    outpoint: {
      index: 0,
      source_id: '9d214cf61b322cfb257e3c145cba5085763e7b82cc5a20e5e54821549778ee1a',
      source_type: 'Transaction',
    },
    utxo: {
      destination: 'tmt1qycauu4rc92v80vpjrtkqjv2utr7jl5ygve28sdt',
      type: 'Transfer',
      value: {
        amount: {
          atoms: '4500000000000',
          decimal: '45',
        },
        type: 'Coin',
      },
    },
  },
];
