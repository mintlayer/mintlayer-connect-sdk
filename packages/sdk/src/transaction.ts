import {
  Amount,
  encode_create_order_output,
  encode_input_for_change_token_authority,
  encode_input_for_change_token_metadata_uri,
  encode_input_for_conclude_order,
  encode_input_for_fill_order,
  encode_input_for_freeze_token,
  encode_input_for_lock_token_supply,
  encode_input_for_mint_tokens,
  encode_input_for_unfreeze_token,
  encode_input_for_unmint_tokens,
  encode_input_for_utxo,
  encode_input_for_withdraw_from_delegation,
  encode_lock_for_block_count,
  encode_lock_until_time,
  encode_outpoint_source_id,
  encode_output_coin_burn,
  encode_output_create_delegation,
  encode_output_data_deposit,
  encode_output_delegate_staking,
  encode_output_htlc,
  encode_output_issue_fungible_token,
  encode_output_issue_nft,
  encode_output_lock_then_transfer,
  encode_output_token_burn,
  encode_output_token_lock_then_transfer,
  encode_output_token_transfer,
  encode_output_transfer,
  encode_transaction,
  estimate_transaction_size,
  FreezableToken,
  get_token_id,
  get_transaction_id,
  SourceId,
  Network,
  TokenUnfreezable,
  TotalSupply,
} from '@mintlayer/wasm-lib';
import { mergeUint8Arrays, atomsToDecimal, stringToUint8Array } from './utils';
import { UtxoEntry, UtxoInput } from './types/transaction';

type Utxo = any;

type Input = {
  input: {
    index: number;
    input_type: 'UTXO';
    source_id: string;
    source_type: SourceId;
  };
  utxo: Utxo;
};

type Output = any;

type TransactionJSONRepresentation = any;

type Client = any;

export class Transaction {
  private inputs: Input[]
  private outputs: Output[]
  private fee: bigint
  private utxos: Utxo[]
  private transactionId: string
  private hexRepresentation: string
  private binRepresentation: { inputs: Uint8Array[]; outputs: Uint8Array[]; transactionsize: number } | null
  private jsonRepresentation: TransactionJSONRepresentation
  private currentBlockHeight: number
  private client: Client
  private network: 'mainnet' | 'testnet'
  private changeAddress: string

  constructor({
    client,
    network,
    currentBlockHeight,
  }: {
    client?: Client;
    network?: 'mainnet' | 'testnet';
    currentBlockHeight?: number | string | bigint;
  } = {}) {
    this.inputs = [];
    this.outputs = [];
    this.utxos = [];
    this.transactionId = '';
    this.hexRepresentation = '';
    this.binRepresentation = null;
    this.currentBlockHeight = currentBlockHeight !== undefined ? Number(currentBlockHeight) : 0;
    this.jsonRepresentation = {};
    this.network = network ?? 'testnet';
    this.fee = BigInt(0);
    this.changeAddress = '';

    if (client) {
      this.client = client;
    }
  }

  setChangeAddress(address: string) {
    this.changeAddress = address;
    return this;
  }

  setNetwork(network: 'mainnet' | 'testnet') {
    this.network = network;
    return this;
  }

  setCurrentBlockHeight(height: number | string | bigint) {
    this.currentBlockHeight = Number(height);
    return this;
  }

  addInput(input: Input) {
    this.inputs.push(input);
    return this;
  }

  addOutput(output: Output) {
    this.outputs.push(output);
    return this;
  }

  addAction(action: any) {
    return this;
  }

  withUTXO(utxos: Utxo | Utxo[]) {
    this.utxos = Array.isArray(utxos) ? utxos : [utxos];
    return this;
  }

  fromHEX(hex: string) {
    return this;
  }

  getTransactionId() {
    return this.transactionId;
  }

