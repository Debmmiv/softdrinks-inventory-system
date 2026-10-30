// TODO (Members 3 and 4): implement POST /api/sync.
//
// Request body:  { transactions: [ { transaction_id, product_id, type, cases,
//                  bottles, total_bottles, party, device_id, created_at } ] }
// Response body: { results: [ { transaction_id, status, error? } ] }
//                status is SYNCED, DUPLICATE or FAILED.
//
// For each transaction, in order:
//   1. Reject it if required fields are missing or the type is not allowed.
//   2. If a Transaction with the same transaction_id exists, return DUPLICATE.
//   3. For a RELEASE, check that Inventory.total_bottles covers the amount.
//      If not, return FAILED with the reason "Insufficient stock".
//   4. Save the Transaction (the unique index also blocks duplicates).
//   5. Update Inventory with an atomic $inc on total_bottles.
async function syncTransactions(req, res) {
  res.status(501).json({ error: 'Not implemented yet', todo: 'See the steps in syncController.js' });
}

module.exports = { syncTransactions };
