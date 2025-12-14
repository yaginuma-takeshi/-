// NOTE: Firebase imports have been removed to resolve build errors in environments where the 'firebase' package
// is missing or incompatible. This service now mocks the interface and forces local-only mode.

export const initFirebase = (configStr: string): boolean => {
  // Always return false to indicate that cloud connection is not available.
  // This will force the application to use local storage via App.tsx logic.
  console.warn("Firebase is not initialized: Module not found or disabled.");
  return false;
};

export const subscribeToCollection = (colName: string, callback: (data: any[]) => void) => {
  // Return a no-op unsubscribe function
  return () => {};
};

export const saveDocument = async (colName: string, data: any) => {
  console.warn("Save skipped: Cloud mode is inactive.");
  return Promise.resolve();
};

export const deleteDocument = async (colName: string, id: string) => {
  console.warn("Delete skipped: Cloud mode is inactive.");
  return Promise.resolve();
};