import type { BranchInfo, BranchPreparationPlan, ExecutionRequest, TokenRef, WalletSnapshot } from './types';

function utxoAsset(utxo: WalletSnapshot['utxos'][number]): TokenRef {
  const value = (utxo.utxo as { value?: { type?: string; token_id?: string } }).value;
  if (value?.type === 'TokenV1') {
    return value.token_id ?? 'unknown';
  }

  return 'Coin';
}

function amountAtoms(utxo: WalletSnapshot['utxos'][number]): string {
  const value = (utxo.utxo as { value?: { amount?: { atoms?: string | number } } }).value;
  return String(value?.amount?.atoms ?? '0');
}

function outpointKey(utxo: WalletSnapshot['utxos'][number]): string {
  return `${utxo.txId}:${utxo.outputIndex}`;
}

export function analyzeBranches(snapshot: WalletSnapshot | null, maxDepth: number): BranchInfo[] {
  if (!snapshot) {
    return [];
  }

  return snapshot.utxos
    .filter((utxo) => utxo.status === 'confirmed' || utxo.status === 'unconfirmed')
    .map((utxo, index) => {
      const depth = utxo.unconfirmedChainDepth;
      const remainingDepth = Math.max(0, maxDepth - depth);
      const warning =
        remainingDepth <= 0
          ? 'Depth budget exhausted'
          : remainingDepth <= 3
            ? 'Depth budget is low'
            : null;

      return {
        id: `branch-${index + 1}`,
        asset: utxoAsset(utxo),
        outpoint: outpointKey(utxo),
        status: utxo.status,
        amountAtoms: amountAtoms(utxo),
        depth,
        remainingDepth,
        reserved: utxo.status === 'spent_pending',
        warning,
      };
    })
    .sort((a, b) => b.remainingDepth - a.remainingDepth);
}

export function chooseBranch(branches: BranchInfo[], asset: TokenRef): BranchInfo | null {
  return branches.find((branch) => branch.asset === asset && branch.remainingDepth > 0 && !branch.reserved) ?? null;
}

export function createBranchPreparationPlan(args: {
  snapshot: WalletSnapshot | null;
  sourceAsset: TokenRef;
  targetBranchCount: number;
  perBranchAmount: number;
}): BranchPreparationPlan {
  const { snapshot, sourceAsset, targetBranchCount, perBranchAmount } = args;
  const destination = snapshot?.addresses.receiving[0] ?? '';
  const warnings: string[] = [];
  const actions: ExecutionRequest[] = [];

  if (!snapshot || !destination) {
    warnings.push('Initialize the wallet before preparing branches.');
    return { sourceAsset, targetBranchCount, perBranchAmount, destination, actions, warnings };
  }

  const existingBranches = analyzeBranches(snapshot, Number.MAX_SAFE_INTEGER).filter((branch) => branch.asset === sourceAsset);
  const missingBranches = Math.max(0, targetBranchCount - existingBranches.length);

  if (missingBranches === 0) {
    warnings.push('Requested branch count is already available in local wallet state.');
  }

  if (perBranchAmount <= 0) {
    warnings.push('Per-branch amount must be positive.');
  }

  if (missingBranches > 1) {
    warnings.push('Prepare branches one at a time unless the API confirms each prior transaction in mempool to avoid accidental double-spends.');
  }

  for (let index = 0; index < missingBranches; index += 1) {
    const id = `prepare:${sourceAsset}:${destination}:${perBranchAmount}:${index}`;
    actions.push({
      id,
      kind: 'prepare-utxo',
      to: destination,
      amount: perBranchAmount,
      tokenId: sourceAsset === 'Coin' ? undefined : sourceAsset,
      description: `Prepare branch ${existingBranches.length + index + 1} with ${perBranchAmount} ${sourceAsset}.`,
      idempotencyKey: id,
    });
  }

  return {
    sourceAsset,
    targetBranchCount,
    perBranchAmount,
    destination,
    actions,
    warnings,
  };
}
