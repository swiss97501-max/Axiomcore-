// AxiomCore API - /api/compare
// ดึงข้อมูล 2 sessions พร้อมผลการวิเคราะห์เพื่อเปรียบเทียบ

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/core';
import type { AnalysisResult } from '@/lib/engine/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const a = sp.get('a');
  const b = sp.get('b');

  if (!a || !b) {
    return NextResponse.json({ error: 'กรุณาระบุ session id ทั้งสอง (a, b)' }, { status: 400 });
  }

  try {
    const [sessionA, sessionB] = await Promise.all([
      db.analysisSession.findUnique({
        where: { id: a },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      }),
      db.analysisSession.findUnique({
        where: { id: b },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      }),
    ]);

    if (!sessionA || !sessionB) {
      return NextResponse.json({ error: 'ไม่พบ session ที่ระบุ' }, { status: 404 });
    }

    // ดึง assistant messages ที่มี result จากทั้งสอง session
    const extractResults = (session: typeof sessionA) => {
      if (!session) return [];
      return session.messages
        .filter((m) => m.role === 'assistant' && m.result)
        .map((m, i) => {
          const userMsg = session.messages.filter((mm) => mm.role === 'user')[i];
          return {
            userText: userMsg?.content ?? '',
            result: JSON.parse(m.result as string) as AnalysisResult,
            createdAt: m.createdAt,
          };
        });
    };

    const resultsA = extractResults(sessionA);
    const resultsB = extractResults(sessionB);

    return NextResponse.json({
      ok: true,
      comparison: {
        a: { id: sessionA.id, title: sessionA.title, createdAt: sessionA.createdAt, results: resultsA },
        b: { id: sessionB.id, title: sessionB.title, createdAt: sessionB.createdAt, results: resultsB },
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: 'เปรียบเทียบไม่สำเร็จ: ' + msg }, { status: 500 });
  }
}