  // Signer-compatibility getters (match the shape used by Signer.sign())
  get JSONRepresentation(): TransactionJSONRepresentation {
    return this.jsonRepresentation;
  }
  get BINRepresentation() {
    return this.binRepresentation;
  }
  get HEXRepresentation_unsigned(): string {
    return this.hexRepresentation;
  }
  get transaction_id(): string {
    return this.transactionId;
  }

  build() {
    if (!this.client && !this.utxos.length) {
      throw new Error('Client or UTXOs are required to build transaction');
    }
    if (!this.client && !this.changeAddress) {
      throw new Error('Client or Change Address are required to build transaction');
    }

    const declaredOutputs: Output[] = [...this.outputs];

    // Sum coin and per-token requirements from user-declared outputs.
    let input_amount_coin_req = 0n;
    const token_reqs = new Map<string, bigint>();
    for (const out of declaredOutputs) {
      const val = (out as any)?.value;
      if (!val) continue;
      if (val.type === 'Coin') {
        input_amount_coin_req += BigInt(val.amount.atoms);
      } else if (val.type === 'TokenV1') {
        token_reqs.set(
          val.token_id,
          (token_reqs.get(val.token_id) ?? 0n) + BigInt(val.amount.atoms),
        );
      }
    }

    const networkId = this.network === 'mainnet' ? 0 : 1;

    let preciseFee = 0n;
    let previousFee = -1n;
    const MAX_ATTEMPTS = 10;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const totalFee = preciseFee;
      const coin_req_w_fee = input_amount_coin_req + totalFee;

      const coinInputs = this.selectUTXOs(this.utxos, coin_req_w_fee, null);
      const totalCoinIn = coinInputs.reduce(
        (acc, item) => acc + BigInt(item.utxo!.value.amount.atoms),
        0n,
      );
      if (totalCoinIn < coin_req_w_fee) {
        throw new Error('Not enough coin UTXOs');
      }

      const tokenInputsAll: UtxoInput[] = [];
      const tokenChanges: Array<{ token_id: string; amount: bigint }> = [];
      for (const [token_id, req] of token_reqs.entries()) {
        const tInputs = this.selectUTXOs(this.utxos, req, token_id);
        const totalIn = tInputs.reduce(
          (acc, item) => acc + BigInt(item.utxo!.value.amount.atoms),
          0n,
        );
        if (totalIn < req) {
          throw new Error(`Not enough token UTXOs for ${token_id}`);
        }
        tokenInputsAll.push(...tInputs);
        if (totalIn > req) {
          tokenChanges.push({ token_id, amount: totalIn - req });
        }
      }

      const finalOutputs: Output[] = [...declaredOutputs];
      const changeCoin = totalCoinIn - coin_req_w_fee;
      if (changeCoin > 0n) {
        finalOutputs.push({
          type: 'Transfer',
          value: {
            type: 'Coin',
            amount: {
              atoms: changeCoin.toString(),
              decimal: atomsToDecimal(changeCoin.toString(), 11).toString(),
            },
          },
          destination: this.changeAddress,
        });
      }
      for (const c of tokenChanges) {
        finalOutputs.push({
          type: 'Transfer',
          value: {
            type: 'TokenV1',
            token_id: c.token_id,
            amount: {
              atoms: c.amount.toString(),
              decimal: c.amount.toString(),
            },
          },
          destination: this.changeAddress,
        });
      }

      const finalInputs: Input[] = [...coinInputs, ...tokenInputsAll];

      const JSONRepresentation: TransactionJSONRepresentation = {
        inputs: finalInputs,
        outputs: finalOutputs,
        fee: {
          atoms: totalFee.toString(),
          decimal: atomsToDecimal(totalFee.toString(), 11).toString(),
        },
        id: 'to_be_filled_in',
      };

      const BINRepresentation = this.getTransactionBINrepresentation(JSONRepresentation, networkId);

      const tx_size = BigInt(Math.ceil(BINRepresentation.transactionsize));
      const fee_per_kb = 100_000_000_000n; // TODO: fetch live feerate
      const nextPreciseFee = (fee_per_kb * tx_size + 999n) / 1000n;

      if (nextPreciseFee === preciseFee || nextPreciseFee === previousFee) {
        const transaction = encode_transaction(
          mergeUint8Arrays(BINRepresentation.inputs),
          mergeUint8Arrays(BINRepresentation.outputs),
          BigInt(0),
        );
        const transaction_id = get_transaction_id(transaction, true);

        this.fee = totalFee;
        this.transactionId = transaction_id;
        this.binRepresentation = BINRepresentation;
        this.hexRepresentation = transaction.reduce(
          (acc, byte) => acc + byte.toString(16).padStart(2, '0'),
          '',
        );
        this.jsonRepresentation = { ...JSONRepresentation, id: transaction_id };
        return this;
      }

      previousFee = preciseFee;
      preciseFee = nextPreciseFee;
    }

