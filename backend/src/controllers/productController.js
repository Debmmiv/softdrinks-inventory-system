// TODO (Member 4): implement product management.
const notImplemented = (todo) => (req, res) =>
  res.status(501).json({ error: 'Not implemented yet', todo });

module.exports = {
  // Return active products with their current stock (join Product and Inventory).
  listProducts: notImplemented('List active products with total_bottles'),
  // Owner only: create a product and an Inventory row starting at 0 bottles.
  createProduct: notImplemented('Create product and its inventory row'),
  // Owner only: edit fields or deactivate with { active: false }.
  updateProduct: notImplemented('Update or deactivate a product'),
};
