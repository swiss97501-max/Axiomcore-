// AxiomCore API - /api/stats
// สถิติการวิเคราะห์รวมจากประวัติทั้งหมด (พร้อม in-memory cache 5 นาที)

import { NextResponse } from 'next/server';
import { db } from '@/lib/core';
import { FALLACY_META, ALL_FALLACY_TYPES } from '@/lib/engine/types';
import { getCache, setCache, CACHE_KEYS, STATS_CACHE_TTL } from '@/lib/core';

export const runtime = 'nodejs';

export async function GET() {
  // ตรวจ cache ก่อน
  const cached = getCache<unknown>(CACHE_KEYS.STATS);
  if (cached) {
    return NextResponse.json({ ok: true, stats: cached, cached: true });
  }

  // ดึง assistant messages ทั้งหมดที่มี result
  const messages = await db.analysisMessage.findMany({
    where: {
      role: 'assistant',
      NOT: { result: null },
    },
    select: { result: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const totalAnalyses = messages.length;
  let totalFallacies = 0;
  let totalSentences = 0;
  let sumConfidence = 0;
  let confidenceCount = 0;
  const typeFrequency: Record<string, number> = {};
  const confidenceBuckets = { low: 0, medium: 0, high: 0, veryHigh: 0 };
  const fallaciesPerAnalysis = { '0': 0, '1': 0, '2': 0, '3+': 0 };

  // สถิติ 7 วันล่าสุด
  const nowDate = new Date();
  const sevenDaysAgo = new Date(nowDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentByDay: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(nowDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = day.toISOString().slice(0, 10);
    recentByDay.push({ date: dayStr, count: 0 });
  }

  for (const m of messages) {
    try {
      const result = JSON.parse(m.result as string);
      totalFallacies += result.detectedFallacies?.length ?? 0;
      totalSentences += result.stats?.sentenceCount ?? 0;
      const count = result.detectedFallacies?.length ?? 0;
      if (count === 0) fallaciesPerAnalysis['0']++;
      else if (count === 1) fallaciesPerAnalysis['1']++;
      else if (count === 2) fallaciesPerAnalysis['2']++;
      else fallaciesPerAnalysis['3+']++;

      for (const f of result.detectedFallacies ?? []) {
        typeFrequency[f.type] = (typeFrequency[f.type] ?? 0) + 1;
        sumConfidence += f.confidence;
        confidenceCount++;
        if (f.confidence >= 0.75) confidenceBuckets.veryHigh++;
        else if (f.confidence >= 0.55) confidenceBuckets.high++;
        else if (f.confidence >= 0.35) confidenceBuckets.medium++;
        else confidenceBuckets.low++;
      }

      // นับรายวัน
      const dayStr = m.createdAt.toISOString().slice(0, 10);
      const dayEntry = recentByDay.find((d) => d.date === dayStr);
      if (dayEntry) dayEntry.count++;
    } catch {
      // skip invalid JSON
    }
  }

  // คำนวณ 7 วัน vs ก่อนหน้า
  const recentCount = messages.filter((m) => m.createdAt >= sevenDaysAgo).length;

  const avgConfidence = confidenceCount > 0 ? Math.round((sumConfidence / confidenceCount) * 100) / 100 : 0;

  // Top fallacies
  const topFallacies = ALL_FALLACY_TYPES.map((type) => ({
    type,
    nameTh: FALLACY_META[type].nameTh,
    nameEn: FALLACY_META[type].nameEn,
    count: typeFrequency[type] ?? 0,
  }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count);

  const stats = {
    totalAnalyses,
    totalFallacies,
    totalSentences,
    avgConfidence,
    avgFallaciesPerAnalysis: totalAnalyses > 0 ? Math.round((totalFallacies / totalAnalyses) * 100) / 100 : 0,
    recentCount,
    typeFrequency,
    confidenceBuckets,
    fallaciesPerAnalysis,
    recentByDay,
    topFallacies,
  };

  // เก็บใน cache
  setCache(CACHE_KEYS.STATS, stats, STATS_CACHE_TTL);

  return NextResponse.json({ ok: true, stats, cached: false });
}
