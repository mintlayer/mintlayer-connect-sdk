import {
  Transaction,
} from '../src/transaction';

test('single transfer output', () => {
  const transaction = new Transaction({ client: undefined });

  transaction.addOutput(transaction.transfer('tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc', '10'));
  transaction.withUTXO({
    outpoint: {
      index: 0,
      input_type: 'UTXO',
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
  });

  console.log(transaction.build().json());

  expect(transaction).toBeDefined();
});

test('double transfer output', () => {
  const transaction = new Transaction({ client: undefined });

  transaction.addOutput(transaction.transfer('tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc', '10'));
  transaction.addOutput(transaction.transfer('tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc', '12'));
  transaction.withUTXO({
    outpoint: {
      index: 0,
      input_type: 'UTXO',
      source_id: '5b43a37eb8c73e981c9a718c52706a897dac9b0093182da9af2997803c1508f1',
      source_type: 'Transaction',
    },
    utxo: {
      destination: 'tmt1qycauu4rc92v80vpjrtkqjv2utr7jl5ygve28sdt',
      type: 'Transfer',
      value: {
        amount: {
          atoms: '2000000000000',
          decimal: '30',
        },
        type: 'Coin',
      },
    },
  });
  transaction.setChangeAddress('tmt1qycauu4rc92v80vpjrtkqjv2utr7jl5ygve28sdt');

  const txHex = transaction.build().json();

  console.log(JSON.stringify(txHex, null, 2));

  expect(transaction).toBeDefined();
});
