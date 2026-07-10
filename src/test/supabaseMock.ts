// src/test/supabaseMock.ts
import { vi } from 'vitest'

export interface QueryResult<T> {
  data: T | null
  error: { message: string } | null
}

export function createQueryBuilderMock<T>(result: QueryResult<T>) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    then: (
      onFulfilled: (value: QueryResult<T>) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  }

  return builder
}
