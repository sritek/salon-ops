/**
 * Runtime path alias registration.
 * Must be imported FIRST in api/index.ts before any @/ imports.
 *
 * @vercel/node uses esbuild in transform mode (not bundle mode), so
 * '@/lib/response' becomes require('@/lib/response') verbatim in the
 * compiled JS. This registers the alias so Node.js can resolve it.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const moduleAlias = require('module-alias');
import { join } from 'path';

// __dirname here = /var/task/apps/api/api/
// join(__dirname, '..', 'src') = /var/task/apps/api/src/
moduleAlias.addAlias('@', join(__dirname, '..', 'src'));
