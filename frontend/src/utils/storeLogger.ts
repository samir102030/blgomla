// Simple utility for store logging that prevents duplicate logs
const loggedActions = new Set<string>();

export const storeLog = (action: string, data?: any, forceLog = false) => {
  const key = `${action}-${JSON.stringify(data)}`;
  
  if (forceLog || !loggedActions.has(key)) {
    console.log(`[${action}]`, data);
    loggedActions.add(key);
  }
};

export const clearStoreLogs = () => {
  loggedActions.clear();
}; 