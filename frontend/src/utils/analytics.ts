export const trackEvent = (name: string, props?: Record<string, any>) => {
  try {
    const w = window as any;
    // Prefer a global analytics provider if present
    if (w.analytics && typeof w.analytics.track === "function") {
      w.analytics.track(name, props);
      return;
    }
    // gtag (Google Analytics)
    if (typeof w.gtag === "function") {
      w.gtag('event', name, props || {});
      return;
    }
    // dataLayer (GTM)
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event: name, ...(props || {}) });
      return;
    }
    // Fallback to console for dev visibility
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('trackEvent', name, props);
    }
  } catch (e) {
    // swallow analytics errors
  }
};