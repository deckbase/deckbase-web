"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Purchases } from "@revenuecat/purchases-js";
import { useAuth } from "@/contexts/AuthContext";
import { REVENUECAT_ENTITLEMENT_ID } from "@/lib/revenuecat-config";

const RevenueCatContext = createContext({
  isConfigured: false,
  customerInfo: null,
  loading: true,
  isEntitledTo: async () => false,
  isVip: false,
  isPro: false,
  getOfferings: async () => ({ current: null, all: {} }),
  purchase: async () => ({}),
  presentPaywall: async () => {},
  refreshCustomerInfo: async () => null,
  error: null,
});

export const useRevenueCat = () => useContext(RevenueCatContext);

/** Default entitlement id – set in lib/revenuecat-config.js and match in RevenueCat dashboard */
export const DEFAULT_ENTITLEMENT_ID = REVENUECAT_ENTITLEMENT_ID;

export function RevenueCatProvider({ children, entitlementId = REVENUECAT_ENTITLEMENT_ID }) {
  const { user } = useAuth();
  const [customerInfo, setCustomerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [entitled, setEntitled] = useState(false);
  const instanceRef = useRef(null);

  // VIP: fetch from server so we can treat VIP as Pro and hide subscription UI
  useEffect(() => {
    if (!user?.uid) {
      setIsVip(false);
      return;
    }
    let mounted = true;
    user
      .getIdToken()
      .then((token) =>
        fetch("/api/user/vip", { headers: { Authorization: `Bearer ${token}` } })
      )
      .then((res) => (mounted && res?.ok ? res.json() : { isVip: false }))
      .then((data) => {
        if (mounted) setIsVip(!!data?.isVip);
      })
      .catch(() => {
        if (mounted) setIsVip(false);
      });
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  // Next.js inlines NEXT_PUBLIC_* at build time - use only this identifier so it gets replaced
  const apiKey = String(process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY || "").trim();

  const refreshCustomerInfo = useCallback(async () => {
    if (!instanceRef.current) return null;
    try {
      const info = await instanceRef.current.getCustomerInfo();
      setCustomerInfo(info);
      setError(null);
      return info;
    } catch (e) {
      const msg = e?.message || "";
      const backendCode = e?.extra?.backendErrorCode;
      // New users / no purchases: backend 7259 = SubscriberNotFound – treat as free plan, not error
      const isSubscriberNotFound =
        backendCode === 7259 || /not found|404|subscriber.*not found/i.test(msg);
      if (isSubscriberNotFound) {
        setCustomerInfo(null);
        setError(null);
        return null;
      }
      setError(msg || "Failed to fetch subscription status");
      return null;
    }
  }, []);

  useEffect(() => {
    if (!apiKey) {
      setCustomerInfo(null);
      setSdkReady(false);
      setLoading(false);
      return;
    }
    if (!user?.uid) {
      setCustomerInfo(null);
      instanceRef.current = null;
      setSdkReady(false);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);
    setSdkReady(false);

    (async () => {
      try {
        if (typeof Purchases.isConfigured === "function" && Purchases.isConfigured()) {
          try {
            const existing = Purchases.getSharedInstance();
            if (existing?.close) existing.close();
          } catch (_) {}
        }
        const purchases = Purchases.configure({
          apiKey,
          appUserId: user.uid,
        });
        instanceRef.current = purchases;
        if (mounted) {
          setSdkReady(true);
          const info = await purchases.getCustomerInfo();
          setCustomerInfo(info);
          setError(null);
        }
      } catch (e) {
        if (mounted) {
          setSdkReady(false);
          const msg = e?.message || "";
          const backendCode = e?.extra?.backendErrorCode;
          const isSubscriberNotFound =
            backendCode === 7259 || /not found|404|subscriber.*not found/i.test(msg);
          if (isSubscriberNotFound) {
            setCustomerInfo(null);
            setError(null);
          } else {
            setError(msg || "RevenueCat configure failed");
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [apiKey, user?.uid]);

  // Subscription entitlement (RevenueCat) – used together with isVip for isPro
  useEffect(() => {
    if (!instanceRef.current || !user?.uid) {
      setEntitled(false);
      return;
    }
    let mounted = true;
    instanceRef.current.isEntitledTo(entitlementId).then((v) => {
      if (mounted) setEntitled(!!v);
    });
    return () => {
      mounted = false;
    };
  }, [entitlementId, user?.uid, customerInfo, sdkReady]);

  const isEntitledTo = useCallback(
    async (identifier = entitlementId) => {
      if (!instanceRef.current) return false;
      try {
        return await instanceRef.current.isEntitledTo(identifier);
      } catch {
        return false;
      }
    },
    [entitlementId]
  );

  const getOfferings = useCallback(async (params) => {
    if (!instanceRef.current) {
      throw new Error("RevenueCat is not configured. Add NEXT_PUBLIC_REVENUECAT_WEB_API_KEY.");
    }
    return instanceRef.current.getOfferings(params);
  }, []);

  const purchase = useCallback(
    async (params) => {
      if (!instanceRef.current) {
        throw new Error("RevenueCat is not configured. Add NEXT_PUBLIC_REVENUECAT_WEB_API_KEY.");
      }
      const result = await instanceRef.current.purchase(params);
      await refreshCustomerInfo();
      return result;
    },
    [refreshCustomerInfo]
  );

  const presentPaywall = useCallback(
    async (options = {}) => {
      if (!instanceRef.current) {
        throw new Error("RevenueCat is not configured. Add NEXT_PUBLIC_REVENUECAT_WEB_API_KEY.");
      }
      try {
        const result = await instanceRef.current.presentPaywall({
          htmlTarget: options.htmlTarget ?? null,
          offering: options.offering ?? undefined,
        });
        await refreshCustomerInfo();
        return result;
      } catch (e) {
        const msg = e?.message || "";
        if (/doesn't have a paywall attached|no paywall attached/i.test(msg)) {
          const err = new Error("PAYWALL_NOT_CONFIGURED");
          err.originalMessage = msg;
          throw err;
        }
        throw e;
      }
    },
    [refreshCustomerInfo]
  );

  const value = {
    isConfigured: !!apiKey && !!user?.uid && sdkReady,
    customerInfo,
    loading,
    isEntitledTo,
    isVip,
    isPro: isVip || entitled,
    getOfferings,
    purchase,
    presentPaywall,
    refreshCustomerInfo,
    error,
  };

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
}
