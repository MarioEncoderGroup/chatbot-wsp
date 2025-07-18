import { Command, ListItem, QueryFilters } from '../types';
import { IRepository, ITransactionRepository } from './IRepository';

export interface ICommandRepository extends IRepository<Command>, ITransactionRepository {
  // Métodos específicos para comandos
  findByType(type: 'text' | 'list' | 'buttons'): Promise<Command[]>;
  findByCommand(command: string): Promise<Command | null>;
  findWithItems(id: number): Promise<Command | null>;
  
  // Métodos para listas
  createWithItems(command: Omit<Command, 'id'>, items: ListItem[]): Promise<Command>;
  updateWithItems(id: number, command: Partial<Command>, items?: ListItem[]): Promise<Command | null>;
  
  // Métodos para elementos de lista
  addItemsToCommand(commandId: number, items: ListItem[]): Promise<void>;
  removeItemsFromCommand(commandId: number): Promise<void>;
  
  // Verificaciones
  commandExists(command: string, excludeId?: number): Promise<boolean>;
}
