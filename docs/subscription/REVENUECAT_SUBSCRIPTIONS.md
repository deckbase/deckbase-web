# RevenueCat Subscriptions (Web)

This app uses the [RevenueCat Web SDK](https://www.revenuecat.com/docs/getting-started/installation/web-sdk) to sell subscriptions on the web. The SDK is configured with the logged-in user's Firebase UID so subscriptions are shared across web and mobile if you use the same entitlement in RevenueCat.

## Setup

1. **RevenueCat project**
   - Sign up at [RevenueCat](https://app.revenuecat.com) and create a project.
   - In **Apps & providers**, add a **Web Billing** app (RevenueCat Web Billing with Stripe, or Paddle).
   - Complete the Web Billing setup (Stripe account, appearance, products). See [Web Billing](https://production-docs.revenuecat.com/docs/web/web-billing/web-sdk).

2. **Entitlements & products**
   - Create an entitlement (e.g. `pro`) and attach your subscription products to it.
   - Configure offerings in the RevenueCat dashboard so the paywall has packages to show.

3. **Environment**
   - In the Web Billing app config, copy the **Public API Key** (safe for client-side).
   - Add to `.env` and `.env.prod`:
     ```bash
     NEXT_PUBLIC_REVENUECAT_WEB_API_KEY=your_public_api_key_here
     ```
   - For local testing you can use the **Sandbox API Key** from the same page; do not use it in production.

## Usage in the app

- **Subscription page:** `/dashboard/subscription` shows status (Active / Free plan) and a “View plans” button that opens the RevenueCat paywall.
- **Context:** `useRevenueCat()` from `@/contexts/RevenueCatContext` provides:
  - `customerInfo` – current customer info from RevenueCat
  - `isEntitledTo(identifier)` – returns `true` if the user has the given entitlement (default: `pro`)
  - `presentPaywall(options?)` – opens the RevenueCat paywall (e.g. to gate a feature)
  - `refreshCustomerInfo()` – refetches subscription status

## Gating a feature by subscription

```js
import { useRevenueCat } from "@/contexts/RevenueCatContext";

function MyFeature() {
  const { isEntitledTo, presentPaywall } = useRevenueCat();
  const [entitled, setEntitled] = useState(false);

  useEffect(() => {
    isEntitledTo("pro").then(setEntitled);
  }, [isEntitledTo]);

  if (!entitled) {
    return (
      <button onClick={() => presentPaywall()}>
        Subscribe to unlock
      </button>
    );
  }
  return <div>Premium content</div>;
}
```

## Entitlement identifier

The default entitlement used in the subscription page and in `isEntitledTo()` is **`pro`**. You can change it by passing `entitlementId` to `RevenueCatProvider` in `LayoutClient.js`, or pass a different identifier when calling `isEntitledTo("your_entitlement_id")`.

## References

- [RevenueCat Web SDK installation](https://www.revenuecat.com/docs/getting-started/installation/web-sdk)
- [Web Billing & SDK configuration](https://production-docs.revenuecat.com/docs/web/web-billing/web-sdk)
- [Configuring the SDK](https://production-docs.revenuecat.com/docs/getting-started/configuring-sdk)
