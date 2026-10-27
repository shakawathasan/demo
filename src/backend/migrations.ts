import { DatabaseState } from './db.ts';

export interface Migration {
  version: number;
  description: string;
  up: (state: DatabaseState) => DatabaseState;
}

export const migrations: Migration[] = [
  {
    version: 1,
    description: 'Initial schema for Tuition Management Bangladesh with fee obligations, bKash, attendance, and tests',
    up: (state: DatabaseState) => {
      // Schema initialized
      return state;
    },
  },
];

export function runMigrations(state: DatabaseState): DatabaseState {
  let currentState = state;
  for (const m of migrations) {
    if (currentState.version < m.version) {
      console.log(`Running migration ${m.version}: ${m.description}`);
      currentState = m.up(currentState);
      currentState.version = m.version;
    }
  }
  return currentState;
}
