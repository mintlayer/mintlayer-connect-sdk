import { Client } from '@mintlayer/sdk'

Client.create({ network: 'testnet' })
  .then((client) => {
    window.mintlayer = client
    console.log('Mintlayer Connect SDK initialized and ready to use')

    window.dispatchEvent(new Event('mintlayer-ready'))
  })
  .catch((error) => {
    console.error('Failed to initialize Mintlayer Connect SDK:', error)
    window.dispatchEvent(new Event('mintlayer-error'))
  })
