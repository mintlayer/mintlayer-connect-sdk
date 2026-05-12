import {
  createMemoryWalletTxStore,
  WalletState,
  WalletTx,
} from '../src/wallet-state';

const ADDRESS = 'tmt1qwallet';
const OTHER_ADDRESS = 'tmt1qother';

function coinTransfer(destination: string, atoms: string, decimal = atoms) {
  return {
    type: 'Transfer',
    destination,
    value: {
      type: 'Coin',
      amount: {
        atoms,
        decimal,
      },
    },
  };
}

function tokenTransfer(destination: string, token_id: string, atoms: string, decimal = atoms) {
  return {
    type: 'Transfer',
    destination,
    value: {
      type: 'TokenV1',
      token_id,
      amount: {
        atoms,
        decimal,
      },
    },
  };
}

function utxoInput(txId: string, outputIndex: number, utxo: any) {
  return {
    input: {
      input_type: 'UTXO',
      source_id: txId,
      source_type: 'Transaction',
      index: outputIndex,
    },
    utxo,
  };
}

function walletTx(txId: string, outputs: any[], state: WalletTx['state'] = 'confirmed', inputs: any[] = []): WalletTx {
  return {
    txId,
    state,
    blockHeight: state === 'confirmed' ? 1 : undefined,
    blockHash: state === 'confirmed' ? 'block-1' : undefined,
    tx: {
      id: txId,
      inputs,
      outputs,
    },
  };
}

const isMineOutput = (output: any) => output.destination === ADDRESS;

test('derives wallet utxos and balances from wallet transactions', async () => {
  const tokenId = 'token-1';
  const store = createMemoryWalletTxStore({
    transactions: {
      bot: [
        walletTx('funding', [
          coinTransfer(ADDRESS, '100'),
          coinTransfer(OTHER_ADDRESS, '50'),
          tokenTransfer(ADDRESS, tokenId, '25'),
        ]),
      ],
    },
  });

  const walletState = await WalletState.create({
    accountId: 'bot',
    store,
    isMineOutput,
  });

  expect(walletState.getUtxos()).toHaveLength(2);
  expect(walletState.getBalance()).toEqual({
    coin: { atoms: '100' },
    tokens: {
      [tokenId]: { atoms: '25' },
    },
  });
});

test('applies a local transaction as pending spend and hides unconfirmed change by default', async () => {
  const fundingOutput = coinTransfer(ADDRESS, '100');
  const store = createMemoryWalletTxStore({
    transactions: {
      bot: [walletTx('funding', [fundingOutput])],
    },
  });

  const walletState = await WalletState.create({
    accountId: 'bot',
    store,
    isMineOutput,
  });

  await walletState.applyLocalTx({
    id: 'local-spend',
    inputs: [utxoInput('funding', 0, fundingOutput)],
    outputs: [
      coinTransfer(OTHER_ADDRESS, '40'),
      coinTransfer(ADDRESS, '59'),
    ],
  });

  const allUtxos = walletState.getUtxos({ includeSpent: true });
  expect(allUtxos.find((utxo) => utxo.txId === 'funding')?.status).toBe('spent_pending');
  expect(allUtxos.find((utxo) => utxo.txId === 'local-spend')?.status).toBe('unconfirmed');

  expect(walletState.getSpendableUtxos()).toHaveLength(0);
  expect(walletState.getSpendableUtxos({ allowUnconfirmed: true })).toHaveLength(1);
});

test('prevents local double-spends by default', async () => {
  const fundingOutput = coinTransfer(ADDRESS, '100');
  const store = createMemoryWalletTxStore({
    transactions: {
      bot: [walletTx('funding', [fundingOutput])],
    },
  });

  const walletState = await WalletState.create({
    accountId: 'bot',
    store,
    isMineOutput,
  });

  await walletState.applyLocalTx({
    id: 'local-spend-1',
    inputs: [utxoInput('funding', 0, fundingOutput)],
    outputs: [coinTransfer(ADDRESS, '99')],
  });

  await expect(
    walletState.applyLocalTx({
      id: 'local-spend-2',
      inputs: [utxoInput('funding', 0, fundingOutput)],
      outputs: [coinTransfer(ADDRESS, '98')],
    }),
  ).rejects.toThrow('already spent');
});

