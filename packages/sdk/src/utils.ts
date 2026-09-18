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

export function decimalsToAtoms(value: string | number, decimals: number): bigint {
  const v = Number(value);
  const [intPart, fracPart = ''] = v.toFixed(decimals).split('.');
  const paddedFrac = (fracPart + '0'.repeat(decimals)).slice(0, decimals);
  const full = intPart + paddedFrac;
  return BigInt(full);
}

export function decimals(value: string | number, decimals: number): string {
  const v = Number(value);
  if (isNaN(v)) return '0';
  return v.toFixed(decimals).replace(/\.?0+$/, '');
}

export { mergeUint8Arrays, stringToUint8Array, hexToUint8Array, uint8ArrayToHex, BASE58_ALPHABET, atomsToDecimal };
