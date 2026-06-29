// AxiomCore API - /api/timeline
// ไทม์ไลน์การวิเคราะห์ล่าสุด พร้อมข้อมูลสรุป

import { NextResponse } from 'next/server';
import { db } from '@/lib/core';
import type { FallacyType } from '@/lib/engine/types';

export const runtime = 'nodejs';

export async function GET() {
  // ดึง assistant messages ล่าสุดที่มี result
  const messages = await db.analysisMessage.findMany({
    where: {
      role: 'assistant',
      NOT: { result: null },
    },
    select: { id: true, content: true, result: true, createdAt: true, sessionId: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // ดึง session titles
  const sessionIds = [...new Set(messages.map((m) => m.sessionId))];
  const sessions = await db.analysisSession.findMany({
    where: { id: { in: sessionIds } },
    select: { id: true, title: true },
  });
  const sessionMap = new Map(sessions.map((s) => [s.id, s.title]));

  const items = messages.map((m) => {
    let fallacyCount = 0;
    let topFallacy: FallacyType | undefined;
    let confidence = 0;
    let userText = '';
    try {
      const result = JSON.parse(m.result as string);
      fallacyCount = result.detectedFallacies?.length ?? 0;
      if (fallacyCount > 0) {
        topFallacy = result.detectedFallacies[0]?.type;
        confidence = result.detectedFallacies[0]?.confidence ?? 0;
      } else {
        confidence = result.overallConfidence ?? 0;
      }
      userText = result.input ?? '';
    } catch {
      // ignore parse errors
    }
    return {
      id: m.id,
      title: userText || sessionMap.get(m.sessionId) || 'การวิเคราะห์',
      createdAt: m.createdAt.toISOString(),
      fallacyCount,
      topFallacy,
      confidence,
    };
  });

  return NextResponse.json({
    ok: true,
    items,
    total: items.length,
  });
}
