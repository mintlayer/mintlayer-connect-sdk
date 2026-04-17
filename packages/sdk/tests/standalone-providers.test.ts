import { Client, MnemonicAccountProvider, PrivateKeyAccountProvider } from '../src/mintlayer-connect-sdk';
import fetchMock from 'jest-fetch-mock';

const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

// Addresses derived from TEST_MNEMONIC on testnet (index 0)
const RECV_ADDR = 'tmt1qx5p4r2en7c99mpmg2tz9hucxfarf4k6dyyvsahr';
const CHANGE_ADDR = 'tmt1qyltm78pn55qyv6vngnk0nlh6m2rrjg5cs3d4uq9';

const RECV_PRIVKEY = new Uint8Array([
  0, 224, 31, 234, 138, 72, 226, 133, 79, 221, 2, 85, 193, 43, 29, 112, 73, 103, 217, 64, 31, 17,
  195, 244, 152, 0, 6, 206, 216, 151, 117, 116, 220,
]);

const UTXOS = [
  {
    outpoint: {
      index: 0,
      source_id: '9d214cf61b322cfb257e3c145cba5085763e7b82cc5a20e5e54821549778ee1a',
      source_type: 'Transaction',
    },
    utxo: {
      destination: RECV_ADDR,
      type: 'Transfer',
      value: {
        amount: { atoms: '5000000000000', decimal: '50' },
        type: 'Coin',
      },
    },
  },
];

function setupFetchMock() {
  fetchMock.resetMocks();
  fetchMock.doMock();
  fetchMock.mockResponse(async (req) => {
    if (req.url.endsWith('/chain/tip')) return JSON.stringify({ height: 200000 });
    if (req.url.endsWith('/account')) return JSON.stringify({ utxos: UTXOS });
    return JSON.stringify({});
  });
}

describe('MnemonicAccountProvider', () => {
  beforeEach(setupFetchMock);

  test('derives correct addresses from mnemonic', async () => {
    const provider = new MnemonicAccountProvider(TEST_MNEMONIC, 'testnet');
    const addresses = await provider.connect();
    expect(addresses.addressesByChain.mintlayer.receiving).toEqual([RECV_ADDR]);
    expect(addresses.addressesByChain.mintlayer.change).toEqual([CHANGE_ADDR]);
  });

  test('derives multiple addresses', async () => {
    const provider = new MnemonicAccountProvider(TEST_MNEMONIC, 'testnet', {
      receivingAddressCount: 3,
      changeAddressCount: 2,
    });
    const addresses = await provider.connect();
    expect(addresses.addressesByChain.mintlayer.receiving).toHaveLength(3);
    expect(addresses.addressesByChain.mintlayer.change).toHaveLength(2);
  });

  test('connect and restore return same addresses', async () => {
    const provider = new MnemonicAccountProvider(TEST_MNEMONIC, 'testnet');
    expect(await provider.connect()).toEqual(await provider.restore());
  });

  test('can sign a transaction end-to-end via Client', async () => {
    const provider = new MnemonicAccountProvider(TEST_MNEMONIC, 'testnet');
    const client = await Client.create({
      network: 'testnet',
      autoRestore: false,
      accountProvider: provider,
    });

    await client.connect();

    const tx = await client.transfer({
      to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
      amount: 10,
    });

    expect(typeof tx).toBe('string');
    expect(tx.length).toBeGreaterThan(0);
  });
});

describe('PrivateKeyAccountProvider', () => {
  beforeEach(setupFetchMock);

  test('returns provided addresses', async () => {
    const provider = new PrivateKeyAccountProvider(
      { receiving: [RECV_ADDR], change: [CHANGE_ADDR] },
      { [RECV_ADDR]: RECV_PRIVKEY },
      'testnet',
    );
    const addresses = await provider.connect();
    expect(addresses.addressesByChain.mintlayer.receiving).toEqual([RECV_ADDR]);
    expect(addresses.addressesByChain.mintlayer.change).toEqual([CHANGE_ADDR]);
  });

  test('connect and restore return same addresses', async () => {
    const provider = new PrivateKeyAccountProvider(
      { receiving: [RECV_ADDR], change: [] },
      { [RECV_ADDR]: RECV_PRIVKEY },
    );
    expect(await provider.connect()).toEqual(await provider.restore());
  });

  test('can sign a transaction end-to-end via Client', async () => {
    const provider = new PrivateKeyAccountProvider(
      { receiving: [RECV_ADDR], change: [CHANGE_ADDR] },
      { [RECV_ADDR]: RECV_PRIVKEY },
      'testnet',
    );
    const client = await Client.create({
      network: 'testnet',
      autoRestore: false,
      accountProvider: provider,
    });

    await client.connect();

    const tx = await client.transfer({
      to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
      amount: 10,
    });

    expect(typeof tx).toBe('string');
    expect(tx.length).toBeGreaterThan(0);
  });

  test('throws when private key is missing for address', async () => {
    const provider = new PrivateKeyAccountProvider(
      { receiving: [RECV_ADDR], change: [] },
      {},
      'testnet',
    );
    await expect(provider.request('signChallenge', { message: 'test', address: RECV_ADDR }))
      .rejects.toThrow('Private key not found');
  });

  test('throws on unsupported method', async () => {
    const provider = new PrivateKeyAccountProvider(
      { receiving: [RECV_ADDR], change: [] },
      { [RECV_ADDR]: RECV_PRIVKEY },
    );
    await expect(provider.request('getXPub', {})).rejects.toThrow('Method not supported');
  });
});
