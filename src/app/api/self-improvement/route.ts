// AxiomCore API - /api/self-improvement
// รันกระบวนการพัฒนาตนเองและบันทึกผลลัพธ์

import { NextRequest, NextResponse } from 'next/server';
import { SelfImprovementLoop } from '@/lib/generator';
import { db } from '@/lib/core';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const samplesPerType = Math.min(parseInt(body?.samplesPerType ?? '8', 10) || 8, 20);

    const loop = new SelfImprovementLoop(Date.now() % 100000);
    const result = await loop.run(samplesPerType);

    // บันทึกผลลัพธ์ลงฐานข้อมูล
    for (const it of result.iterations) {
      await db.selfImprovementLog.create({
        data: {
          iteration: it.iteration,
          totalTested: it.totalTested,
          truePositive: it.truePositive,
          falsePositive: it.falsePositive,
          falseNegative: it.falseNegative,
          trueNegative: it.trueNegative,
          precision: it.precision,
          recall: it.recall,
          f1Score: it.f1Score,
          rulesAdjusted: it.rulesAdjusted,
          notes: it.notes,
        },
      });
    }

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: 'การรัน self-improvement ล้มเหลว: ' + msg }, { status: 500 });
  }
}