test('releases inputs and rejects dependent local chain when broadcast requires rebuild', async () => {
  const fundingOutput = coinTransfer(ADDRESS, '100');
  const localChange = coinTransfer(ADDRESS, '59');
  const store = createMemoryWalletTxStore({
    transactions: {
      bot: [walletTx('funding', [fundingOutput])],
    },
  });

  const walletState = await WalletState.create({
    accountId: 'bot',
    store,
    isMineOutput,
  });

  await walletState.applyLocalTx({
    id: 'local-spend',
    inputs: [utxoInput('funding', 0, fundingOutput)],
    outputs: [
      coinTransfer(OTHER_ADDRESS, '40'),
      localChange,
    ],
  });

  await walletState.applyLocalTx({
    id: 'child-local-spend',
    inputs: [utxoInput('local-spend', 1, localChange)],
    outputs: [coinTransfer(ADDRESS, '58')],
  });

  await walletState.markBroadcastRejected('local-spend', {
    reason: 'fee too low',
    rebuildRequired: true,
  });

  expect(walletState.getSpendableUtxos().map((utxo) => utxo.txId)).toEqual(['funding']);
  expect(walletState.getUtxos()).toHaveLength(1);

  const rejectedUtxos = walletState.getUtxos({ includeRejected: true });
  expect(rejectedUtxos.find((utxo) => utxo.txId === 'local-spend')?.status).toBe('rejected');
  expect(rejectedUtxos.find((utxo) => utxo.txId === 'child-local-spend')?.status).toBe('rejected');
});

test('sync diff can confirm local transactions and mark external spends', async () => {
  const fundingOutput = coinTransfer(ADDRESS, '100');
  const store = createMemoryWalletTxStore({
    transactions: {
      bot: [walletTx('funding', [fundingOutput])],
    },
  });

  const walletState = await WalletState.create({
    accountId: 'bot',
    store,
    isMineOutput,
  });

  const localTx = await walletState.applyLocalTx({
    id: 'local-spend',
    inputs: [utxoInput('funding', 0, fundingOutput)],
    outputs: [coinTransfer(ADDRESS, '99')],
  });

  await walletState.applySyncDiff({
    toCursor: {
      height: 2,
      blockHash: 'block-2',
    },
    transactions: [],
    confirmedTxIds: [localTx.txId],
  });

  expect(walletState.getSpendableUtxos()).toHaveLength(1);
  expect(walletState.getSpendableUtxos()[0].txId).toBe('local-spend');

  await walletState.applySyncDiff({
    toCursor: {
      height: 3,
      blockHash: 'block-3',
    },
    transactions: [],
    spent: [{ txId: 'local-spend', outputIndex: 0 }],
  });

  expect(walletState.getUtxos()).toHaveLength(0);
  expect(walletState.getUtxos({ includeSpent: true })[0].status).toBe('spent');
});

test('treats api confirmation 0 as confirmed and -1 as mempool', async () => {
  const store = createMemoryWalletTxStore({
    transactions: {
      bot: [
        {
          ...walletTx('confirmed-zero', [coinTransfer(ADDRESS, '100')], 'mempool'),
          confirmation: 0,
        },
        {
          ...walletTx('api-mempool', [coinTransfer(ADDRESS, '50')], 'confirmed'),
          confirmation: -1,
        },
      ],
    },
  });

  const walletState = await WalletState.create({
    accountId: 'bot',
    store,
    isMineOutput,
  });

  const utxos = walletState.getUtxos();

  expect(utxos.find((utxo) => utxo.txId === 'confirmed-zero')?.status).toBe('confirmed');
  expect(utxos.find((utxo) => utxo.txId === 'api-mempool')?.status).toBe('unconfirmed');
  expect(walletState.getSpendableUtxos().map((utxo) => utxo.txId)).toEqual(['confirmed-zero']);
});
