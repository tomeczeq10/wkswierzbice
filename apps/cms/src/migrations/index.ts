import * as migration_20260427_190451_init from './20260427_190451_init';
import * as migration_20260428_041852 from './20260428_041852';

export const migrations = [
  {
    up: migration_20260427_190451_init.up,
    down: migration_20260427_190451_init.down,
    name: '20260427_190451_init',
  },
  {
    up: migration_20260428_041852.up,
    down: migration_20260428_041852.down,
    name: '20260428_041852'
  },
];
