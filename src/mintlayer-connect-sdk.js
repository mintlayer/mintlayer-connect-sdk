(function () {
  let network = 'mainnet'; // Default network

  const getApiServer = () => {
    return network === 'testnet'
      ? 'https://api-server-lovelace.mintlayer.org/api/v2'
      : 'https://api-server.mintlayer.org/api/v2'; // Замени на реальные URL
  };

  let connectedAddresses = [];

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

      let tx;
      let fee;
      const inputs = [];
      const outputs = [];

      // Step 1. Gather necessary inputs and outputs for the transaction
      if(type === 'Transfer') {
        outputs.push({
          type: 'Transfer',
          destination: params.to,
          amount: {
            decimal: params.amount,
            atoms: params.amount * Math.pow(10, 11),
          },
        });
      }

      if(type === 'IssueFungibleToken') {
        fee = 1 * Math.pow(10, 11);
        const { tokenData } = params;
        // assuming that token data is exactly as IssueFungibleToken output
        outputs.push({
          type: 'IssueFungibleToken',
          ...tokenData,
        });
      }

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
  };

  // Expose client instead of window.mintlayer
  if (!window.mintlayer) {
    window.mintlayer = Object.freeze(client);
  } else {
    console.warn('Mintlayer SDK already exists');
  }

  console.log('[Mintlayer Connect SDK] Loaded');
})();
