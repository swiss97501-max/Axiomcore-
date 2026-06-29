// AxiomCore API - /api/sessions
// จัดการประวัติการวิเคราะห์ (chat sessions)

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/core';

export const runtime = 'nodejs';

export async function GET() {
  const sessions = await db.analysisSession.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  return NextResponse.json({
    ok: true,
    sessions: sessions.map((s) => {
      const userMsg = s.messages.find((m) => m.role === 'user');
      const assistantMsg = s.messages.find((m) => m.role === 'assistant');
      // title: ใช้ title field (อาจเป็นข้อความแรกที่ตั้ง) หรือข้อความ user แรก
      const title = s.title && s.title !== 'การวิเคราะห์ใหม่'
        ? s.title
        : (userMsg?.content ?? 'การวิเคราะห์ใหม่');
      // preview: สรุปผลการวิเคราะห์ (assistant message) ถ้ามี ไม่เช่นนั้นใช้ user message
      const preview = assistantMsg?.content || userMsg?.content || '';
      return {
        id: s.id,
        title,
        preview,
        createdAt: s.createdAt,
        messageCount: s.messages.length,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = (body?.title ?? 'การวิเคราะห์ใหม่').toString().slice(0, 120);
    const session = await db.analysisSession.create({ data: { title } });
    return NextResponse.json({ ok: true, session });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: 'ไม่สามารถสร้าง session ได้: ' + msg }, { status: 500 });
  }
}
