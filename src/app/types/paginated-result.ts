export interface PaginatedResult<T> {
  page: number;
  lastPage: number;
  totalCount: number;
  rows: T[];
}
