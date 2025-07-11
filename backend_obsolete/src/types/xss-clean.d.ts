declare module 'xss-clean' {
  import { RequestHandler } from 'express';
  
  /**
   * Middleware to sanitize user input coming from POST, GET, and URL parameters
   * @param options Optional configuration options
   */
  declare function xssClean(options?: {
    /**
     * List of allowed HTML tags (default: [])
     */
    allowedTags?: string[];
    
    /**
     * List of allowed HTML attributes (default: [])
     */
    allowedAttributes?: Record<string, string[]>;
    
    /**
     * Whether to allow comments (default: false)
     */
    allowComments?: boolean;
    
    /**
     * Whether to allow DOCTYPE declarations (default: false)
     */
    allowDocType?: boolean;
    
    /**
     * Whether to allow data URIs (default: false)
     */
    allowDataAttributes?: boolean;
  }): RequestHandler;

  export = xssClean;
}
