// AxiomCore API - /api/sessions/[id]
// ดึงรายละเอียด session หนึ่ง พร้อม messages ทั้งหมด / ลบ session

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/core';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await db.analysisSession.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) {
      return NextResponse.json({ error: 'ไม่พบ session' }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      session: {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        messages: session.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          result: m.result ? JSON.parse(m.result) : null,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: 'ดึง session ไม่สำเร็จ: ' + msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await db.analysisSession.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: 'ลบ session ไม่สำเร็จ: ' + msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const title = (body?.title ?? '').toString().slice(0, 120);
    if (!title) {
      return NextResponse.json({ error: 'กรุณาระบุ title' }, { status: 400 });
    }
    const session = await db.analysisSession.update({
      where: { id },
      data: { title },
    });
    return NextResponse.json({ ok: true, session });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: 'อัปเดต session ไม่สำเร็จ: ' + msg }, { status: 500 });
  }
}
