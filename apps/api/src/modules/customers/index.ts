/**
 * Customers Module - Barrel Export
 */

export { default as customersRoutes } from './customers.routes';
export { customersController } from './customers.controller';
export { customersService } from './customers.service';
export { loyaltyService } from './loyalty.service';
export { walletService } from './wallet.service';
export { tagsService } from './tags.service';
export * from './customers.schema';
