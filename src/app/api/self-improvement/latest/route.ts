// AxiomCore API - /api/self-improvement/latest
// ดึงผล self-improvement loop ล่าสุดจากฐานข้อมูล

import { NextResponse } from 'next/server';
import { db } from '@/lib/core';

export const runtime = 'nodejs';

export async function GET() {
  const logs = await db.selfImprovementLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (logs.length === 0) {
    return NextResponse.json({ ok: true, hasData: false, logs: [] });
  }

  const latest = logs[0];
  const allIterations = logs.reverse(); // เรียงจากเก่าไปใหม่

  return NextResponse.json({
    ok: true,
    hasData: true,
    latest: {
      iteration: latest.iteration,
      f1Score: latest.f1Score,
      precision: latest.precision,
      recall: latest.recall,
      truePositive: latest.truePositive,
      falsePositive: latest.falsePositive,
      falseNegative: latest.falseNegative,
      trueNegative: latest.trueNegative,
      totalTested: latest.totalTested,
      rulesAdjusted: latest.rulesAdjusted,
      notes: latest.notes,
      createdAt: latest.createdAt,
    },
    history: allIterations.map((l) => ({
      iteration: l.iteration,
      f1Score: l.f1Score,
      precision: l.precision,
      recall: l.recall,
      totalTested: l.totalTested,
      rulesAdjusted: l.rulesAdjusted,
    })),
  });
}
