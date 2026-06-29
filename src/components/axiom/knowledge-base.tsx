'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen,
  ChevronLeft,
  Loader2,
  Quote,
  ListChecks,
  Scale,
  GraduationCap,
  Lightbulb,
  BarChart3,
  Layers,
} from 'lucide-react';
import type { FallacyType } from '@/lib/engine/types';
import { cn } from '@/lib/core';
import { FallacyRelationshipMap } from './fallacy-relationship-map';

interface FallacyListItem {
  type: FallacyType;
  nameTh: string;
  nameEn: string;
  shortTh: string;
  description: string;
  ruleCount: number;
}

interface FallacyDetail extends FallacyListItem {
  rules: { code: string; description: string; weight: number }[];
  samples: { text: string; difficulty: string; explanation: string; reason: string }[];
}

const FALLACY_COLORS: Record<string, string> = {
  ad_hominem: 'border-rose-500/30 bg-rose-500/5 text-rose-400',
  straw_man: 'border-orange-500/30 bg-orange-500/5 text-orange-400',
  red_herring: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
  false_dilemma: 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400',
  hasty_generalization: 'border-lime-500/30 bg-lime-500/5 text-lime-400',
  false_cause: 'border-green-500/30 bg-green-500/5 text-green-400',
  appeal_to_authority: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
  appeal_to_popularity: 'border-teal-500/30 bg-teal-500/5 text-teal-400',
  slippery_slope: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-400',
  circular_reasoning: 'border-sky-500/30 bg-sky-500/5 text-sky-400',
  cherry_picking: 'border-indigo-500/30 bg-indigo-500/5 text-indigo-400',
  burden_of_proof: 'border-violet-500/30 bg-violet-500/5 text-violet-400',
};

const DIFFICULTY_TH: Record<string, string> = {
  easy: 'ง่าย',
  medium: 'กลาง',
  hard: 'ยาก',
  expert: 'ผู้เชี่ยวชาญ',
};

// ===== fallacy-frequency-chart.tsx =====
interface FreqItem {
  type: FallacyType;
  nameTh: string;
  nameEn: string;
  count: number;
  mixedCount: number;
}

interface FreqData {
  frequency: FreqItem[];
  total: number;
  mixedTotal: number;
  byDifficulty: { difficulty: string; count: number }[];
}

const TYPE_COLORS: Record<string, string> = {
  ad_hominem: 'bg-rose-500/60',
  straw_man: 'bg-orange-500/60',
  red_herring: 'bg-amber-500/60',
  false_dilemma: 'bg-yellow-500/60',
  hasty_generalization: 'bg-lime-500/60',
  false_cause: 'bg-green-500/60',
  appeal_to_authority: 'bg-emerald-500/60',
  appeal_to_popularity: 'bg-teal-500/60',
  slippery_slope: 'bg-cyan-500/60',
  circular_reasoning: 'bg-sky-500/60',
  cherry_picking: 'bg-indigo-500/60',
  burden_of_proof: 'bg-violet-500/60',
};


const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-emerald-500/60',
  medium: 'bg-amber-500/60',
  hard: 'bg-rose-500/60',
  expert: 'bg-violet-500/60',
};

