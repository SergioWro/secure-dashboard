const EBAY_FEE = 0.1325; // approx. final value fee, varies by category
const SHIPPING = 3.99;   // flat guess for media mail

export function profitOf(price, cost = 0) {
  if (price == null) return null;
  return +(price * (1 - EBAY_FEE) - SHIPPING - cost).toFixed(2);
}

// 0-100. 70 points for profit (capped at $15), 30 for demand.
// Demand uses sell-through (0..1) when known, otherwise a neutral 15.
export function flipScore(profit, sellThrough = null) {
  if (profit == null) return null;
  const p = Math.max(0, Math.min(profit / 15, 1)) * 70;
  const d = sellThrough == null ? 15 : Math.max(0, Math.min(sellThrough, 1)) * 30;
  return Math.round(p + d);
}
