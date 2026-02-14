---
# Backend API patterns - response formats, service patterns, and type conventions
inclusion: fileMatch
fileMatchPattern: 'apps/api/**/*.ts'
---

# Backend API Patterns

## Overview

This document defines standardized patterns for backend API development in the Salon Management SaaS platform. All API modules must follow these patterns for consistency and maintainability.

---

## 1. Standard Response Format

### Success Response

All successful API responses must use the `successResponse` utility:

```typescript
import { successResponse } from '@/lib/response';

// Single resource
return reply.send(successResponse(data));
// Output: { success: true, data: { ... } }

// With status code
return reply.status(201).send(successResponse(data));
```

### Paginated Response

All list endpoints must use the `paginatedResponse` utility:

```typescript
import { paginatedResponse } from '@/lib/response';

const result = await service.list(tenantId, query);
return reply.send(paginatedResponse(result.data, result.meta));
// Output: { success: true, data: [...], meta: { page, limit, total, totalPages } }
```

### Delete Response

All delete operations must use the `deleteResponse` utility:

```typescript
import { deleteResponse } from '@/lib/response';

await service.delete(tenantId, id);
return reply.send(deleteResponse('Resource deleted successfully'));
// Output: { success: true, data: { message: '...' } }
```

### Error Response

Errors are handled by the global error handler, but for custom error responses:

```typescript
import { errorResponse } from '@/lib/response';

return reply.status(400).send(errorResponse('VALIDATION_ERROR', 'Invalid input', details));
// Output: { success: false, error: { code: '...', message: '...', details: {...} } }
```

---

## 2. Decimal Serialization

### The Problem

Prisma returns `Decimal` objects for decimal/numeric database columns. These don't serialize to JSON properly and cause issues in API responses.

### The Solution

All response utilities automatically call `serializeDecimals()` which recursively converts Prisma Decimals to JavaScript numbers:

```typescript
// Response utilities handle this automatically
return reply.send(successResponse(data)); // Decimals converted to numbers

// If you need to serialize manually (rare):
import { serializeDecimals } from '@/lib/prisma';
const serialized = serializeDecimals(data);
```

### When to Use Type Assertions

When services return data that will be serialized, use type assertions:

```typescript
// In service methods
return {
  data: serializeDecimals(data) as unknown[],
  meta: { page, limit, total, totalPages },
};
```

---

## 3. Service Return Types

### Paginated Results

All list methods must return `PaginatedResult<T>`:

```typescript
import type { PaginatedResult } from '@/lib/types';

async list(tenantId: string, query: ListQuery): Promise<PaginatedResult<unknown>> {
  const [data, total] = await Promise.all([
    prisma.model.findMany({ where, skip, take: limit }),
    prisma.model.count({ where }),
  ]);

  return {
    data: serializeDecimals(data) as unknown[],
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### Single Resource

Single resource methods return the entity directly (response utilities handle serialization):

```typescript
async getById(tenantId: string, id: string): Promise<Model> {
  const record = await prisma.model.findFirst({ where: { id, tenantId } });
  if (!record) throw new NotFoundError('MODEL_NOT_FOUND', 'Resource not found');
  return record;
}
```

---

## 4. Controller Patterns

### Standard Controller Structure

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import { successResponse, paginatedResponse, deleteResponse } from '@/lib/response';
import { myService } from './my.service';
import type { CreateInput, UpdateInput, ListQuery } from './my.schema';

// Create
export async function create(request: FastifyRequest<{ Body: CreateInput }>, reply: FastifyReply) {
  const { tenantId, sub: userId } = request.user!;
  const result = await myService.create(tenantId, request.body, userId);
  return reply.status(201).send(successResponse(result));
}

// Get by ID
export async function getById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await myService.getById(tenantId, request.params.id);
  return reply.send(successResponse(result));
}

// List with pagination
export async function list(
  request: FastifyRequest<{ Querystring: ListQuery }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await myService.list(tenantId, request.query);
  return reply.send(paginatedResponse(result.data, result.meta));
}

// Update
export async function update(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await myService.update(tenantId, request.params.id, request.body, userId);
  return reply.send(successResponse(result));
}

// Delete
export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  await myService.delete(tenantId, request.params.id, userId);
  return reply.send(deleteResponse('Resource deleted successfully'));
}
```

### Accessing User Context

Always use `request.user` from Fastify JWT:

```typescript
// ✅ GOOD - Use request.user directly
const { tenantId, sub: userId, branchIds, role } = request.user!;

// ❌ BAD - Don't create local AuthenticatedRequest interfaces
interface AuthenticatedRequest extends FastifyRequest {
  user: { tenantId: string; userId: string; ... }
}
```

---

## 5. Shared Types

### Import from lib/types

```typescript
import type {
  PaginationMeta,
  PaginatedResult,
  ApiSuccessResponse,
  ApiPaginatedResponse,
  ApiErrorResponse,
} from '@/lib/types';
```

### Type Definitions

```typescript
// PaginationMeta
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// PaginatedResult<T>
interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// ApiSuccessResponse<T>
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

// ApiPaginatedResponse<T>
interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}
```

---

## 6. Error Handling

### Use Custom Error Classes

```typescript
import { NotFoundError, ConflictError, BadRequestError } from '@/lib/errors';

// Not found
throw new NotFoundError('RESOURCE_NOT_FOUND', 'Resource not found');

// Conflict (duplicate, already exists)
throw new ConflictError('DUPLICATE_ENTRY', 'Resource already exists');

// Bad request (validation, business rule)
throw new BadRequestError('INVALID_INPUT', 'Invalid input data');
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource not found",
    "details": { ... }
  }
}
```

---

## 7. Quick Reference

### Response Utilities

| Function                                 | Use Case             | Output                                 |
| ---------------------------------------- | -------------------- | -------------------------------------- |
| `successResponse(data)`                  | Single resource      | `{ success: true, data }`              |
| `paginatedResponse(data, meta)`          | List with pagination | `{ success: true, data, meta }`        |
| `deleteResponse(message?)`               | Delete operations    | `{ success: true, data: { message } }` |
| `errorResponse(code, message, details?)` | Custom errors        | `{ success: false, error: {...} }`     |

### Import Paths

```typescript
// Response utilities
import { successResponse, paginatedResponse, deleteResponse } from '@/lib/response';

// Types
import type { PaginatedResult, PaginationMeta } from '@/lib/types';

// Decimal serialization (usually not needed - response utilities handle it)
import { serializeDecimals } from '@/lib/prisma';

// Errors
import { NotFoundError, ConflictError, BadRequestError } from '@/lib/errors';
```

### Checklist for New Modules

- [ ] Controllers use `successResponse`, `paginatedResponse`, `deleteResponse`
- [ ] Services return `PaginatedResult<T>` for list methods
- [ ] Services call `serializeDecimals` on returned data
- [ ] No local `AuthenticatedRequest` interfaces - use `request.user!`
- [ ] Errors use custom error classes from `@/lib/errors`
