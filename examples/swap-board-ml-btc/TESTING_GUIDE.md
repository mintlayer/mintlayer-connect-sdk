# Testing Guide: ML/BTC Atomic Swap HTLC Flow

## Overview
This guide covers testing both HTLC creation flows after the fix that allows BTC HTLC to be created first.

## Test Scenarios

### Scenario 1: Creator Offers ML, Taker Offers BTC (Original Flow)

**Setup:**
1. Creator creates offer: 100 ML → 0.001 BTC
2. Taker accepts offer with BTC address and public key

**Expected Flow:**

#### Step 1: Creator Creates ML HTLC
- **Action:** Creator clicks "Create ML HTLC"
- **Expected:**
  - ML HTLC transaction created and broadcasted
  - Status changes to `htlc_created`
  - Secret hash extracted from transaction and saved to database
  - Console log: "Extracted secret hash from ML HTLC: [hash]"
  - Alert: "HTLC created and broadcasted successfully! TX ID: [txId]"

**Verification:**
```javascript
// Check database
swap.status === 'htlc_created'
swap.creatorHtlcTxHash !== null
swap.creatorHtlcTxHex !== null
swap.secretHash !== null  // ✅ NEW: Should be saved
```

#### Step 2: Taker Creates BTC HTLC
- **Action:** Taker clicks "Create BTC HTLC" (in BTC section)
- **Expected:**
  - Uses saved secret hash from ML HTLC
  - Console log: "Creating BTC HTLC as SECOND HTLC (taker offers BTC)"
  - Console log: "Using saved secret hash: [hash]"
  - BTC HTLC transaction created and broadcasted
  - Status changes to `both_htlcs_created`
  - Alert: "BTC HTLC created successfully! TX ID: [txId]"

**Verification:**
```javascript
// Check database
swap.status === 'both_htlcs_created'
swap.btcHtlcTxId !== null
swap.btcHtlcTxHex !== null
swap.btcRedeemScript !== null
swap.btcHtlcAddress !== null
```

#### Step 3: Claims
- Creator claims BTC HTLC (reveals secret)
- Taker claims ML HTLC (using revealed secret)
- Status: `fully_completed`

---

### Scenario 2: Creator Offers BTC, Taker Offers ML (NEW Flow)

**Setup:**
1. Creator creates offer: 0.001 BTC → 100 ML
2. Taker accepts offer with ML address

**Expected Flow:**

#### Step 1: Creator Creates BTC HTLC
- **Action:** Creator clicks "Create BTC HTLC"
- **Expected:**
  - Console log: "Creating BTC HTLC as FIRST HTLC (creator offers BTC)"
  - Placeholder secret hash used: `0000000000000000000000000000000000000000`
  - Wallet generates actual secret hash
  - BTC HTLC transaction created and broadcasted
  - Status changes to `btc_htlc_created`
  - Secret hash from wallet response saved to database
  - Console log: "Saved secret hash from BTC wallet: [hash]"
  - Alert: "BTC HTLC created successfully! TX ID: [txId]"

**Verification:**
```javascript
// Check database
swap.status === 'btc_htlc_created'
swap.btcHtlcTxId !== null
swap.btcHtlcTxHex !== null
swap.btcRedeemScript !== null
swap.btcHtlcAddress !== null
swap.secretHash !== null  // ✅ NEW: Should be saved from BTC wallet
```

**Critical Check:**
```javascript
// Verify wallet response structure
const response = {
  htlcAddress: string,
  secretHashHex: string,      // ✅ Must be present
  transactionId: string,
  signedTxHex: string,
  redeemScript: string,
}
```

#### Step 2: Taker Creates ML HTLC
- **Action:** Taker clicks "Create Counterparty HTLC"
- **Expected:**
  - Uses saved secret hash from BTC HTLC
  - Console log: "Using saved secret hash: [hash]"
  - ML HTLC transaction created and broadcasted
  - Status changes to `in_progress` or `both_htlcs_created`
  - Alert: "Counterparty HTLC created and broadcasted successfully! TX ID: [txId]"

**Verification:**
```javascript
// Check database
swap.status === 'in_progress' || swap.status === 'both_htlcs_created'
swap.takerHtlcTxHash !== null
swap.takerHtlcTxHex !== null

// Verify same secret hash used
// Extract secret hash from ML HTLC transaction
const mlSecretHash = extractFromMLHTLC(swap.takerHtlcTxHash)
mlSecretHash === swap.secretHash  // ✅ Must match
```

#### Step 3: Claims
- Taker claims BTC HTLC (reveals secret)
- Creator claims ML HTLC (using revealed secret)
- Status: `fully_completed`

---

## Edge Cases to Test

### Test 3: Fallback to Blockchain Extraction (ML First)

**Scenario:** Secret hash not saved for some reason

**Setup:**
1. Manually clear `swap.secretHash` in database after ML HTLC creation
2. Taker tries to create BTC HTLC

**Expected:**
- Console log: "Secret hash not saved, fetching from blockchain..."
- Fetches ML HTLC transaction from blockchain API
- Extracts secret hash from transaction
- Console log: "Extracted secret hash from ML HTLC: [hash]"
- BTC HTLC created successfully

### Test 4: Error Handling - No Creator HTLC

**Scenario:** Taker tries to create HTLC before creator

**Setup:**
1. Taker tries to create counterparty HTLC immediately after accepting offer

**Expected:**
- Alert: "Creator HTLC must be created first"
- No HTLC created

### Test 5: Error Handling - Wrong User

**Scenario:** Wrong user tries to create HTLC

**Setup:**
1. Taker tries to create first HTLC
2. Creator tries to create second HTLC

