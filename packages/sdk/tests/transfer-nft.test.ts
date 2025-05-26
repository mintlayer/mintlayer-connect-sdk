import { Client } from '../src/mintlayer-connect-sdk';
import fetchMock from 'jest-fetch-mock';

import { addresses, utxos } from './__mocks__/accounts/account_01'

beforeEach(() => {
  fetchMock.resetMocks();

  // эмуляция window.mojito
  (window as any).mojito = {
    isExtension: true,
    connect: jest.fn().mockResolvedValue(addresses),
    restore: jest.fn().mockResolvedValue(addresses),
    disconnect: jest.fn().mockResolvedValue(undefined),
    request: jest.fn().mockResolvedValue('signed-transaction'),
  };

  fetchMock.doMock();

  fetchMock.mockResponse(async req => {
    const url = req.url;

    if (url.endsWith('/chain/tip')) {
      return JSON.stringify({ height: 200000 });
    }

    if (url.includes('/token/')) {
      const tokenId = url.split('/token/').pop();
      if (tokenId === 'tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq') {
        return JSON.stringify({
          "authority": "tmt1qyjlh9w9t7qwx7cawlqz6rqwapflsvm3dulgmxyx",
          "circulating_supply": {
            "atoms": "209000000000",
            "decimal": "2090"
          },
          "frozen": false,
          "is_locked": false,
          "is_token_freezable": true,
          "is_token_unfreezable": null,
          "metadata_uri": {
            "hex": "697066733a2f2f516d4578616d706c6548617368313233",
            "string": "ipfs://QmExampleHash123"
          },
          "next_nonce": 7,
          "number_of_decimals": 8,
          "token_ticker": {
            "hex": "58595a32",
            "string": "XYZ2"
          },
          "total_supply": {
            "Fixed": {
              "atoms": "100000000000000"
            }
          }
        });
      }
      if (tokenId === 'tmltk17jgtcm3gc8fne3su8s96gwj0yw8k2khx3fglfe8mz72jhygemgnqm57l7l') {
        return JSON.stringify({
          "authority": "tmt1qyjlh9w9t7qwx7cawlqz6rqwapflsvm3dulgmxyx",
          "circulating_supply": {
            "atoms": "209000000000",
            "decimal": "2090"
          },
          "frozen": false,
          "is_locked": false,
          "is_token_freezable": true,
          "is_token_unfreezable": null,
          "metadata_uri": {
            "hex": "697066733a2f2f516d4578616d706c6548617368313233",
            "string": "ipfs://QmExampleHash123"
          },
          "next_nonce": 7,
          "number_of_decimals": 11,
          "token_ticker": {
            "hex": "58595a32",
            "string": "XYZ2"
          },
          "total_supply": {
            "Fixed": {
              "atoms": "100000000000000"
            }
          }
        });
      }
      return JSON.stringify({ a: 'b' });
    }

    if (url.includes('/nft/')) {
      const tokenId = url.split('/nft/').pop();
      if (tokenId === 'tmltk1hulyp284e3kc522ta435wyckrqy4j4842perueyge6ctjlp2mpds65mcx8') {
        return JSON.stringify({
          "additional_metadata_uri": {
            "hex": "697066733a2f2f6261666b726569656d6861676332736e706a6a6e64766471346a786d68346c6f6267336d707465327a3432627269657164336d6564677367633471",
            "string": "ipfs://bafkreiemhagc2snpjjndvdq4jxmh4lobg3mpte2z42brieqd3medgsgc4q"
          },
          "creator": null,
          "description": {
            "hex": "4465736372697074696f6e",
            "string": "Description"
          },
          "icon_uri": {
            "hex": "697066733a2f2f62616679626569627732796c363432336561673433746c6765757074636564726632666c78706e707674796d736e71627063666e6c786a637a34692f70686f746f5f323032342d31302d30332d32332e32342e30342e6a706567",
            "string": "ipfs://bafybeibw2yl6423eag43tlgeuptcedrf2flxpnpvtymsnqbpcfnlxjcz4i/photo_2024-10-03-23.24.04.jpeg"
          },
          "media_hash": {
            "hex": "010006000906000401000002",
            "string": "\u0001\u0000\u0006\u0000\t\u0006\u0000\u0004\u0001\u0000\u0000\u0002"
          },
          "media_uri": {
            "hex": "697066733a2f2f62616679626569627732796c363432336561673433746c6765757074636564726632666c78706e707674796d736e71627063666e6c786a637a34692f70686f746f5f323032342d31302d30332d32332e32342e30342e6a706567",
            "string": "ipfs://bafybeibw2yl6423eag43tlgeuptcedrf2flxpnpvtymsnqbpcfnlxjcz4i/photo_2024-10-03-23.24.04.jpeg"
          },
          "name": {
            "hex": "4e616d65",
            "string": "Name"
          },
          "owner": "tmt1q96glhddzd2u9wcyzfeqm53yrxxqgfm66yezu0gd",
          "ticker": {
            "hex": "505050",
            "string": "PPP"
          }
        });
      }
      if (tokenId === 'tmltk1wy7fqxu0qavm5ts66w5exytmxgsgdd66q266c93glu5m3f7hzjsq046gmy') {
        return JSON.stringify({
          "additional_metadata_uri": {
            "hex": "697066733a2f2f6261666b726569687470357a3773746236756d3378636563737435326170726d6b73767a73376570776932336d7161776d6765736979786a6f3675",
            "string": "ipfs://bafkreihtp5z7stb6um3xcecst52aprmksvzs7epwi23mqawmgesiyxjo6u"
          },
          "creator": null,
          "description": {
            "hex": "4675774c4a58757a42627657557a517163775231354538484d72",
            "string": "FuwLJXuzBbvWUzQqcwR15E8HMr"
          },
          "icon_uri": {
            "hex": "697066733a2f2f6261666b726569636463767034657779356764656d69696c63637876767668666b356b32717265757272677435736177737561726b6361786c6f34",
            "string": "ipfs://bafkreicdcvp4ewy5gdemiilccxvvvhfk5k2qreurrgt5sawsuarkcaxlo4"
          },
          "media_hash": {
            "hex": "0000000000000000000000000000000000000000000000000000000000000000",
            "string": "\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000"
          },
          "media_uri": {
            "hex": "697066733a2f2f6261666b726569636463767034657779356764656d69696c63637876767668666b356b32717265757272677435736177737561726b6361786c6f34",
            "string": "ipfs://bafkreicdcvp4ewy5gdemiilccxvvvhfk5k2qreurrgt5sawsuarkcaxlo4"
          },
          "name": {
            "hex": "50726f7661",
            "string": "Prova"
          },
          "owner": "tmt1q9874wgx6enm2mzfu0yxhzleu84pp00l95l7er5z",
          "ticker": {
            "hex": "505256",
            "string": "PRV"
          }
        });
      }
      return JSON.stringify({ a: 'b' });
    }

    if(url.endsWith('/account')) {
      return {
        body: JSON.stringify({
          utxos: utxos,
        }),
      };
    }

    console.warn('No mock for:', url);
    return JSON.stringify({ error: 'No mock defined' });
  });
});

test('buildTransaction for transfer NFT using normal utxo - snapshot', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.transferNft({
    to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    token_id: 'tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq',
  });

  const result = await spy.mock.results[0]?.value;

  console.log(JSON.stringify(result, null, 2));

  // expect(result).toMatchSnapshot();
});

test('buildTransaction for transfer NFT using initial issue utxo - snapshot', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.transferNft({
    to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    token_id: 'tmltk1hulyp284e3kc522ta435wyckrqy4j4842perueyge6ctjlp2mpds65mcx8', // initial issue utxo
  });

  const result = await spy.mock.results[0]?.value;

  console.log(JSON.stringify(result, null, 2));

  // expect(result).toMatchSnapshot();
});
