export const clearDatabase = async () => {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('survey-data');
    
    request.onerror = () => {
      reject(new Error('Failed to delete database'));
    };
    
    request.onsuccess = () => {
      console.log('Database deleted successfully');
      resolve();
    };
  });
}; 