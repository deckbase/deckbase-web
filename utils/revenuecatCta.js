/**
 * Helpers for RevenueCat Web Billing CTA text.
 * RevenueCat includes `freeTrialPhase` only when the current customer is trial-eligible.
 */

export function getWebBillingProduct(pkg) {
  return pkg?.webBillingProduct || pkg?.rcBillingProduct;
}

export function getPaidPlanPurchaseLabel(pkg) {
  const product = getWebBillingProduct(pkg);
  if (!product) return "Subscribe";
  if (product.freeTrialPhase) return "Start free trial";
  return "Subscribe";
}
