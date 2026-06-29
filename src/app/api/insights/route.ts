// AxiomCore API - /api/insights
// สร้าง insights (สรุปแนวโน้ม) จากประวัติการวิเคราะห์อัตโนมัติ

import { NextResponse } from 'next/server';
import { db } from '@/lib/core';
import { FALLACY_META } from '@/lib/engine/types';

export const runtime = 'nodejs';

export async function GET() {
  // ดึง assistant messages ล่าสุด 100 รายการที่มี result
  const messages = await db.analysisMessage.findMany({
    where: {
      role: 'assistant',
      NOT: { result: null },
    },
    select: { result: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  if (messages.length === 0) {
    return NextResponse.json({ ok: true, hasData: false, insights: [] });
  }

  const insights: { type: string; title: string; description: string; icon: string; severity?: string }[] = [];

  // Parse results
  const results = messages.map((m) => {
    try {
      const r = JSON.parse(m.result as string);
      return {
        detectedFallacies: r.detectedFallacies ?? [],
        overallConfidence: r.overallConfidence ?? 0,
        stats: r.stats ?? {},
        createdAt: m.createdAt,
      };
    } catch {
      return { detectedFallacies: [], overallConfidence: 0, stats: {}, createdAt: m.createdAt };
    }
  });

  const totalAnalyses = results.length;
  const totalFallacies = results.reduce((s, r) => s + r.detectedFallacies.length, 0);
  const avgConfidence = results.reduce((s, r) => s + r.overallConfidence, 0) / totalAnalyses;
  const withFallacies = results.filter((r) => r.detectedFallacies.length > 0).length;
  const cleanRate = ((totalAnalyses - withFallacies) / totalAnalyses) * 100;

  // Type frequency
  const typeFreq: Record<string, number> = {};
  for (const r of results) {
    for (const f of r.detectedFallacies) {
      typeFreq[f.type] = (typeFreq[f.type] ?? 0) + 1;
    }
  }
  const sortedTypes = Object.entries(typeFreq).sort(([, a], [, b]) => b - a);
  const topType = sortedTypes[0];
  const topTypeName = topType ? FALLACY_META[topType[0] as keyof typeof FALLACY_META]?.nameTh : null;

  // Recent trend (compare last 10 vs previous 10)
  const recent = results.slice(0, 10);
  const previous = results.slice(10, 20);
  const recentAvg = recent.reduce((s, r) => s + r.overallConfidence, 0) / recent.length;
  const previousAvg = previous.length > 0 ? previous.reduce((s, r) => s + r.overallConfidence, 0) / previous.length : recentAvg;
  const trendDelta = recentAvg - previousAvg;

  // Generate insights
  if (topType) {
    insights.push({
      type: 'top_fallacy',
      title: `ตรรกะวิบัติที่พบบ่อยที่สุด: ${topTypeName}`,
      description: `พบ "${topTypeName}" ${topType[1]} ครั้ง จาก ${totalAnalyses} การวิเคราะห์ (${Math.round((topType[1] / totalFallacies) * 100)}% ของตรรกะวิบัติทั้งหมด)`,
      icon: 'AlertTriangle',
      severity: 'high',
    });
  }

  if (cleanRate > 60) {
    insights.push({
      type: 'clean_rate',
      title: `อัตราข้อความปกติสูง: ${Math.round(cleanRate)}%`,
      description: `จาก ${totalAnalyses} การวิเคราะห์ พบว่า ${Math.round(cleanRate)}% ไม่มีตรรกะวิบัติ แสดงว่าส่วนใหญ่เป็นข้อความที่มีเหตุผล`,
      icon: 'CheckCircle2',
      severity: 'low',
    });
  } else if (cleanRate < 30) {
    insights.push({
      type: 'clean_rate',
      title: `อัตราข้อความปกติต่ำ: ${Math.round(cleanRate)}%`,
      description: `จาก ${totalAnalyses} การวิเคราะห์ พบว่า ${Math.round(100 - cleanRate)}% มีตรรกะวิบัติ อาจเป็นเพราะผู้ใช้ทดสอบข้อความที่น่าสงสัย`,
      icon: 'AlertCircle',
      severity: 'medium',
    });
  }

  if (Math.abs(trendDelta) > 0.1) {
    const direction = trendDelta > 0 ? 'เพิ่มขึ้น' : 'ลดลง';
    const severity = trendDelta > 0 ? 'medium' : 'low';
    insights.push({
      type: 'trend',
      title: `ความมั่นใจ${direction} ${Math.abs(Math.round(trendDelta * 100))}%`,
      description: `เปรียบเทียบ 10 การวิเคราะห์ล่าสุด กับ 10 ครั้งก่อนหน้า ความมั่นใจ${direction}จาก ${Math.round(previousAvg * 100)}% เป็น ${Math.round(recentAvg * 100)}%`,
      icon: 'TrendingUp',
      severity,
    });
  }

  // Average confidence insight
  if (avgConfidence > 0.7) {
    insights.push({
      type: 'high_confidence',
      title: `ความมั่นใจเฉลี่ยสูง: ${Math.round(avgConfidence * 100)}%`,
      description: `ความมั่นใจเฉลี่ยของการตรวจจับสูง แสดงว่ากฎการตรวจจับทำงานได้ดีกับข้อความที่ผู้ใช้ส่งมา`,
      icon: 'TrendingUp',
      severity: 'low',
    });
  } else if (avgConfidence < 0.4 && totalFallacies > 0) {
    insights.push({
      type: 'low_confidence',
      title: `ความมั่นใจเฉลี่ยต่ำ: ${Math.round(avgConfidence * 100)}%`,
      description: `ความมั่นใจเฉลี่ยต่ำ อาจเป็นเพราะข้อความที่ส่งมามีความคลุมเครือ หรือกฎการตรวจจับยังไม่ครอบคลุม`,
      icon: 'AlertCircle',
      severity: 'medium',
    });
  }

  // Multiple fallacies insight
  const multiFallacy = results.filter((r) => r.detectedFallacies.length >= 2).length;
  if (multiFallacy > 0) {
    insights.push({
      type: 'multi_fallacy',
      title: `พบหลายตรรกะวิบัติในข้อความเดียว: ${multiFallacy} ครั้ง`,
      description: `มี ${multiFallacy} ข้อความที่พบตั้งแต่ 2 ตรรกะวิบัติขึ้นไพ้ แสดงว่าข้อความเหล่านั้นมีปัญหาซับซ้อน`,
      icon: 'Layers',
      severity: 'medium',
    });
  }

  return NextResponse.json({
    ok: true,
    hasData: true,
    insights,
    summary: {
      totalAnalyses,
      totalFallacies,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      cleanRate: Math.round(cleanRate),
      topFallacy: topTypeName,
    },
  });
}
