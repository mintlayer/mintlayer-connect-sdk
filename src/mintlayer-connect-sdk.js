(function () {
  let network = 'mainnet'; // Default network

  const getApiServer = () => {
    return network === 'testnet'
      ? 'https://api-server-lovelace.mintlayer.org/api/v2'
      : 'https://api-server.mintlayer.org/api/v2'; // Замени на реальные URL
  };

  let connectedAddresses = [];

  // helpers
  const selectUTXOs = (utxos, amount, outputType, token_id) => {
    if(outputType === 'Transfer') {
      return selectUTXOsForTransfer(utxos, amount, token_id);
    }
  }

  const selectUTXOsForTransfer = (utxos, amount, token_id) => {
    utxos = utxos.filter((utxo)=>utxo.utxo.type === 'Transfer' || utxo.utxo.type === 'LockThenTransfer').filter((utxo) => {
      if(token_id === null){
        return true;
      }
      return utxo.utxo.value.token_id === token_id;
    });

    console.log('utxos', utxos);

    let balance = BigInt(0)
    const utxosToSpend = []
    let lastIndex = 0

    // take biggest UTXOs first
    utxos.sort((a, b) => {
      return b.utxo.value.amount.atoms - a.utxo.value.amount.atoms
    })

    for (let i = 0; i < utxos.length; i++) {
      lastIndex = i
      const utxoBalance = BigInt(utxos[i].utxo.value.amount.atoms);
      if (balance < BigInt(amount)) {
        balance += utxoBalance
        utxosToSpend.push(utxos[i])
      } else {
        break
      }
    }

    if (balance === BigInt(amount)) {
      // pick up extra UTXO
      if (utxos[lastIndex + 1]) {
        utxosToSpend.push(utxos[lastIndex + 1])
      }
    }

    return utxosToSpend
  }

  const client = {
    isMintlayer: true,

    setNetwork: (net) => {
      if (net !== 'testnet' && net !== 'mainnet') {
        throw new Error('Invalid network. Use "testnet" or "mainnet".');
      }
      network = net;
      console.log(`[Mintlayer Connect SDK] Network set to: ${network}`);
    },

    getNetwork: () => network,

    connect: async () => {
      return client.request({ method: 'connect' });
    },

    // Core request method to communicate with the extension
    request: async ({ method, params }) => {
      return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(2);
        window.postMessage(
          {
            type: 'MINTLAYER_REQUEST',
            requestId,
            method,
            params: params || {},
          },
          '*'
        );

        const handler = (event) => {
          if (
            event.data.type === 'MINTLAYER_RESPONSE' &&
            event.data.requestId === requestId
          ) {
            window.removeEventListener('message', handler);
            if (event.data.error) {
              reject(new Error(event.data.error));
            } else {
              const result = event.data.result;
              // Save addresses if this is a connect request
              if (method === 'connect' && result) {
                connectedAddresses = result;
              }
              resolve(result);
            }
          }
        };
        window.addEventListener('message', handler);
      });
    },

    // Get connected addresses
    getAddresses: async () => {
      if (connectedAddresses.length > 0) {
        return connectedAddresses; // Return cached addresses
      }
    },

    // Get balance for connected addresses
    getBalance: async () => {
      const { address } = await client.request({ method: 'checkConnection' });
      const currentAddress = address[network];

      if (connectedAddresses.length === 0) {
        // throw new Error('No addresses connected. Call connect first.');
      }
      try {
        const address = [...currentAddress.receiving, ...currentAddress.change];

        const balancePromises = address.map(async (addr) => {
          const response = await fetch(`${getApiServer()}/address/${addr}`);
          if (!response.ok) {
            // if its 404 just skip it
            if (response.status === 404) {
              console.warn(`Address ${addr} not found`);
              return 0; // Return 0 balance for not found addresses
            }
            throw new Error('Failed to fetch balance');
          }
          const data = await response.json();
          return data.coin_balance.decimal; // { balance: "123.45" }
        });
        const balances = await Promise.all(balancePromises);
        const totalBalance = balances.reduce((acc, balance) => {
          return acc + parseFloat(balance);
        }, 0);

        return totalBalance; // { balance: "123.45" }
      } catch (error) {
        throw new Error(`API error: ${error.message}`);
      }
    },

    // Get delegations for connected addresses
    getDelegations: async () => {
      if (connectedAddresses.length === 0) {
        // throw new Error('No addresses connected. Call connect first.');
      }
      const { address } = await client.request({ method: 'checkConnection' });
      const currentAddress = address[network];
      try {
        const address = [...currentAddress.receiving, ...currentAddress.change];

        const delegationPromises = address.map(async (addr) => {
          const response = await fetch(`${getApiServer()}/address/${addr}/delegations`);
          if (!response.ok) {
            // if its 404 just skip it
            if (response.status === 404) {
              console.warn(`Address ${addr} not found`);
              return {}; // Return 0 balance for not found addresses
            }
            throw new Error('Failed to fetch delegations');
          }
          const data = await response.json();
          return data;
        });
        const delegations = await Promise.all(delegationPromises);
        const totalDelegations = delegations.reduce((acc, del) => {
          return acc.concat(del);
        }, []);

        return totalDelegations; // { balance: "123.45" }
      } catch (error) {
        throw new Error(`API error: ${error.message}`);
      }
    },

    // Get token owned by connected addresses
    getTokensOwned: async () => {
      if (connectedAddresses.length === 0) {
        // throw new Error('No addresses connected. Call connect first.');
      }
      const { address } = await client.request({ method: 'checkConnection' });
      const currentAddress = address[network];
      try {
        const address = [...currentAddress.receiving, ...currentAddress.change];

        const authorityPromises = address.map(async (addr) => {
          const response = await fetch(`${getApiServer()}/address/${addr}/token-authority`);
          if (!response.ok) {
            // if its 404 just skip it
            if (response.status === 404) {
              console.warn(`Address ${addr} not found`);
              return {}; // Return 0 balance for not found addresses
            }
            throw new Error('Failed to fetch delegations');
          }
          const data = await response.json();
          return data;
        });
        const authority = await Promise.all(authorityPromises);
        const totalAuthority = authority.reduce((acc, del) => {
          return acc.concat(del);
        }, []);

        return totalAuthority;
      } catch (error) {
        throw new Error(`API error: ${error.message}`);
      }
    },

    getDelegationsTotal: async () => {
      const delegations = await client.getDelegations();
      const totalDelegation = delegations.reduce((acc, del) => {
        return acc + parseFloat(del.balance.decimal);
      }, 0);
      return totalDelegation; // { balance: "123.45" }
    },

    // Core ethod to build a transaction
    buildTransaction: async ({ type = 'Transfer', params }) => {
      // if (connectedAddresses.length === 0) throw new Error('No addresses connected');
      if (!params) throw new Error('Missing params');

      console.log('[Mintlayer Connect SDK] Building transaction:', type, params);

      const { address } = await client.request({ method: 'checkConnection' });
      const currentAddress = address[network];
      const addressList = [...currentAddress.receiving, ...currentAddress.change];

      const response = await fetch('https://api.mintini.app' + '/account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ addresses: addressList, network: network === 'mainnet' ? 0 : 1 })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch utxos');
      }
      const data = await response.json();
      const utxos = data.utxos;

      console.log('[Mintlayer Connect SDK] UTXOs:', utxos);

      let tx;
      let fee;
      const inputs = [];
      const outputs = [];

      let input_amount_coin_req = 0n;
      let input_amount_token_req = 0n;

      let send_token;

      // Step 1. Gather necessary inputs and outputs for the transaction
      if(type === 'Transfer') {
        const token_id = params.token_id || 'Coin';
        input_amount_coin_req += BigInt(params.amount * Math.pow(10, 11));
        outputs.push({
          type: 'Transfer',
          destination: params.to,
          value: {
            ...(
              token_id === 'Coin'
                ? { type: 'Coin' }
                : {
                  type: 'TokenV1',
                  token_id,
                }
            ),
            amount: {
              decimal: params.amount,
              atoms: params.amount * Math.pow(10, 11),
            },
          }
        });
      }

      if(type === 'IssueFungibleToken') {
        console.log('params', params);
        // fee = 1 * Math.pow(10, 11);
        // const { tokenData } = params;
        // assuming that token data is exactly as IssueFungibleToken output
        outputs.push({
          type: 'IssueFungibleToken',
          ...params,
        });
      }

      if(type === 'MintToken') {
        const amount = {
          atoms: '10000000000000',
          decimal: '100'
        }

        inputs.push({
          input: {
            amount,
            command: "MintTokens",
            input_type: "AccountCommand",
            nonce: 0,
            token_id: params.token_id,
          },
          utxo: null,
        });
        outputs.push({
          destination: params.destination,
          type: 'Transfer',
          value: {
            type: 'TokenV1',
            token_id: params.token_id,
            amount
          },
        })
      }

      if(type === 'CreateOrder') {
        console.log('params====', params);
        const {
          ask_amount,
          ask_token,
          give_amount,
          give_token,
          conclude_destination,
          //ask_token_details,
          //give_token_details,
        } = params;
        const give_token_details = {
          number_of_decimals: 11, // TODO
        }
        const ask_token_details = {
          number_of_decimals: 11, // TODO
        }

        if(give_token === 'Coin') {
          input_amount_coin_req += BigInt(give_amount * Math.pow(10, 11));
        } else {
          input_amount_token_req += BigInt(give_amount * Math.pow(10, give_token_details.number_of_decimals));
        }

        outputs.push({
          "type": "CreateOrder",
          "ask_balance": {
            "atoms": ask_amount * Math.pow(10, 11),
            "decimal": ask_amount
          },
          "ask_currency": ask_token === 'Coin'
            ? {
              "type": "Coin"
            }
            : {
              "token_id": ask_token,
              "type": "Token"
            },
          "conclude_destination": conclude_destination,
          "give_balance": {
            "atoms": give_amount * Math.pow(10, give_token_details.number_of_decimals),
            "decimal": give_amount
          },
          "give_currency": give_token === 'Coin'
            ? {
              "type": "Coin"
            }
            : {
              "token_id": give_token,
              "type": "Token"
            },
          "initially_asked": {
            "atoms": ask_amount * Math.pow(10, ask_token_details.number_of_decimals),
            "decimal": ask_amount
          },
          "initially_given": {
            "atoms": give_amount * Math.pow(10, ask_token_details.number_of_decimals),
            "decimal": give_amount
          },
        })
      }

      if(type === 'ConcludeOrder') {
        const {
          order_id,
          nonce,
          conclude_destination,
        } = params.order;
        inputs.push({
          input: {
            type: "ConcludeOrder",
            destination: conclude_destination,
            order_id: order_id,
            nonce: nonce,
          },
          utxo: null,
        })

        // TODO: fetch from network
        const order_details = {
          order_id: order_id,
          ask_currency: 'Coin',
          give_currency: 'Coin',
          ask_amount: 0,
          give_amount: 0,
        }

        // ask token
        outputs.push({
          type: 'Transfer',
          destination: params.to,
          value: {
            ...(
              order_details.ask_currency === 'Coin'
                ? { type: 'Coin' }
                : {
                  type: 'TokenV1',
                  token_id: order_details.ask_currency.token_id,
                }
            ),
            amount: {
              decimal: params.amount,
              atoms: params.amount * Math.pow(10, 11),
            },
          }
        });

        // give token
        outputs.push({
          type: 'Transfer',
          destination: params.to,
          value: {
            ...(
              order_details.give_currency === 'Coin'
                ? { type: 'Coin' }
                : {
                  type: 'TokenV1',
                  token_id: order_details.give_currency.token_id,
                }
            ),
            amount: {
              decimal: params.amount,
              atoms: params.amount * Math.pow(10, 11),
            },
          }
        });
      }

      if(type === 'FillOrder') {
        const {
          order_id,
          amount_atoms,
          destination,
        } = params;
        inputs.push({
          input: {
            input_type: "AccountCommand",
            command: "FillOrder",
            order_id: order_id,
            fill_atoms: amount_atoms.toString(),
            destination: destination,
          },
          utxo: null,
        })
      }

      console.log('inputs', inputs);
      console.log('outputs', outputs);

      // Check if the transaction requires additional inputs to pay fee or transfer
      fee = BigInt(0.5 * Math.pow(10, 11));

      input_amount_coin_req += fee;

      const inputObjCoin = selectUTXOs(utxos, input_amount_coin_req, 'Transfer', null);
      console.log('inputObjCoin', inputObjCoin);
      const inputObjToken = send_token?.token_id ? selectUTXOs(utxos, input_amount_token_req, 'Transfer', send_token?.token_id) : [];

      const totalInputValueCoin = inputObjCoin.reduce((acc, item) => acc + BigInt(item.utxo.value.amount.atoms), 0n);
      const totalInputValueToken = inputObjToken.reduce((acc, item) => acc + BigInt(item.utxo.value.amount.atoms), 0n);

      const changeAmountCoin = totalInputValueCoin - input_amount_coin_req - fee - fee;
      const changeAmountToken = totalInputValueToken - input_amount_token_req;

      // Give a change output if needed
      // step 4. Add change if necessary
      if (changeAmountCoin > 0) {
        outputs.push({
          type: 'Transfer',
          value: {
            type: 'Coin',
            amount: {
              atoms: changeAmountCoin.toString(),
              decimal: (changeAmountCoin.toString() / 1e11).toString(),
            },
          },
          destination: currentAddress.change[0], // TODO: change address
        });
      }

      // const changeAmountToken = 0
      //
      // if (changeAmountToken > 0) {
      //   const decimals = sendToken.token_details.number_of_decimals;
      //
      //   outputs.push({
      //     type: 'Transfer',
      //     value: {
      //       type: 'TokenV1',
      //       token_id: sendToken.token_id,
      //       amount: {
      //         atoms: changeAmountToken.toString(),
      //         decimal: (changeAmountToken.toString() / Math.pow(10, decimals)).toString(),
      //       },
      //     },
      //     destination: addresses[0], // change address
      //   });
      // }

      inputs.push(...inputObjCoin)
      inputs.push(...inputObjToken)

      const JSONRepresentation = {
        inputs,
        outputs,
      }

      const BINRepresentation = {};

      const HEXRepresentation_unsigned = {};

      console.log('[Mintlayer Connect SDK] Transaction JSON:', JSONRepresentation);

      return {
        JSONRepresentation,
        BINRepresentation,
        HEXRepresentation_unsigned,
      };
    },

    // Transaction aliases
    transfer: async ({ to, amount }) => {
      const tx = await client.buildTransaction({ type: 'Transfer', params: { to, amount } });
      return client.signTransaction(tx);
    },

    delegate: async ({ poolId, amount }) => {
      const tx = await client.buildTransaction({ type: 'CreateDelegationId', params: { poolId } });
      return client.signTransaction(tx);
    },

    issueToken: async ({ tokenData, authority }) => {
      const tx = await client.buildTransaction({ type: 'IssueFungibleToken', params: { ...tokenData, authority } });
      return client.signTransaction(tx);
    },

    mintToken: async ({ destination, amount, token_id }) => {
      const tx = await client.buildTransaction({ type: 'MintToken', params: { destination, amount, token_id } });
      return client.signTransaction(tx);
    },

    createOrder: async ({ conclude_destination, ask_token, ask_amount, give_token, give_amount }) => {
      const tx = await client.buildTransaction({ type: 'CreateOrder', params: { conclude_destination, ask_token, ask_amount, give_token, give_amount } });
      return client.signTransaction(tx);
    },

    fillOrder: async ({ order, amount }) => {
      const tx = await client.buildTransaction({ type: 'FillOrder', params: { order, amount } });
      return client.signTransaction(tx);
    },

    getAccountOrders: async () => {
      const allOrders = await client.getAvailableOrders();
      const { address } = await client.request({ method: 'checkConnection' });
      const currentAddress = address[network];
      const addressList = [...currentAddress.receiving, ...currentAddress.change];
      const orders = allOrders.filter((order) => {
        return addressList.includes(order.conclude_destination);
      });
      return orders;
    },

    concludeOrder: async ({ order_id }) => {
      // fetch data for order
      const response = await fetch(`${getApiServer()}/order/${order_id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }
      const data = await response.json();
      const order = data;

      const tx = await client.buildTransaction({ type: 'ConcludeOrder', params: { order } });
      return client.signTransaction(tx);
    },

    bridgeRequest: async ({ destination, amount, token_id, intent }) => {
      const tx = await client.buildTransaction({ type: 'Transfer', params: { destination, amount, token_id } });
      return client.signTransaction({...tx, intent});
    },

    // Send transaction to wallet for signing
    signTransaction: async (tx) => {
      return client.request({
        method: 'signTransaction',
        params: { txData: tx }
      });
    },

    getXPub: async () => {
      console.warn(
        '[Mintlayer SDK] Warning: Sharing xPub exposes all derived addresses. Use with caution.'
      );
      return client.request({ method: 'getXPub' });
    },

    // Event subscription
    on: (eventName, callback) => {
      window.addEventListener('message', (event) => {
        if (event.data.type === 'MINTLAYER_EVENT' && event.data.event === eventName) {
          callback(event.data.data);
        }
      });
    },

    // Common api calls not related to account
    getAvailableOrders: async () => {
      const response = await fetch(`${getApiServer()}/order`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      return data;
    },
  };

  // Expose client instead of window.mintlayer
  if (!window.mintlayer) {
    window.mintlayer = Object.freeze(client);
  } else {
    console.warn('Mintlayer SDK already exists');
  }

  console.log('[Mintlayer Connect SDK] Loaded');
})();
