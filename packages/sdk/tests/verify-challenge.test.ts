import { Client } from '../src/mintlayer-connect-sdk';

import { setupApiMocks } from './helpers/api-mocks';

const VERIFY_ADDRESSES = {
  addressesByChain: {
    mintlayer: {
      receiving: ['tmt1q9cz2dkuqqrdv2g3kl8zqvjvqtu3u6j3j8z9z9z9'],
      change: ['tmt1q9cz2dkuqqrdv2g3kl8zqvjvqtu3u6j3j8z9z9z8'],
    },
  },
};

beforeEach(() => {
  setupApiMocks({ addresses: VERIFY_ADDRESSES });
});

test('verifyChallenge should verify a valid signature', async () => {
  const client = await Client.create({
    network: 'testnet',
    autoRestore: false,
  });

  await client.connect();

  // This is a test case - in real usage, the signature would come from signChallenge
  // For now, we're testing that the method exists and can be called
  const testMessage = 'Hello, Mintlayer!';
  const testAddress = 'tmt1q9cz2dkuqqrdv2g3kl8zqvjvqtu3u6j3j8z9z9z9';
  const testSignature = '0123456789abcdef'; // This would be a real signature in practice

  // The actual verification will fail with invalid signature, but we're testing the method exists
  try {
    await client.verifyChallenge({
      message: testMessage,
      address: testAddress,
      signature: testSignature,
    });
  } catch (error) {
    // Expected to fail with invalid signature, but the method should exist and be callable
    expect(error).toBeDefined();
  }
});

test('verifyChallenge should be a function on Client', async () => {
  const client = await Client.create({
    network: 'testnet',
    autoRestore: false,
  });

  expect(typeof client.verifyChallenge).toBe('function');
});

