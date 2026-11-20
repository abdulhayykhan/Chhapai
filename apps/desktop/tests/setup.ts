import "@testing-library/jest-dom";

// Mock Web Audio API
class MockAudioContext {
  currentTime = 0;
  state = "running";
  createOscillator() {
    return {
      type: "sine",
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
  }
  resume = vi.fn().mockResolvedValue(undefined);
  destination = {};
}

(global as any).AudioContext = MockAudioContext;
(global as any).webkitAudioContext = MockAudioContext;

// Mock window.print
window.print = vi.fn();

// Mock Notification
class MockNotification {
  static permission = "granted";
  static requestPermission = vi.fn().mockResolvedValue("granted");
  constructor(
    public title: string,
    public options?: any,
  ) {}
}

(global as any).Notification = MockNotification;
