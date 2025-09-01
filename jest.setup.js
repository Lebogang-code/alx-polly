// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock the localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true
});

// Mock fetch
global.fetch = jest.fn();