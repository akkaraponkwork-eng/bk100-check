import { DocType } from '../doctypes/schema';
import { IRepository, QueryOptions, RecordId, RecordData } from '../repository/interface';
import { DocTypeRegistry } from '../doctypes/registry';

export class ResourceQueryService {
  private repository: IRepository;

  constructor(repository: IRepository) {
    this.repository = repository;
  }

  async get(docTypeName: string, id: RecordId): Promise<RecordData | null> {
    const docType = DocTypeRegistry.get(docTypeName);
    return await this.repository.get(docType, id);
  }

  async findMany(docTypeName: string, options?: QueryOptions): Promise<RecordData[]> {
    const docType = DocTypeRegistry.get(docTypeName);
    return await this.repository.list(docType, options);
  }

  async exists(docTypeName: string, options?: QueryOptions): Promise<boolean> {
    // If the repository supported a count/exists method, we'd use it here.
    // For now, we fetch one record to see if it exists.
    const limitOneOptions = { ...options, limit: 1 };
    const docType = DocTypeRegistry.get(docTypeName);
    const results = await this.repository.list(docType, limitOneOptions);
    return results.length > 0;
  }
}
