import { Client } from '../src/mintlayer-connect-sdk'
import fetchMock from 'jest-fetch-mock'

import { addresses, utxos } from './__mocks__/accounts/account_01'

beforeEach(() => {
  fetchMock.resetMocks()

  // эмуляция window.mojito
  ;(window as any).mojito = {
    isExtension: true,
    connect: jest.fn().mockResolvedValue(addresses),
    restore: jest.fn().mockResolvedValue(addresses),
    disconnect: jest.fn().mockResolvedValue(undefined),
    request: jest.fn().mockResolvedValue('signed-transaction'),
  }

  // API /chain/tip
  fetchMock.mockIf('https://api-server-lovelace.mintlayer.org/api/v2/chain/tip', async () => {
    return {
      body: JSON.stringify({ height: 200000 }),
    }
  })

  // API /account
  fetchMock.mockIf('https://api.mintini.app/account', async () => {
    return {
      body: JSON.stringify({
        utxos: utxos,
      }),
    }
  })
})

test('buildTransaction for transfer - snapshot', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false })

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction')

  await client.connect()

  await client.transfer({
    to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    amount: 10,
  })

  const result = await spy.mock.results[0]?.value

  expect(result).toMatchSnapshot()
})
