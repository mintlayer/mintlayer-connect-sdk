import { decimalsToAtoms, atomsToDecimal } from '../src/mintlayer-connect-sdk';

test('decimalsToAtoms', async () => {
  // @ts-ignore
  expect(decimalsToAtoms(1, 11)).toEqual(100000000000n);
  // @ts-ignore
  expect(decimalsToAtoms(1.005, 11)).toEqual(100500000000n);
});

test('decimal strings retain atoms beyond Number.MAX_SAFE_INTEGER', () => {
  expect(decimalsToAtoms('9007199254740993', 0)).toBe(9007199254740993n);
  expect(decimalsToAtoms('9007199254740993.00000001', 8)).toBe(900719925474099300000001n);
  expect(decimalsToAtoms('0.000000000000000001', 18)).toBe(1n);
  expect(decimalsToAtoms('1e-8', 8)).toBe(1n);
  expect(decimalsToAtoms('1.005', 2)).toBe(101n);
  expect(decimalsToAtoms('.5', 2)).toBe(50n);
  expect(() => decimalsToAtoms('NaN', 8)).toThrow('Invalid decimal');
});
