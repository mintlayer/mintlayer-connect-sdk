export const addresses: any = {
  addressesByChain: {
    mintlayer: {
      receiving: ['tmt1q9874wgx6enm2mzfu0yxhzleu84pp00l95l7er5z'],
      change: ['tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6'],
    },
  },
};

export const utxos: any = [
  {
    outpoint: {
      index: 0,
      source_id: 'af3b5fad20f6f97eb210934e942176f7f7d0f70423590659ee0e0217053a7cab',
      source_type: 'Transaction',
    },
    utxo: {
      destination: 'tmt1q9874wgx6enm2mzfu0yxhzleu84pp00l95l7er5z',
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
];
