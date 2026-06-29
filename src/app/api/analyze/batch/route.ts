// AxiomCore API - /api/analyze/batch
// วิเคราะห์หลายข้อความพร้อมกันเพื่อเปรียบเทียบ

import { NextRequest, NextResponse } from 'next/server';
import { getAnalyzer } from '@/lib/engine/analyzer';
import type { AnalysisResult } from '@/lib/engine/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const texts: unknown = body?.texts;

    if (!Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ error: 'กรุณาส่ง texts เป็น array ของข้อความ' }, { status: 400 });
    }
    if (texts.length > 20) {
      return NextResponse.json({ error: 'สูงสุด 20 ข้อความต่อครั้ง' }, { status: 400 });
    }

    const analyzer = getAnalyzer();
    const results: Array<{ text: string; result: AnalysisResult } | { text: string; error: string }> = [];

    for (const t of texts) {
      const text = String(t ?? '').trim();
      if (!text) {
        results.push({ text: '', error: 'ข้อความว่าง' });
        continue;
      }
      if (text.length > 5000) {
        results.push({ text: text.slice(0, 50) + '…', error: 'ข้อความยาวเกิน 5,000 ตัวอักษร' });
        continue;
      }
      try {
        const result = analyzer.analyze(text);
        results.push({ text, result });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown error';
        results.push({ text, error: msg });
      }
    }

    // สร้าง comparison summary
    const comparison = {
      total: results.length,
      withFallacies: results.filter((r) => 'result' in r && r.result.detectedFallacies.length > 0).length,
      clean: results.filter((r) => 'result' in r && r.result.detectedFallacies.length === 0).length,
      errors: results.filter((r) => 'error' in r).length,
      // นับประเภทตรรกะวิบัติที่พบบ่อย
      typeFrequency: results.reduce((acc, r) => {
        if ('result' in r) {
          for (const f of r.result.detectedFallacies) {
            acc[f.type] = (acc[f.type] ?? 0) + 1;
          }
        }
        return acc;
      }, {} as Record<string, number>),
      // ค่า confidence เฉลี่ย
      avgConfidence: (() => {
        const confs = results
          .filter((r): r is { text: string; result: AnalysisResult } => 'result' in r && r.result.detectedFallacies.length > 0)
          .flatMap((r) => r.result.detectedFallacies.map((f) => f.confidence));
        if (confs.length === 0) return 0;
        return Math.round((confs.reduce((a, b) => a + b, 0) / confs.length) * 100) / 100;
      })(),
    };

    return NextResponse.json({ ok: true, results, comparison });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด: ' + msg }, { status: 500 });
  }
}
