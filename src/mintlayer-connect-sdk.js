(function () {
  const API_SERVER = 'https://api-server-lovelace.mintlayer.org';

  let connectedAddresses = [];

  const client = {
    isMintlayer: true,

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
      if (connectedAddresses.length === 0) {
        throw new Error('No addresses connected. Call connect first.');
      }
      try {
        const address = connectedAddresses[0]; // TODO: Use all addresses
        const response = await fetch(`${API_SERVER}/address/${address}`);
        if (!response.ok) {
          throw new Error('Failed to fetch balance');
        }
        const data = await response.json();
        return data.balance; // { balance: "123.45" }
      } catch (error) {
        throw new Error(`API error: ${error.message}`);
      }
    },

    // Get delegations for connected addresses
    getDelegations: async () => {
      if (connectedAddresses.length === 0) {
        throw new Error('No addresses connected. Call connect first.');
      }
      try {
        const address = connectedAddresses[0]; // TODO: use all addresses
        const response = await fetch(`${API_SERVER}/address/${address}/delegations`);
        if (!response.ok) {
          throw new Error('Failed to fetch delegations');
        }
        const data = await response.json();
        return data.delegations;
      } catch (error) {
        throw new Error(`API error: ${error.message}`);
      }
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