export function FallacyFrequencyChart() {
  const [data, setData] = useState<FreqData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/knowledge/frequency');
        const d = await res.json();
        if (!cancelled && d.ok) setData(d);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังโหลด...
      </div>
    );
  }

  if (!data) return null;

  const maxCount = Math.max(...data.frequency.map((f) => f.count), 1);
  const sorted = [...data.frequency].sort((a, b) => b.count - a.count);

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center gap-2">
        <BarChart3 className="h-3.5 w-3.5 text-primary" />
        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          การกระจายตัวอย่างในชุดข้อมูล
        </h4>
      </div>

      {/* Summary stats */}
      <div className="mb-3 grid grid-cols-3 gap-1.5">
        <div className="rounded-md bg-card/40 p-1.5 text-center">
          <div className="text-sm font-semibold text-primary">{data.total}</div>
          <div className="text-[8px] text-muted-foreground">ตัวอย่างหลัก</div>
        </div>
        <div className="rounded-md bg-card/40 p-1.5 text-center">
          <div className="text-sm font-semibold text-violet-400">{data.mixedTotal}</div>
          <div className="text-[8px] text-muted-foreground">ตัวอย่างผสม</div>
        </div>
        <div className="rounded-md bg-card/40 p-1.5 text-center">
          <div className="text-sm font-semibold text-emerald-400">{data.total + data.mixedTotal}</div>
          <div className="text-[8px] text-muted-foreground">ทั้งหมด</div>
        </div>
      </div>

      {/* Per-type frequency bars */}
      <div className="space-y-1.5">
        {sorted.map((f) => {
          const pct = (f.count / maxCount) * 100;
          const colorClass = TYPE_COLORS[f.type] ?? 'bg-primary/60';
          return (
            <div key={f.type} className="flex items-center gap-1.5">
              <span className="w-20 shrink-0 truncate text-[9px] text-muted-foreground">{f.nameTh}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-card/40">
                    <div
                      className={cn('h-full rounded-full transition-all', colorClass)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[9px] font-medium text-foreground">{f.count}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Difficulty distribution */}
      {data.byDifficulty.length > 0 && (
        <>
          <div className="mt-3 mb-1.5 flex items-center gap-1.5">
            <Layers className="h-3 w-3 text-muted-foreground" />
            <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              ตามระดับความยาก
            </span>
          </div>
          <div className="space-y-1">
            {(['easy', 'medium', 'hard', 'expert'] as const).map((diff) => {
              const item = data.byDifficulty.find((d) => d.difficulty === diff);
              if (!item) return null;
              const total = data.byDifficulty.reduce((s, d) => s + d.count, 0) || 1;
              const pct = (item.count / total) * 100;
              return (
                <div key={diff} className="flex items-center gap-1.5">
                  <span className="w-14 shrink-0 text-[9px] text-muted-foreground">{DIFFICULTY_TH[diff]}</span>
                  <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-card/40">
                    <div
                      className={cn('h-full rounded-full', DIFFICULTY_COLORS[diff])}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[9px] font-medium text-foreground">{item.count}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}


export function KnowledgeBase() {
  const [list, setList] = useState<FallacyListItem[]>([]);
  const [selected, setSelected] = useState<FallacyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/knowledge');
        const data = await res.json();
        if (!cancelled && data.ok) setList(data.fallacies);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectType = async (type: FallacyType) => {
    setLoadingDetail(true);
    setSelected(null);
    try {
      const res = await fetch(`/api/knowledge?type=${type}&samples=5`);
      const data = await res.json();
      if (data.ok) setSelected(data.fallacy);
    } finally {
      setLoadingDetail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังโหลดฐานความรู้...
      </div>
    );
  }

  if (selected) {
    const colorClass = FALLACY_COLORS[selected.type] ?? 'border-primary/30 bg-primary/5 text-primary';
    return (
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelected(null)}
          className="mb-2 h-8 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" /> กลับไปยังรายการ
        </Button>

        <Card className={cn('border p-4', colorClass)}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-white/5 p-2">
              <Scale className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold">{selected.nameTh}</h3>
              <p className="text-xs opacity-80">{selected.nameEn}</p>
              <p className="mt-2 text-sm leading-relaxed">{selected.description}</p>
            </div>
          </div>
        </Card>

        {loadingDetail ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังโหลดรายละเอียด...
          </div>
        ) : (
          <>
            {/* Detection rules */}
            <Card className="p-4">
              <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" /> กฎตรวจจับ ({selected.rules.length})
              </h4>
              <div className="space-y-2">
                {selected.rules.map((r) => (
                  <div key={r.code} className="flex items-start gap-2 rounded-md bg-card/40 p-2">
                    <Badge variant="secondary" className="bg-white/5 font-mono text-[9px]">
                      {r.code}
                    </Badge>
                    <span className="flex-1 text-xs leading-relaxed">{r.description}</span>
                    <Badge variant="outline" className="border-white/10 text-[9px]">
                      w={r.weight.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Samples */}
            <Card className="p-4">
              <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <GraduationCap className="h-3.5 w-3.5" /> ตัวอย่าง ({selected.samples.length})
              </h4>
              <div className="space-y-2">
                {selected.samples.map((s, i) => (
                  <div key={i} className="rounded-lg border border-border/40 bg-card/40 p-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[9px]',
                          s.difficulty === 'easy' && 'bg-emerald-500/10 text-emerald-400',
                          s.difficulty === 'medium' && 'bg-amber-500/10 text-amber-400',
                          s.difficulty === 'hard' && 'bg-rose-500/10 text-rose-400',
                          s.difficulty === 'expert' && 'bg-violet-500/10 text-violet-400',
                        )}
                      >
                        {DIFFICULTY_TH[s.difficulty] ?? s.difficulty}
                      </Badge>
                    </div>
                    <div className="mb-2 flex gap-1.5">
                      <Quote className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                      <p className="text-xs leading-relaxed">{s.text}</p>
                    </div>
                    <Separator className="my-2 bg-white/5" />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      <Lightbulb className="mr-1 inline h-2.5 w-2.5 text-amber-400" />
                      {s.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-2">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">ฐานความรู้ตรรกะวิบัติ</h3>
        <Badge variant="outline" className="ml-auto border-white/10 bg-white/5 text-[10px]">
          {list.length} ประเภท
        </Badge>
      </div>
      <ScrollArea className="h-[calc(100vh-12rem)] pr-2">
        <div className="space-y-1.5">
          {list.map((f) => {
            const colorClass = FALLACY_COLORS[f.type] ?? 'border-primary/30 bg-primary/5 text-primary';
            return (
              <button
                key={f.type}
                onClick={() => selectType(f.type)}
                className={cn(
                  'group flex w-full items-start gap-3 rounded-lg border p-2.5 text-left transition hover:border-primary/40 hover:bg-card/80',
                  colorClass,
                )}
              >
                <div className="mt-0.5 rounded-md bg-white/5 p-1.5">
                  <Scale className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-semibold text-foreground">{f.nameTh}</span>
                    <Badge variant="outline" className="shrink-0 border-white/10 text-[9px]">
                      {f.ruleCount} กฎ
                    </Badge>
                  </div>
                  <p className="text-[10px] opacity-70">{f.nameEn}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground group-hover:text-foreground/80">
                    {f.shortTh}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {/* Frequency chart at the bottom of the list */}
        <div className="mt-3 space-y-3">
          <FallacyFrequencyChart />
          <FallacyRelationshipMap />
        </div>
      </ScrollArea>
    </div>
  );
}
