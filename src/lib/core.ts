// AxiomCore — Lib Core (merged: db + utils + cache)
// รวม Prisma client, cn() helper, และ in-memory cache utilities ในไฟล์เดียว

import { PrismaClient } from '@prisma/client'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// ===== Utils (cn helper) =====
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ===== Database (Prisma client) =====
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ===== Shared in-memory cache =====
// ใช้ globalThis เพื่อใช้ cache ร่วมกันระหว่าง API routes (แก้ปัญหา module isolation ใน dev mode)

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const GLOBAL_KEY = '__axiomcore_cache__';

function getCacheMap(): Map<string, CacheEntry<unknown>> {
  if (typeof globalThis === 'undefined') {
    return new Map();
  }
  const g = globalThis as unknown as { [GLOBAL_KEY]?: Map<string, CacheEntry<unknown>> };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map();
  }
  return g[GLOBAL_KEY]!;
}

/** ดึงค่าจาก cache ถ้ายังไม่หมดอายุ */
export function getCache<T>(key: string): T | null {
  const entry = getCacheMap().get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    getCacheMap().delete(key);
    return null;
  }
  return entry.data as T;
}

/** เก็บค่าใน cache พร้อม TTL (ms) */
export function setCache<T>(key: string, data: T, ttlMs: number): void {
  getCacheMap().set(key, { data, expiresAt: Date.now() + ttlMs });
}

/** ลบ cache key เฉพาะ */
export function invalidateCache(key: string): void {
  getCacheMap().delete(key);
}

/** ลบ cache ทั้งหมด */
export function clearAllCache(): void {
  getCacheMap().clear();
}

// Cache keys ที่ใช้ในระบบ
export const CACHE_KEYS = {
  STATS: 'stats',
  FALLACIES: 'fallacies',
  DATASET_STATS: 'dataset-stats',
} as const;

// Stats TTL: 5 นาที
export const STATS_CACHE_TTL = 5 * 60 * 1000;
