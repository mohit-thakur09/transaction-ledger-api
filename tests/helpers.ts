import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../src/app';
import { openDatabase, type DB } from '../src/db/connection';

export interface TestContext {
  db: DB;
  request: (method: string, path: string, body?: unknown) => Promise<{ status: number; body: any }>;
  close: () => Promise<void>;
}

export async function startTestServer(): Promise<TestContext> {
  const db = openDatabase(':memory:');
  const server: Server = await new Promise((resolve) => {
    const s = createApp(db).listen(0, () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const request = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(baseUrl + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  };

  const close = () =>
    new Promise<void>((resolve) => {
      server.close(() => {
        db.close();
        resolve();
      });
    });

  return { db, request, close };
}
