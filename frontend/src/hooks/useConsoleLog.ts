import { useRef, useCallback } from 'react';

interface LogOptions {
  once?: boolean;
  condition?: boolean;
  dependencies?: any[];
}

/**
 * Custom hook to manage console.log statements and prevent them from running multiple times
 * @param message - The message to log
 * @param data - The data to log (optional)
 * @param options - Options for logging behavior
 */
export const useConsoleLog = () => {
  const loggedRefs = useRef<Set<string>>(new Set());

  const log = useCallback((
    message: string, 
    data?: any, 
    options: LogOptions = {}
  ) => {
    const { once = true, condition = true, dependencies = [] } = options;
    
    if (!condition) return;

    // Create a unique key for this log statement
    const key = `${message}-${JSON.stringify(dependencies)}`;
    
    // If once is true and we've already logged this, skip
    if (once && loggedRefs.current.has(key)) {
      return;
    }

    // Log the message and data
    if (data !== undefined) {
      console.log(message, data);
    } else {
      console.log(message);
    }

    // Mark as logged if once is true
    if (once) {
      loggedRefs.current.add(key);
    }
  }, []);

  const clearLogs = useCallback(() => {
    loggedRefs.current.clear();
  }, []);

  return { log, clearLogs };
};

/**
 * Hook for logging component state changes only once
 */
export const useComponentLog = () => {
  const loggedRefs = useRef<Set<string>>(new Set());

  const logComponentState = useCallback((
    componentName: string,
    state: any,
    dependencies: any[] = []
  ) => {
    const key = `${componentName}-${JSON.stringify(dependencies)}`;
    
    if (loggedRefs.current.has(key)) {
      return;
    }

    console.log(`[${componentName}] Component state:`, state);
    loggedRefs.current.add(key);
  }, []);

  const clearComponentLogs = useCallback(() => {
    loggedRefs.current.clear();
  }, []);

  return { logComponentState, clearComponentLogs };
};

/**
 * Hook for logging API calls and responses only once
 */
export const useAPILog = () => {
  const loggedRefs = useRef<Set<string>>(new Set());

  const logAPI = useCallback((
    action: string,
    data?: any,
    endpoint?: string
  ) => {
    const key = `${action}-${endpoint || 'default'}`;
    
    if (loggedRefs.current.has(key)) {
      return;
    }

    if (data !== undefined) {
      console.log(`🔍 ${action}${endpoint ? ` to ${endpoint}` : ''}:`, data);
    } else {
      console.log(`🔍 ${action}${endpoint ? ` to ${endpoint}` : ''}`);
    }

    loggedRefs.current.add(key);
  }, []);

  const clearAPILogs = useCallback(() => {
    loggedRefs.current.clear();
  }, []);

  return { logAPI, clearAPILogs };
}; 