// AxiomCore API - /api/fallacies
// ส่งข้อมูลเมตาของตรรกะวิบัติทั้ง 12 ประเภท

import { NextResponse } from 'next/server';
import { FALLACY_META, ALL_FALLACY_TYPES } from '@/lib/engine/types';
import { DETECTION_RULES } from '@/lib/engine/fallacies/rules';

export const runtime = 'nodejs';

export async function GET() {
  const fallacies = ALL_FALLACY_TYPES.map((type) => ({
    ...FALLACY_META[type],
    ruleCount: DETECTION_RULES.filter((r) => r.fallacyType === type).length,
  }));
  return NextResponse.json({ ok: true, fallacies });
}
