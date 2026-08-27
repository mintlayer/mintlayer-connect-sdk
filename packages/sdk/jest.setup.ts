import fetchMock from 'jest-fetch-mock';
// import 'whatwg-fetch';
globalThis.fetch = fetchMock as any;
fetchMock.enableMocks();

import { TextDecoder, TextEncoder } from 'util';

Object.assign(global, {
  TextDecoder,
  TextEncoder,
});
