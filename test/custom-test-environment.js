// Custom test environment that properly sets up React context
import { JSDOM } from 'jsdom';

export default class CustomTestEnvironment extends JSDOM {
  constructor(config, context) {
    super(config, context);
    this.global.jsdom = this.dom.window.document.defaultView;
    
    // Add browser globals
    const globalObj = this.global;
    globalObj.window = this.dom.window;
    globalObj.document = this.dom.window.document;
    globalObj.navigator = this.dom.window.navigator;
    
    // Add requestAnimationFrame
    globalObj.requestAnimationFrame = (callback) => {
      return setTimeout(callback, 0);
    };
    
    // Add cancelAnimationFrame
    globalObj.cancelAnimationFrame = (id) => {
      clearTimeout(id);
    };
    
    // Add matchMedia mock
    globalObj.window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    });
    
    // Add ResizeObserver mock
    globalObj.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
}
