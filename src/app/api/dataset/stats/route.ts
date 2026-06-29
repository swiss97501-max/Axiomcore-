// AxiomCore API - /api/dataset/stats
// ส่งสถิติของชุดข้อมูลในฐานข้อมูลและความสามารถในการสร้าง

import { NextResponse } from 'next/server';
import { db } from '@/lib/core';
import { ALL_FALLACY_TYPES, FALLACY_META } from '@/lib/engine/types';
import { DETECTION_RULES } from '@/lib/engine/fallacies/rules';
import { ALL_DEBATE_CATEGORIES } from '@/lib/generator';

export const runtime = 'nodejs';

export async function GET() {
  const [fallacyCount, mixedCount, debateCount, sessionCount, ruleCount, logCount] = await Promise.all([
    db.fallacyExample.count(),
    db.mixedFallacyExample.count(),
    db.debateTopic.count(),
    db.analysisSession.count(),
    db.detectionRule.count(),
    db.selfImprovementLog.count(),
  ]);

  const byType = await db.fallacyExample.groupBy({
    by: ['fallacyType'],
    _count: { _all: true },
  });
  const byDifficulty = await db.fallacyExample.groupBy({
    by: ['difficulty'],
    _count: { _all: true },
  });
  const debateByCategory = await db.debateTopic.groupBy({
    by: ['category'],
    _count: { _all: true },
  });

  const fallacyMeta = ALL_FALLACY_TYPES.map((t) => ({
    type: t,
    nameTh: FALLACY_META[t].nameTh,
    nameEn: FALLACY_META[t].nameEn,
    ruleCount: DETECTION_RULES.filter((r) => r.fallacyType === t).length,
    exampleCount: byType.find((b) => b.fallacyType === t)?._count._all ?? 0,
  }));

  return NextResponse.json({
    ok: true,
    stats: {
      fallacyExamples: fallacyCount,
      mixedFallacyExamples: mixedCount,
      debateTopics: debateCount,
      analysisSessions: sessionCount,
      detectionRules: ruleCount,
      improvementLogs: logCount,
      supportedFallacyTypes: ALL_FALLACY_TYPES.length,
      supportedDebateCategories: ALL_DEBATE_CATEGORIES.length,
      byDifficulty,
      debateByCategory,
    },
    fallacies: fallacyMeta,
  });
}
