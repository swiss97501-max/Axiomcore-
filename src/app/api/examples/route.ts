// AxiomCore API - /api/examples
// ส่งตัวอย่างข้อความทดสอบที่สร้างจาก generator เพื่อให้ผู้ใช้ลองวิเคราะห์

import { NextRequest, NextResponse } from 'next/server';
import { DatasetGenerator } from '@/lib/generator';
import { MixedFallacyGenerator } from '@/lib/generator';
import { ALL_FALLACY_TYPES, FALLACY_META } from '@/lib/engine/types';
import type { FallacyType } from '@/lib/engine/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get('type') as FallacyType | null;
  const count = Math.min(parseInt(sp.get('count') ?? '6', 10) || 6, 30);

  const gen = new DatasetGenerator(Date.now() % 100000);
  const mixedGen = new MixedFallacyGenerator(gen.getRuleEngine());

  const examples: Array<{
    text: string;
    fallacyType: FallacyType;
    nameTh: string;
    difficulty: string;
    explanation: string;
    mixed?: boolean;
    combination?: string;
  }> = [];

  if (type && ALL_FALLACY_TYPES.includes(type)) {
    // ตัวอย่างเฉพาะประเภท
    const records = gen.generateForType(type, count);
    for (const r of records) {
      examples.push({
        text: r.text,
        fallacyType: r.fallacyType,
        nameTh: FALLACY_META[r.fallacyType].nameTh,
        difficulty: r.difficulty,
        explanation: r.explanation,
      });
    }
  } else {
    // ตัวอย่างรวมจากทุกประเภท
    const perType = Math.max(1, Math.floor(count / ALL_FALLACY_TYPES.length));
    for (const t of ALL_FALLACY_TYPES) {
      const records = gen.generateForType(t, perType);
      for (const r of records.slice(0, perType)) {
        examples.push({
          text: r.text,
          fallacyType: r.fallacyType,
          nameTh: FALLACY_META[r.fallacyType].nameTh,
          difficulty: r.difficulty,
          explanation: r.explanation,
        });
      }
    }
    // เพิ่มตัวอย่าง mixed
    const mixed = mixedGen.generate(3);
    for (const m of mixed) {
      examples.push({
        text: m.text,
        fallacyType: m.primaryType,
        nameTh: `ผสม: ${FALLACY_META[m.primaryType].nameTh} + ${FALLACY_META[m.secondaryType].nameTh}`,
        difficulty: 'mixed',
        explanation: m.explanation,
        mixed: true,
        combination: m.combination,
      });
    }
  }

  return NextResponse.json({ ok: true, examples });
}
