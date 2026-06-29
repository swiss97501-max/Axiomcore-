// AxiomCore API - /api/knowledge/relationships
// แสดงความสัมพันธ์ (co-occurrence) ระหว่างตรรกะวิบัติจาก mixed fallacy examples

import { NextResponse } from 'next/server';
import { db } from '@/lib/core';
import { ALL_FALLACY_TYPES, FALLACY_META } from '@/lib/engine/types';

export const runtime = 'nodejs';

export async function GET() {
  // ดึง mixed fallacy examples ทั้งหมด
  const mixed = await db.mixedFallacyExample.findMany({
    select: { primaryType: true, secondaryType: true },
  });

  // นับ co-occurrence: สำหรับแต่ละคู่ (A, B) นับว่ากี่ครั้งที่ A เป็น primary และ B เป็น secondary
  const coOccurrence: Record<string, number> = {};
  for (const m of mixed) {
    const key = `${m.primaryType}->${m.secondaryType}`;
    coOccurrence[key] = (coOccurrence[key] ?? 0) + 1;
    // bidirectional
    const reverseKey = `${m.secondaryType}->${m.primaryType}`;
    coOccurrence[reverseKey] = (coOccurrence[reverseKey] ?? 0) + 1;
  }

  // สร้าง nodes: ประเภทตรรกะวิบัติ + จำนวน mixed ที่เกี่ยวข้อง
  const nodes = ALL_FALLACY_TYPES.map((type) => {
    const count = mixed.filter((m) => m.primaryType === type || m.secondaryType === type).length;
    return {
      id: type,
      nameTh: FALLACY_META[type].nameTh,
      nameEn: FALLACY_META[type].nameEn,
      count,
    };
  }).filter((n) => n.count > 0);

  // สร้าง edges: คู่ที่มี co-occurrence > 0
  const edges: { source: string; target: string; weight: number }[] = [];
  const seen = new Set<string>();
  for (const m of mixed) {
    const key = [m.primaryType, m.secondaryType].sort().join('->');
    if (seen.has(key)) continue;
    seen.add(key);
    const weight = mixed.filter(
      (mm) =>
        (mm.primaryType === m.primaryType && mm.secondaryType === m.secondaryType) ||
        (mm.primaryType === m.secondaryType && mm.secondaryType === m.primaryType),
    ).length;
    if (weight > 0) {
      edges.push({ source: m.primaryType, target: m.secondaryType, weight });
    }
  }

  // Top combinations
  const topCombos = edges
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10)
    .map((e) => ({
      source: e.source,
      sourceName: FALLACY_META[e.source as keyof typeof FALLACY_META]?.nameTh ?? e.source,
      target: e.target,
      targetName: FALLACY_META[e.target as keyof typeof FALLACY_META]?.nameTh ?? e.target,
      weight: e.weight,
    }));

  return NextResponse.json({
    ok: true,
    nodes,
    edges,
    topCombos,
    totalMixed: mixed.length,
  });
}
