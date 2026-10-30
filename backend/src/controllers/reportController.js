// TODO (Member 5): implement the reports.
const notImplemented = (todo) => (req, res) =>
  res.status(501).json({ error: 'Not implemented yet', todo });

module.exports = {
  // Current stock per product in cases and bottles.
  getStock: notImplemented('Aggregate Inventory with Product pack sizes'),
  // Transactions between two dates (query: from, to).
  getMovements: notImplemented('Query Transaction by date range'),
  // Products at or below reorder_level_cases.
  getReplenishment: notImplemented('Compare stock with reorder level'),
};
