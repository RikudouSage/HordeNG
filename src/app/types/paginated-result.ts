export interface PaginatedResult<T> {
  page: number;
  lastPage: number;
  rows: T[];
}
