[**@mintlayer/sdk**](../README.md)

***

> **TxState** = `"local"` \| `"mempool"` \| `"confirmed"` \| `"conflicted"` \| `"orphaned"` \| `"rejected"`

Defined in: [wallet-state.ts:24](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L24)

Wallet-relevant transaction lifecycle state.

`local` means the wallet created the transaction but it is not yet known to
be accepted by the network. `mempool` means it was broadcast or observed as
unconfirmed. `rejected` means the transaction should no longer reserve its
inputs, usually because broadcasting failed and a replacement/rebuild is
needed.
