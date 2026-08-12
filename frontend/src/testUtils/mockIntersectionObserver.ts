import { vi } from 'vitest';

/**
 * jsdomにはIntersectionObserverが実装されていないため、テストから交差状態を
 * 手動で発火できる簡易モックを用意する。PostListの無限スクロールのテストで使う。
 */
export class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  callback: IntersectionObserverCallback;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

export function installIntersectionObserverMock(): typeof MockIntersectionObserver {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  return MockIntersectionObserver;
}
