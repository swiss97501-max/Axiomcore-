// AxiomCore API - /api/dataset/generate
// สร้างและบันทึกชุดข้อมูลตัวอย่างเข้าฐานข้อมูล

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/core';
import { DatasetGenerator } from '@/lib/generator';
import { MixedFallacyGenerator } from '@/lib/generator';
import { DebateGenerator } from '@/lib/generator';
import { ALL_FALLACY_TYPES } from '@/lib/engine/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const perType = Math.min(parseInt(body?.perType ?? '20', 10) || 20, 200);
    const mixedCount = Math.min(parseInt(body?.mixed ?? '40', 10) || 40, 400);
    const debateCount = Math.min(parseInt(body?.debates ?? '60', 10) || 60, 500);

    const gen = new DatasetGenerator(Date.now() % 100000);
    const mixedGen = new MixedFallacyGenerator(gen.getRuleEngine());
    const debateGen = new DebateGenerator(gen.getRuleEngine());

    let totalFallacy = 0;
    let totalMixed = 0;
    let totalDebate = 0;

    // สร้างตัวอย่างตรรกะวิบัติแต่ละประเภท
    for (const type of ALL_FALLACY_TYPES) {
      const records = gen.generateForType(type, perType);
      if (records.length === 0) continue;
      // insert แบบ batch
      await db.fallacyExample.createMany({
        data: records.map((r) => ({
          fallacyType: r.fallacyType,
          difficulty: r.difficulty,
          text: r.text,
          explanation: r.explanation,
          reason: r.reason,
          label: r.label,
        })),
        
      });
      totalFallacy += records.length;
    }

    // สร้างตัวอย่าง mixed
    const mixed = mixedGen.generate(mixedCount);
    if (mixed.length > 0) {
      await db.mixedFallacyExample.createMany({
        data: mixed.map((m) => ({
          primaryType: m.primaryType,
          secondaryType: m.secondaryType,
          combination: m.combination,
          text: m.text,
          explanation: m.explanation,
          reason: m.reason,
        })),
        
      });
      totalMixed = mixed.length;
    }

    // สร้างหัวข้อโต้วาที
    const debates = debateGen.generate(debateCount);
    if (debates.length > 0) {
      await db.debateTopic.createMany({
        data: debates.map((d) => ({
          category: d.category,
          title: d.title,
          premise: d.premise,
        })),
        
      });
      totalDebate = debates.length;
    }

    return NextResponse.json({
      ok: true,
      generated: {
        fallacyExamples: totalFallacy,
        mixedFallacyExamples: totalMixed,
        debateTopics: totalDebate,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: 'ไม่สามารถสร้างชุดข้อมูลได้: ' + msg }, { status: 500 });
  }
}
