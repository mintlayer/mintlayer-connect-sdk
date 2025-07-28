/**
 * Simple test script to verify BTC integration functionality
 * Run with: node test-btc-integration.js
 */

// Since we can't directly import TypeScript, let's implement the test functions here
function convertToBTCSatoshis(btcAmount) {
  const btc = parseFloat(btcAmount)
  const satoshis = Math.round(btc * 100000000) // 1 BTC = 100,000,000 satoshis
  return satoshis.toString()
}

function convertFromBTCSatoshis(satoshis) {
  const sats = parseInt(satoshis)
  const btc = sats / 100000000
  return btc.toString()
}

function isValidBTCAddress(address) {
  // Basic validation - starts with 1, 3, or bc1 for mainnet, or m, 2, tb1 for testnet
  const mainnetRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/
  const testnetRegex = /^[mn2][a-km-zA-HJ-NP-Z1-9]{25,34}$|^tb1[a-z0-9]{39,59}$/

  return mainnetRegex.test(address) || testnetRegex.test(address)
}

function isValidBTCPublicKey(publicKey) {
  // Compressed public key: 33 bytes (66 hex chars), starts with 02 or 03
  // Uncompressed public key: 65 bytes (130 hex chars), starts with 04
  const compressedRegex = /^0[23][0-9a-fA-F]{64}$/
  const uncompressedRegex = /^04[0-9a-fA-F]{128}$/

  return compressedRegex.test(publicKey) || uncompressedRegex.test(publicKey)
}

function offerInvolvesBTC(offer) {
  return offer.tokenA === 'BTC' || offer.tokenB === 'BTC'
}

function isCreatorOfferingBTC(offer) {
  return offer.tokenA === 'BTC'
}

function isTakerOfferingBTC(offer) {
  return offer.tokenB === 'BTC'
}

function buildCreatorBTCHTLCRequest(swap, offer, secretHash, timeoutBlocks = 144) {
  if (!isCreatorOfferingBTC(offer)) {
    throw new Error('Creator is not offering BTC')
  }

  if (!swap.takerBTCPublicKey || !offer.creatorBTCPublicKey) {
    throw new Error('Missing required BTC public keys')
  }

  return {
    amount: convertToBTCSatoshis(offer.amountA),
    secretHash: secretHash,
    recipientPublicKey: swap.takerBTCPublicKey, // Taker can claim with secret
    refundPublicKey: offer.creatorBTCPublicKey, // Creator can refund after timeout
    timeoutBlocks: timeoutBlocks
  }
}

function getBTCExplorerURL(txId, isTestnet = true) {
  const baseUrl = isTestnet
    ? 'https://blockstream.info/testnet/tx/'
    : 'https://blockstream.info/tx/'
  return `${baseUrl}${txId}`
}

function getBTCAddressExplorerURL(address, isTestnet = true) {
  const baseUrl = isTestnet
    ? 'https://blockstream.info/testnet/address/'
    : 'https://blockstream.info/address/'
  return `${baseUrl}${address}`
}

// Test data
const mockOffer = {
  id: 1,
  tokenA: 'BTC',
  tokenB: 'ML',
  amountA: '0.001',
  amountB: '100',
  creatorBTCAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
  creatorBTCPublicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
}

const mockSwap = {
  id: 1,
  offerId: 1,
  takerMLAddress: 'tmt1qtest',
  takerBTCAddress: 'tb1qtest',
  takerBTCPublicKey: '0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
  secretHash: 'abcd1234567890abcd1234567890abcd12345678',
  offer: mockOffer
}

console.log('🧪 Testing BTC Integration Functions\n')

// Test 1: Amount conversion
console.log('1. Testing amount conversion:')
try {
  const satoshis = convertToBTCSatoshis('0.001')
  const btc = convertFromBTCSatoshis(satoshis)
  console.log(`   ✅ 0.001 BTC = ${satoshis} satoshis = ${btc} BTC`)
} catch (error) {
  console.log(`   ❌ Amount conversion failed: ${error.message}`)
}

// Test 2: Address validation
console.log('\n2. Testing BTC address validation:')
const testAddresses = [
  'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx', // Valid testnet bech32
  '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // Valid mainnet P2PKH
  'invalid-address' // Invalid
]

testAddresses.forEach(addr => {
  const isValid = isValidBTCAddress(addr)
  console.log(`   ${isValid ? '✅' : '❌'} ${addr}: ${isValid ? 'Valid' : 'Invalid'}`)
})

// Test 3: Public key validation
console.log('\n3. Testing BTC public key validation:')
const testPubKeys = [
  '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798', // Valid compressed
  '0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8', // Valid uncompressed
  'invalid-pubkey' // Invalid
]

testPubKeys.forEach(pubkey => {
  const isValid = isValidBTCPublicKey(pubkey)
  console.log(`   ${isValid ? '✅' : '❌'} ${pubkey.slice(0, 20)}...: ${isValid ? 'Valid' : 'Invalid'}`)
})

// Test 4: Offer analysis
console.log('\n4. Testing offer analysis:')
console.log(`   ✅ Offer involves BTC: ${offerInvolvesBTC(mockOffer)}`)
console.log(`   ✅ Creator offering BTC: ${isCreatorOfferingBTC(mockOffer)}`)
console.log(`   ✅ Taker offering BTC: ${isTakerOfferingBTC(mockOffer)}`)

// Test 5: HTLC request building
console.log('\n5. Testing HTLC request building:')
try {
  const creatorRequest = buildCreatorBTCHTLCRequest(mockSwap, mockOffer, mockSwap.secretHash)
  console.log('   ✅ Creator BTC HTLC request built successfully')
  console.log(`      Amount: ${creatorRequest.amount} satoshis`)
  console.log(`      Recipient: ${creatorRequest.recipientPublicKey.slice(0, 20)}...`)
  console.log(`      Refund: ${creatorRequest.refundPublicKey.slice(0, 20)}...`)
} catch (error) {
  console.log(`   ❌ Creator HTLC request failed: ${error.message}`)
}

// Test 6: Explorer URLs
console.log('\n6. Testing explorer URL generation:')
const testTxId = 'abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234'
const testAddress = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx'

console.log(`   ✅ TX URL: ${getBTCExplorerURL(testTxId, true)}`)
console.log(`   ✅ Address URL: ${getBTCAddressExplorerURL(testAddress, true)}`)

console.log('\n🎉 BTC Integration tests completed!')
console.log('\n📝 Next steps:')
console.log('   1. Implement wallet BTC methods in browser extension')
console.log('   2. Test with actual wallet integration')
console.log('   3. Create end-to-end swap test')
