// AxiomCore API - /api/analyze
// รับข้อความและส่งกลับผลวิเคราะห์ตรรกะวิบัติ

import { NextRequest, NextResponse } from 'next/server';
import { getAnalyzer } from '@/lib/engine/analyzer';
import type { AnalysisResult } from '@/lib/engine/types';
import { db } from '@/lib/core';
import { invalidateCache, CACHE_KEYS } from '@/lib/core';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const text: string = (body?.text ?? '').toString().trim();
    const sessionId: string | undefined = body?.sessionId;

    if (!text) {
      return NextResponse.json({ error: 'กรุณาส่งข้อความที่ต้องการวิเคราะห์ (text)' }, { status: 400 });
    }
    if (text.length > 5000) {
      return NextResponse.json({ error: 'ข้อความยาวเกินไป (สูงสุด 5,000 ตัวอักษร)' }, { status: 400 });
    }

    const analyzer = getAnalyzer();
    const result: AnalysisResult = analyzer.analyze(text);

    // บันทึกประวัติถ้ามี sessionId
    if (sessionId) {
      try {
        await db.analysisMessage.createMany({
          data: [
            { sessionId, role: 'user', content: text },
            {
              sessionId,
              role: 'assistant',
              content: result.summary,
              result: JSON.stringify(result),
            },
          ],
        });
        // Invalidate stats cache เพราะมีการวิเคราะห์ใหม่
        invalidateCache(CACHE_KEYS.STATS);
      } catch {
        // ignore DB errors for history
      }
    }

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการวิเคราะห์: ' + msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    info: 'AxiomCore Analysis API — ส่ง POST พร้อม { text: string } เพื่อวิเคราะห์ตรรกะวิบัติ',
  });
}
