// Interfaz base para repositorios

export interface IRepository<T, ID = number> {
  findAll(filters?: any): Promise<T[]>;
  findById(id: ID): Promise<T | null>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
}

// Interfaz específica para operaciones de transacción
export interface ITransactionRepository {
  executeInTransaction<T>(operation: () => Promise<T>): Promise<T>;
}
