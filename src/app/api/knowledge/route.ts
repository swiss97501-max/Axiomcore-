// AxiomCore API - /api/knowledge
// ฐานความรู้ตรรกะวิบัติ - รายละเอียด + ตัวอย่างสำหรับแต่ละประเภท

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/core';
import { FALLACY_META, ALL_FALLACY_TYPES } from '@/lib/engine/types';
import { DETECTION_RULES } from '@/lib/engine/fallacies/rules';
import { DatasetGenerator } from '@/lib/generator';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get('type');
  const sampleCount = Math.min(parseInt(sp.get('samples') ?? '4', 10) || 4, 10);

  if (type && ALL_FALLACY_TYPES.includes(type as never)) {
    // รายละเอียดประเภทเดียว
    const meta = FALLACY_META[type as keyof typeof FALLACY_META];
    const rules = DETECTION_RULES.filter((r) => r.fallacyType === type);
    const gen = new DatasetGenerator(Date.now() % 100000);
    const samples = gen.generateForType(type as never, sampleCount).map((s) => ({
      text: s.text,
      difficulty: s.difficulty,
      explanation: s.explanation,
      reason: s.reason,
    }));

    return NextResponse.json({
      ok: true,
      fallacy: {
        ...meta,
        rules: rules.map((r) => ({ code: r.code, description: r.description, weight: r.weight })),
        samples,
      },
    });
  }

  // รายการทั้งหมด
  const all = ALL_FALLACY_TYPES.map((t) => ({
    ...FALLACY_META[t],
    ruleCount: DETECTION_RULES.filter((r) => r.fallacyType === t).length,
  }));

  return NextResponse.json({ ok: true, fallacies: all });
}
