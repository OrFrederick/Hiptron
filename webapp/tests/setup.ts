import "@testing-library/jest-dom/vitest";

// recharts uses ResizeObserver which is not available in jsdom
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as Record<string, unknown>).ResizeObserver =
  ResizeObserverStub;
