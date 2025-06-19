import { decimalsToAtoms, atomsToDecimal } from '../src/mintlayer-connect-sdk';

test('decimalsToAtoms', async () => {
  // @ts-ignore
  expect(decimalsToAtoms(1, 11)).toEqual(100000000000n);
  // @ts-ignore
  expect(decimalsToAtoms(1.005, 11)).toEqual(100500000000n);
});
