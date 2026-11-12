const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function mergeUint8Arrays(arrays: Uint8Array[]) {
  const totalLength = arrays.reduce((sum: number, arr: Uint8Array) => sum + arr.length, 0);

  const result = new Uint8Array(totalLength);

  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }

  return result;
}

function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function hexToUint8Array(hex: any) {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }

  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < array.length; i++) {
    array[i] = parseInt(hex.substr(i * 2, 2), 16);
  }

  return array;
}

function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function atomsToDecimal(atoms: string | number, decimals: number): string {
  const atomsStr = atoms.toString();
  const atomsLength = atomsStr.length;

  if (decimals === 0) {
    return atomsStr;
  }

  if (atomsLength <= decimals) {
    // Pad with leading zeros
    const padded = atomsStr.padStart(decimals, '0');
    const fractionalPart = padded.replace(/0+$/, '');
    return fractionalPart === '' ? '0' : '0.' + fractionalPart;
  }

  // Insert decimal point
  const integerPart = atomsStr.slice(0, atomsLength - decimals);
  const fractionalPart = atomsStr.slice(atomsLength - decimals).replace(/0+$/, '');

  return fractionalPart === '' ? integerPart : `${integerPart}.${fractionalPart}`;
}

/** Convert a decimal amount without passing string amounts through a JS number.
 * Extra fractional digits round to the nearest atom, away from zero on ties.
 * Number inputs retain the previous toFixed rounding behavior.
 */
export function decimalsToAtoms(value: string | number, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 100) {
    throw new Error('Decimals must be an integer between 0 and 100');
  }
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Invalid decimal amount');
  const text = typeof value === 'number' && Math.abs(value) < 1e21 ? value.toFixed(decimals) : String(value).trim();
  const normalized = text.replace(/^([+-]?)\./, (_match, sign: string) => `${sign}0.`);
  const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(normalized);
  if (!match) throw new Error('Invalid decimal amount');
  const exponent = Number(match[4] ?? 0);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1000) throw new Error('Decimal exponent out of range');
  const digits = match[2] + (match[3] ?? '');
  const shift = decimals + exponent - (match[3]?.length ?? 0);
  let magnitude: bigint;
  if (shift >= 0) magnitude = BigInt(digits) * 10n ** BigInt(shift);
  else {
    const divisor = 10n ** BigInt(-shift);
    const integer = BigInt(digits);
    magnitude = integer / divisor + (integer % divisor * 2n >= divisor ? 1n : 0n);
  }
  return match[1] === '-' ? -magnitude : magnitude;
}

export function decimals(value: string | number, precision: number): string {
  const atoms = decimalsToAtoms(value, precision);
  return `${atoms < 0n ? '-' : ''}${atomsToDecimal((atoms < 0n ? -atoms : atoms).toString(), precision)}`;
}

export { mergeUint8Arrays, stringToUint8Array, hexToUint8Array, uint8ArrayToHex, BASE58_ALPHABET, atomsToDecimal };
