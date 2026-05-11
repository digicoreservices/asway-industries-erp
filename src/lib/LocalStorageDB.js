export const LocalStorageDB = {
  getData: (table) => {
    const data = localStorage.getItem(`db_${table}`);
    return data ? JSON.parse(data) : [];
  },
  saveData: (table, data) => {
    const current = LocalStorageDB.getData(table);
    const newData = Array.isArray(data) ? [...current, ...data] : [...current, data];
    localStorage.setItem(`db_${table}`, JSON.stringify(newData));
    return data;
  },
  updateData: (table, id, data) => {
    const current = LocalStorageDB.getData(table);
    const index = current.findIndex(item => item.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...data };
      localStorage.setItem(`db_${table}`, JSON.stringify(current));
      return current[index];
    }
    return null;
  },
  deleteData: (table, id) => {
    const current = LocalStorageDB.getData(table);
    const filtered = current.filter(item => item.id !== id);
    localStorage.setItem(`db_${table}`, JSON.stringify(filtered));
    return true;
  }
};