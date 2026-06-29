// AxiomCore API - /api/knowledge/frequency
// แสดงความถี่ของตรรกะวิบัติแต่ละประเภทในชุดข้อมูล (dataset)

import { NextResponse } from 'next/server';
import { db } from '@/lib/core';
import { ALL_FALLACY_TYPES, FALLACY_META } from '@/lib/engine/types';

export const runtime = 'nodejs';

export async function GET() {
  // นับจำนวนตัวอย่างใน FallacyExample ตามประเภท
  const byType = await db.fallacyExample.groupBy({
    by: ['fallacyType'],
    _count: { _all: true },
  });

  // นับจำนวนตามระดับความยาก
  const byDifficulty = await db.fallacyExample.groupBy({
    by: ['difficulty'],
    _count: { _all: true },
  });

  // นับ mixed fallacy examples
  const mixedCount = await db.mixedFallacyExample.count();

  // นับ mixed ตาม combination
  const mixedByCombo = await db.mixedFallacyExample.groupBy({
    by: ['primaryType'],
    _count: { _all: true },
  });

  const frequency = ALL_FALLACY_TYPES.map((type) => ({
    type,
    nameTh: FALLACY_META[type].nameTh,
    nameEn: FALLACY_META[type].nameEn,
    count: byType.find((b) => b.fallacyType === type)?._count._all ?? 0,
    mixedCount: mixedByCombo.find((b) => b.primaryType === type)?._count._all ?? 0,
  }));

  const total = frequency.reduce((s, f) => s + f.count, 0);

  return NextResponse.json({
    ok: true,
    frequency,
    total,
    mixedTotal: mixedCount,
    byDifficulty: byDifficulty.map((d) => ({
      difficulty: d.difficulty,
      count: d._count._all,
    })),
  });
}
