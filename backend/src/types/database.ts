import type { Pool, PoolClient } from "pg";

export type DatabaseExecutor = Pool | PoolClient;

export type TransactionRunner = <T>(
  work: (client: PoolClient) => Promise<T>,
) => Promise<T>;