**Expected:**
- Alert: "You are not the one who should create the BTC HTLC"
- No HTLC created

---

## Console Log Checklist

### ML HTLC Creation (First):
```
✅ "HTLC signed: [hex]"
✅ "HTLC broadcast result: [result]"
✅ "Extracted secret hash from ML HTLC: [hash]"
```

### BTC HTLC Creation (First):
```
✅ "Creating BTC HTLC as FIRST HTLC (creator offers BTC)"
✅ "Saved secret hash from BTC wallet: [hash]"
```

### BTC HTLC Creation (Second):
```
✅ "Creating BTC HTLC as SECOND HTLC (taker offers BTC)"
✅ "Using saved secret hash: [hash]"
OR
✅ "Secret hash not saved, fetching from blockchain..."
✅ "ML HTLC transaction data: [data]"
✅ "Extracted secret hash from ML HTLC: [hash]"
```

### ML HTLC Creation (Second):
```
✅ "Using saved secret hash: [hash]"
OR
✅ "Secret hash not saved, fetching from ML HTLC blockchain..."
✅ "Creator ML HTLC transaction data: [data]"
✅ "Extracted secret hash from creator ML HTLC: [hash]"
```

---

## Database State Verification

### After First HTLC (ML):
```sql
SELECT 
  status,              -- 'htlc_created'
  creatorHtlcTxHash,   -- NOT NULL
  creatorHtlcTxHex,    -- NOT NULL
  secretHash,          -- NOT NULL ✅ NEW
  btcHtlcTxId          -- NULL
FROM Swap WHERE id = ?
```

### After First HTLC (BTC):
```sql
SELECT 
  status,              -- 'btc_htlc_created'
  btcHtlcTxId,         -- NOT NULL
  btcHtlcTxHex,        -- NOT NULL
  btcRedeemScript,     -- NOT NULL
  btcHtlcAddress,      -- NOT NULL
  secretHash,          -- NOT NULL ✅ NEW
  creatorHtlcTxHash    -- NULL
FROM Swap WHERE id = ?
```

### After Second HTLC:
```sql
SELECT 
  status,              -- 'both_htlcs_created' or 'in_progress'
  creatorHtlcTxHash,   -- NOT NULL (if ML first) OR NULL (if BTC first)
  btcHtlcTxId,         -- NOT NULL (if BTC first) OR NOT NULL (if BTC second)
  takerHtlcTxHash,     -- NOT NULL (if ML second) OR NULL
  secretHash           -- NOT NULL
FROM Swap WHERE id = ?
```

---

## Performance Verification

### With Secret Hash Saved (Optimized):
- **ML HTLC Creation:** ~2-3 seconds (includes 2s wait for indexing)
- **BTC HTLC Creation (Second):** ~1-2 seconds (no blockchain API call)
- **ML HTLC Creation (Second):** ~1-2 seconds (no blockchain API call)

### Without Secret Hash (Fallback):
- **BTC HTLC Creation (Second):** ~3-5 seconds (includes blockchain API call)
- **ML HTLC Creation (Second):** ~3-5 seconds (includes blockchain API call)

---

## Wallet Integration Tests

### Test BTC Wallet Secret Hash Generation:
```javascript
// When creating BTC HTLC with placeholder
const request = {
  amount: '100000',
  secretHash: '0000000000000000000000000000000000000000',
  recipientPublicKey: '...',
  refundPublicKey: '...',
  timeoutBlocks: 144
}

const response = await wallet.signTransaction({ 
  chain: 'bitcoin', 
  txData: { JSONRepresentation: request } 
})

// Verify response structure
console.assert(response.htlcAddress, 'htlcAddress missing')
console.assert(response.secretHashHex, 'secretHashHex missing')  // ✅ CRITICAL
console.assert(response.transactionId, 'transactionId missing')
console.assert(response.signedTxHex, 'signedTxHex missing')
console.assert(response.redeemScript, 'redeemScript missing')

// Verify secret hash format
console.assert(response.secretHashHex.length === 40, 'Invalid secret hash length')
console.assert(/^[0-9a-f]+$/i.test(response.secretHashHex), 'Invalid secret hash format')
```

---

## Success Criteria

✅ **Scenario 1 (ML First):** Complete atomic swap with ML HTLC created first
✅ **Scenario 2 (BTC First):** Complete atomic swap with BTC HTLC created first
✅ **Secret Hash Saved:** Secret hash saved to database in both scenarios
✅ **Optimization Works:** Saved secret hash used when available (no API call)
✅ **Fallback Works:** Blockchain extraction works when secret hash not saved
✅ **Error Handling:** Appropriate errors for invalid flows
✅ **Status Updates:** Correct status transitions in both flows
✅ **Claims Work:** Both parties can claim HTLCs successfully
✅ **Secret Revealed:** Secret properly revealed and extracted during claims

---

## Troubleshooting

### Issue: Secret hash not saved from BTC wallet
**Check:**
- Wallet response includes `secretHashHex` field
- `response.secretHashHex` is not undefined or null
- Database update includes `secretHash` field

### Issue: ML HTLC secret hash extraction fails
**Check:**
- 2-second delay is sufficient for transaction indexing
- Blockchain API is accessible
- Transaction has HTLC output with secret_hash field

### Issue: Taker cannot create second HTLC
**Check:**
- Creator's first HTLC exists in database
- Secret hash is saved or can be extracted
- User role detection is correct (isUserCreator logic)

### Issue: Wrong status after HTLC creation
**Check:**
- `isBTCFirstHTLC` and `isBTCSecondHTLC` logic is correct
- Status update uses correct value based on HTLC order
- Both HTLCs exist before setting `both_htlcs_created`

