/**
 * DuckDB over the published Parquet snapshot. Build-time only: every page that calls this is statically generated.
 * Views are created per file under data/published/{marts,meta}, so SQL reads `marts.dim_player` etc.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";

export interface Manifest {
  exported_at: string;
  git_commit: string | null;
  data_as_of: string;
  squad_as_of: string;
  tables: Record<string, { rows: number; bytes: number }>;
}

function findPublishedDir(): string {
  const fromEnv = process.env.ALB_PUBLISHED_DIR;
  if (fromEnv && existsSync(path.join(/*turbopackIgnore: true*/ fromEnv, "manifest.json"))) return fromEnv;
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(/*turbopackIgnore: true*/ dir, "data", "published");
    if (existsSync(path.join(candidate, "manifest.json"))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("data/published/manifest.json not found. Run `alb publish` first, or set ALB_PUBLISHED_DIR.");
}

export const PUBLISHED_DIR: string = findPublishedDir();

let manifestCache: Manifest | null = null;
export function manifest(): Manifest {
  if (!manifestCache) {
    manifestCache = JSON.parse(readFileSync(path.join(/*turbopackIgnore: true*/ PUBLISHED_DIR, "manifest.json"), "utf8")) as Manifest;
  }
  return manifestCache;
}

let connPromise: Promise<DuckDBConnection> | null = null;

async function open(): Promise<DuckDBConnection> {
  const instance = await DuckDBInstance.create(":memory:");
  const conn = await instance.connect();
  for (const schema of ["marts", "meta"]) {
    await conn.run(`create schema if not exists ${schema}`);
    const dir = path.join(/*turbopackIgnore: true*/ PUBLISHED_DIR, schema);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(/*turbopackIgnore: true*/ dir).filter((f) => f.endsWith(".parquet")).sort()) {
      const name = file.slice(0, -".parquet".length);
      const full = path.join(/*turbopackIgnore: true*/ dir, file).replace(/'/g, "''");
      await conn.run(`create view ${schema}.${name} as select * from read_parquet('${full}')`);
    }
  }
  const m = manifest();
  await conn.run(`create macro as_of() as DATE '${m.data_as_of}'`);
  return conn;
}

function connection(): Promise<DuckDBConnection> {
  if (!connPromise) connPromise = open();
  return connPromise;
}

type Plain = string | number | boolean | null | Plain[] | { [k: string]: Plain };

function plain(v: unknown): Plain {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.map(plain);
  if (typeof v === "object") {
    const o = v as { items?: unknown[]; micros?: bigint; days?: number; toString(): string };
    if (Array.isArray(o.items)) return o.items.map(plain);
    if (typeof o.micros === "bigint") return new Date(Number(o.micros / 1000n)).toISOString();
    if (typeof o.days === "number") return o.toString();
    return o.toString();
  }
  return String(v);
}

/** Run a query; bigint -> number, DATE -> 'YYYY-MM-DD', TIMESTAMPTZ -> ISO string, LIST -> array. */
export async function rows<T = Record<string, Plain>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const conn = await connection();
  const reader = params.length ? await conn.runAndReadAll(sql, params as never) : await conn.runAndReadAll(sql);
  const names = reader.columnNames();
  return reader.getRows().map((r) => {
    const out: Record<string, Plain> = {};
    names.forEach((n, i) => {
      out[n] = plain(r[i]);
    });
    return out as T;
  });
}

export async function one<T = Record<string, Plain>>(sql: string, params: unknown[] = []): Promise<T | null> {
  const r = await rows<T>(sql, params);
  return r[0] ?? null;
}
