import '@testing-library/jest-dom/vitest';

// jsdom does not implement matchMedia; components use it for the narrow-viewport tab
// layout and (indirectly) for reduced-motion. Stub a "never matches" implementation.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