    throw new Error('Failed to build transaction after maximum attempts');
  }

  hex() {
    return this.hexRepresentation;
  }

  json(): TransactionJSONRepresentation {
    return this.jsonRepresentation;
  }

  getFee() {
    return {
      atoms: this.fee.toString(),
      decimal: atomsToDecimal(this.fee.toString(), 11).toString(),
    };
  }

  /**
   * Select required UTXOs for the transaction based on provided amount and token ID.
   * @param utxos
   * @param amount
   * @param token_id
   * @private
   */
  private selectUTXOs(utxos: UtxoEntry[], amount: bigint, token_id: string | null): UtxoInput[] {
    const transferableUtxoTypes = ['Transfer', 'LockThenTransfer', 'IssueNft', 'Htlc'];
    const filteredUtxos: any[] = utxos // type fix for NFT considering that NFT don't have amount
      .map((utxo) => {
        if (utxo.utxo.type === 'IssueNft') {
          return {
            ...utxo,
            utxo: {
              ...utxo.utxo,
              value: {
                amount: {
                  atoms: 1,
                  decimal: 1,
                },
                type: 'TokenV1',
                token_id: utxo.utxo.token_id,
              },
            },
          };
        } else {
          return utxo;
        }
      })
      .filter((utxo) => transferableUtxoTypes.includes(utxo.utxo.type))
      .filter((utxo) => {
        if (utxo.utxo.type === 'IssueNft') {
          return utxo.utxo.token_id === token_id;
        } else {
          if (token_id === null) {
            return utxo.utxo.value.type === 'Coin';
          }
          if (utxo.utxo.value.type === 'TokenV1') {
            return utxo.utxo.value.token_id === token_id;
          }
        }
      });

    let balance = BigInt(0);
    const utxosToSpend: UtxoEntry[] = [];
    let lastIndex = 0;

    filteredUtxos.sort((a, b) => {
      return Number(BigInt(b.utxo.value.amount.atoms) - BigInt(a.utxo.value.amount.atoms));
    });

    for (let i = 0; i < filteredUtxos.length; i++) {
      lastIndex = i;
      const utxoBalance = BigInt(filteredUtxos[i].utxo.value.amount.atoms);
      if (balance < amount) {
        balance += utxoBalance;
        utxosToSpend.push(filteredUtxos[i]);
      } else {
        break;
      }
    }

    if (balance === amount) {
      if (filteredUtxos[lastIndex + 1]) {
        utxosToSpend.push(filteredUtxos[lastIndex + 1]);
      }
    }

    const transformedInput: UtxoInput[] = utxosToSpend.map((item: UtxoEntry) => ({
      input: {
        ...item.outpoint,
        input_type: 'UTXO',
      },
      utxo: item.utxo,
    }));

    return transformedInput;
  }

  /**
   * Returns the transaction binary representation.
   * @param transactionJSONrepresentation
   * @param _network
   */
  getTransactionBINrepresentation(
    transactionJSONrepresentation: TransactionJSONRepresentation,
    _network: Network,
  ): {
    inputs: Uint8Array[];
    outputs: Uint8Array[];
    transactionsize: number;
  } {
    const network = _network;
    // Binarisation
    // calculate fee and prepare as much transaction as possible
    const inputs = transactionJSONrepresentation.inputs;
    const outpointedSourceIds = (inputs as UtxoInput[])
      .filter(({ input }) => input.input_type === 'UTXO')
      .map(({ input }) => {
        const bytes = Uint8Array.from(input.source_id.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
        return {
          source_id: encode_outpoint_source_id(bytes, SourceId.Transaction),
          index: input.index,
        };
      });
    const inputsIds = outpointedSourceIds.map((source) => encode_input_for_utxo(source.source_id, source.index));

    const inputCommands = (transactionJSONrepresentation.inputs as any[])
      .filter(({ input }) => input.input_type === 'AccountCommand' || input.input_type === 'Account')
      .map(({ input }) => {
        if (input.command === 'ConcludeOrder') {
          return encode_input_for_conclude_order(input.order_id, BigInt(input.nonce.toString()), network);
        }
        if (input.command === 'FillOrder') {
          return encode_input_for_fill_order(
            input.order_id,
            Amount.from_atoms(input.fill_atoms.toString()),
            input.destination,
            BigInt(input.nonce.toString()),
            network,
          );
        }
        if (input.command === 'MintTokens') {
          return encode_input_for_mint_tokens(
            input.token_id,
            Amount.from_atoms(input.amount.atoms.toString()),
            input.nonce.toString(),
            network,
          );
        }
        if (input.command === 'UnmintTokens') {
          return encode_input_for_unmint_tokens(input.token_id, input.nonce.toString(), network);
        }
        if (input.command === 'LockTokenSupply') {
          return encode_input_for_lock_token_supply(input.token_id, input.nonce.toString(), network);
        }
        if (input.command === 'ChangeTokenAuthority') {
          return encode_input_for_change_token_authority(
            input.token_id,
            input.new_authority,
            input.nonce.toString(),
            network,
          );
        }
        if (input.command === 'ChangeMetadataUri') {
          return encode_input_for_change_token_metadata_uri(
            input.token_id,
            input.new_metadata_uri,
            input.nonce.toString(),
            network,
          );
        }
        if (input.command === 'FreezeToken') {
          return encode_input_for_freeze_token(
            input.token_id,
            input.is_unfreezable ? TokenUnfreezable.Yes : TokenUnfreezable.No,
            input.nonce.toString(),
            network,
          );
        }
        if (input.command === 'UnfreezeToken') {
          return encode_input_for_unfreeze_token(input.token_id, input.nonce.toString(), network);
        }
        if (input.account_type === 'DelegationBalance') {
          return encode_input_for_withdraw_from_delegation(
            input.delegation_id,
            Amount.from_atoms(input.amount.atoms.toString()),
            BigInt(input.nonce.toString()),
            network,
          );
        }
      });

    const inputsArray = [...inputCommands, ...inputsIds].filter((x): x is NonNullable<typeof x> => x !== undefined);

    const outputsArrayItems = transactionJSONrepresentation.outputs.map((output: any) => {
      if (output.type === 'Transfer') {
        if (output.value.type === 'TokenV1') {
          return encode_output_token_transfer(
            Amount.from_atoms(output.value.amount.atoms),
            output.destination,
            output.value.token_id,
            network,
          );
        } else {
          return encode_output_transfer(Amount.from_atoms(output.value.amount.atoms), output.destination, network);
        }
      }
      if (output.type === 'LockThenTransfer') {
        let lockEncoded: Uint8Array = new Uint8Array();
        if (output.lock.type === 'UntilTime') {
          // @ts-ignore
          lockEncoded = encode_lock_until_time(BigInt(output.lock.content.timestamp)); // TODO: check if timestamp is correct
        }
        if (output.lock.type === 'ForBlockCount') {
          lockEncoded = encode_lock_for_block_count(BigInt(output.lock.content));
        }
        if (output.value.type === 'TokenV1') {
          return encode_output_token_lock_then_transfer(
            Amount.from_atoms(output.value.amount.atoms),
            output.destination,
            output.value.token_id,
            lockEncoded,
            network,
          );
        } else {
          return encode_output_lock_then_transfer(
            Amount.from_atoms(output.value.amount.atoms),
            output.destination,
            lockEncoded,
            network,
          );
        }
      }
      if (output.type === 'CreateOrder') {
        return encode_create_order_output(
          Amount.from_atoms(output.ask_balance.atoms.toString()), //ask_amount
          output.ask_currency.type === 'TokenV1' ? output.ask_currency.token_id : null, // ask_token_id
          Amount.from_atoms(output.give_balance.atoms.toString()), //give_amount
          output.give_currency.type === 'TokenV1' ? output.give_currency.token_id : null, //give_token_id
          output.conclude_destination, // conclude_address
          network, // network
        );
      }
      if (output.type === 'BurnToken') {
        if (output.value.type === 'TokenV1') {
          return encode_output_token_burn(
            Amount.from_atoms(output.value.amount.atoms.toString()), // amount
            output.value.token_id, // token_id
            network, // network
          );
        }
        if (output.value.type === 'Coin') {
          return encode_output_coin_burn(
            Amount.from_atoms(output.value.amount.atoms.toString()), // amount
          );
        }
      }
      if (output.type === 'IssueNft') {
        const { name, ticker, description, media_hash, creator, media_uri, icon_uri, additional_metadata_uri } =
          output.data;

        const { destination: address, token_id } = output;

        if (!this.currentBlockHeight) {
          throw new Error('currentBlockHeight is required for IssueNft — call setCurrentBlockHeight(...)');
        }
        const chainTip = this.currentBlockHeight;

        return encode_output_issue_nft(
          token_id as string,
          address,
          name.string,
          ticker.string,
          description.string,
          stringToUint8Array(media_hash.string),
          null, // TODO: check for public key, key hash is not working
          media_uri.string,
          icon_uri.string,
          additional_metadata_uri.string,
          BigInt(chainTip),
          network,
        );
      }
      if (output.type === 'IssueFungibleToken') {
        const { authority, is_freezable, metadata_uri, number_of_decimals, token_ticker, total_supply } = output;

        if (!this.currentBlockHeight) {
          throw new Error('currentBlockHeight is required for IssueFungibleToken — call setCurrentBlockHeight(...)');
        }
        const chainTip = this.currentBlockHeight;

        const is_token_freezable = is_freezable ? FreezableToken.Yes : FreezableToken.No;

        const supply_amount =
          total_supply.type === 'Fixed' ? Amount.from_atoms(total_supply.amount.atoms.toString()) : null;

        const total_supply_type =
          total_supply.type === 'Fixed'
            ? TotalSupply.Fixed
            : total_supply.type === 'Lockable'
              ? TotalSupply.Lockable
              : TotalSupply.Unlimited;

        // const encoder = new TextEncoder()

        return encode_output_issue_fungible_token(
          authority, // ok
          token_ticker.string, // ok
          metadata_uri.string, // ok
          number_of_decimals, // ok
          total_supply_type, // ok
          supply_amount, // ok
          is_token_freezable, // ok
          BigInt(chainTip), // ok
          network,
        );
      }

      if (output.type === 'DataDeposit') {
        return encode_output_data_deposit(new TextEncoder().encode(output.data));
      }

      if (output.type === 'CreateDelegationId') {
        return encode_output_create_delegation(output.pool_id, output.destination, network);
      }

      if (output.type === 'DelegateStaking') {
        return encode_output_delegate_staking(Amount.from_atoms(output.amount.atoms), output.delegation_id, network);
      }

      if (output.type === 'Htlc') {
        let refund_timelock: Uint8Array = new Uint8Array();

        if (output.htlc.refund_timelock.type === 'UntilTime') {
          refund_timelock = encode_lock_until_time(BigInt(output.htlc.refund_timelock.content.timestamp)); // TODO: check if timestamp is correct
        }
        if (output.htlc.refund_timelock.type === 'ForBlockCount') {
          refund_timelock = encode_lock_for_block_count(BigInt(output.htlc.refund_timelock.content));
        }

        return encode_output_htlc(
          Amount.from_atoms(output.value.amount.atoms),
          output.value.token_id,
          output.htlc.secret_hash.hex,
          output.htlc.spend_key,
          output.htlc.refund_key,
          refund_timelock,
          network,
        );
      }
    });
    const outputsArray = outputsArrayItems.filter((x: any): x is NonNullable<typeof x> => x !== undefined);

    const inputAddresses: string[] = (transactionJSONrepresentation.inputs as UtxoInput[])
      // @ts-ignore
      .filter(({ input, utxo }) => input.input_type === 'UTXO' || utxo?.htlc)
      .map((input) => {
        if (input.utxo.destination){
          return input.utxo.destination;
        }
        // @ts-ignore
        if (input?.utxo?.htlc) {
          // @ts-ignore
          return [input.utxo.htlc.spend_key, input.utxo.htlc.refund_key]; // TODO: need to handle spend too
        }
      }).flat();

    // @ts-ignore
    if (transactionJSONrepresentation.inputs[0].input.account_type === 'DelegationBalance') {
      // @ts-ignore
      inputAddresses.push(transactionJSONrepresentation.outputs[0].destination);
    }
    // @ts-ignore
    if (transactionJSONrepresentation.inputs[0].input.input_type === 'AccountCommand') {
      // @ts-ignore
      if (transactionJSONrepresentation.inputs[0].input.destination) {
        // @ts-ignore
        inputAddresses.push(transactionJSONrepresentation.inputs[0].input.destination);
      }
      // @ts-ignore
      if (transactionJSONrepresentation.inputs[0].input.authority) {
        // @ts-ignore
        inputAddresses.push(transactionJSONrepresentation.inputs[0].input.authority);
      }
    }
    // @ts-ignore
    if (transactionJSONrepresentation.inputs[0].input.input_type === 'Account') {
      // @ts-ignore
      if (transactionJSONrepresentation.inputs[0].input.destination) {
        // @ts-ignore
        inputAddresses.push(transactionJSONrepresentation.inputs[0].input.destination);
      }
      // @ts-ignore
      if (transactionJSONrepresentation.inputs[0].input.authority) {
        // @ts-ignore
        inputAddresses.push(transactionJSONrepresentation.inputs[0].input.authority);
      }
    }

    const transactionsize = estimate_transaction_size(
      mergeUint8Arrays(inputsArray),
      inputAddresses,
      mergeUint8Arrays(outputsArray),
      network,
    );

    return {
      inputs: inputsArray,
      outputs: outputsArray,
      transactionsize,
    };
  }

  // outputs
  transfer(destination: string, amount: string): Output {
    return {
      type: 'Transfer',
      destination: destination,
      value: {
        type: 'Coin',
        amount: {
          atoms: amount,
          decimal: amount,
        },
      },
    }
  }

  transferToken(destination: string, amount: string, token_id: string): Output {
    return {
      type: 'Transfer',
      destination,
      value: {
        type: 'TokenV1',
        token_id,
        amount: {
          atoms: amount,
          decimal: amount,
        },
      },
    };
  }

  transferNft(destination: string, token_id: string): Output {
    return this.transferToken(destination, '1', token_id);
  }

  // actions
  stakingWithdraw() {
    return {
      type: 'StakingWithdraw',
      params: {
        delegation_id: '',
        amount: 0,
      },
    }
  }

}
