/**
 * @file index.ts
 * @description Central barrel export for the pure domain layer.
 */

export * from './interaction/types';
export * from './interaction/license';
export * from './interaction/timestamp';
export * from './interaction/repository';

export * from './client/types';
export * from './client/phone';
export * from './client/nameResolution';
export * from './client/repository';

export * from './identity/types';
export * from './identity/policies';

export * from './stats/types';
export * from './stats/calculator';
