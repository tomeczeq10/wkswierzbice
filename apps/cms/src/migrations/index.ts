import * as migration_20260427_190451_init from './20260427_190451_init';

export const migrations = [
  {
    up: migration_20260427_190451_init.up,
    down: migration_20260427_190451_init.down,
    name: '20260427_190451_init'
  },
];
