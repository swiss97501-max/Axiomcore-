'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Clock,
  Database,
  Brain,
  Loader2,
  Calendar,
  Lightbulb,
  Inbox,
  CheckCircle2,
  AlertCircle,
  Layers,
} from 'lucide-react';
import type { FallacyType } from '@/lib/engine/types';
import { FALLACY_META, ALL_FALLACY_TYPES } from '@/lib/engine/types';
import { cn } from '@/lib/core';

interface Stats {
  totalAnalyses: number;
  totalFallacies: number;
  totalSentences: number;
  avgConfidence: number;
  avgFallaciesPerAnalysis: number;
  recentCount: number;
  typeFrequency: Record<string, number>;
  confidenceBuckets: { low: number; medium: number; high: number; veryHigh: number };
  fallaciesPerAnalysis: { '0': number; '1': number; '2': number; '3+': number };
  recentByDay: { date: string; count: number }[];
  topFallacies: { type: FallacyType; nameTh: string; nameEn: string; count: number }[];
}

const FALLACY_COLORS: Record<string, string> = {
  ad_hominem: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  straw_man: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  red_herring: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  false_dilemma: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  hasty_generalization: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  false_cause: 'bg-green-500/20 text-green-400 border-green-500/30',
  appeal_to_authority: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  appeal_to_popularity: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  slippery_slope: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  circular_reasoning: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  cherry_picking: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  burden_of_proof: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
};

// ===== donut-chart.tsx =====
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

const FALLACY_CHART_COLORS = [
  '#fb7185', // rose-400
  '#fb923c', // orange-400
  '#fbbf24', // amber-400
  '#facc15', // yellow-400
  '#a3e635', // lime-400
  '#4ade80', // green-400
  '#34d399', // emerald-400
  '#2dd4bf', // teal-400
  '#22d3ee', // cyan-400
  '#38bdf8', // sky-400
  '#818cf8', // indigo-400
  '#a78bfa', // violet-400
];

export function DonutChart({
  data,
  size = 140,
  thickness = 18,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  if (total === 0 || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-full border-2 border-dashed border-border/40 text-[10px] text-muted-foreground"
        style={{ width: size, height: size }}
      >
        ไม่มีข้อมูล
      </div>
    );
  }

  // คำนวณ segments ด้วย reduce เพื่อหลีกเลี่ยง mutation ใน render
  const { segments } = data.reduce(
    (acc, d, i) => {
      const fraction = d.value / total;
      const dashLength = fraction * circumference;
      const segment = {
        key: i,
        color: d.color || FALLACY_CHART_COLORS[i % FALLACY_CHART_COLORS.length],
        dashLength,
        dashGap: circumference - dashLength,
        offset: -acc.runningOffset,
        label: d.label,
        value: d.value,
        pct: Math.round(fraction * 100),
      };
      return { segments: [...acc.segments, segment], runningOffset: acc.runningOffset + dashLength };
    },
    { segments: [] as Array<Record<string, unknown>>, runningOffset: 0 },
  );

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={thickness}
            className="text-border/30"
          />
          {/* Segments */}
          {segments.map((s) => (
            <circle
              key={s.key}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${s.dashLength} ${s.dashGap}`}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
              style={{ transition: 'stroke-dasharray 0.6s ease-out, stroke-dashoffset 0.6s ease-out' }}
            >
              <title>{`${s.label}: ${s.value} (${s.pct}%)`}</title>
            </circle>
          ))}
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="text-lg font-semibold leading-none text-foreground">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="mt-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
              {centerLabel}
            </span>
          )}
        </div>
      </div>
      {/* Legend */}
      <div className="flex-1 space-y-1">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-[10px]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            <span className="flex-1 truncate text-muted-foreground">{s.label}</span>
            <span className="font-medium text-foreground">{s.value}</span>
            <span className="text-muted-foreground/60">({s.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { FALLACY_CHART_COLORS };


// ===== analysis-timeline.tsx =====
interface TimelineItem {
  id: string;
  title: string;
  createdAt: string;
  fallacyCount: number;
  topFallacy?: FallacyType;
  confidence: number;
}

interface TimelineData {
  items: TimelineItem[];
  total: number;
}


const FALLACY_TEXT_COLORS: Record<string, string> = {
  ad_hominem: 'text-rose-400',
  straw_man: 'text-orange-400',
  red_herring: 'text-amber-400',
  false_dilemma: 'text-yellow-400',
  hasty_generalization: 'text-lime-400',
  false_cause: 'text-green-400',
  appeal_to_authority: 'text-emerald-400',
  appeal_to_popularity: 'text-teal-400',
  slippery_slope: 'text-cyan-400',
  circular_reasoning: 'text-sky-400',
  cherry_picking: 'text-indigo-400',
  burden_of_proof: 'text-violet-400',
};

export function AnalysisTimeline() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/timeline');
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

  if (!data || data.items.length === 0) {
    return null;
  }

  // Group by date
  const byDate = new Map<string, TimelineItem[]>();
  for (const item of data.items) {
    const dateStr = new Date(item.createdAt).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    if (!byDate.has(dateStr)) byDate.set(dateStr, []);
    byDate.get(dateStr)!.push(item);
  }

  const maxConfidence = Math.max(...data.items.map((i) => i.confidence), 1);

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-primary" />
        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          ไทม์ไลน์การวิเคราะห์
        </h4>
        <Badge variant="outline" className="ml-auto border-white/10 bg-white/5 text-[9px]">
          {data.total} ล่าสุด
        </Badge>
      </div>

      <div className="space-y-3">
        {[...byDate.entries()].map(([date, items]) => (
          <div key={date}>
            <div className="mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-[9px] font-medium text-muted-foreground">{date}</span>
              <span className="text-[8px] text-muted-foreground/60">· {items.length} ครั้ง</span>
            </div>
            <div className="relative space-y-1.5 border-l border-border/40 pl-3">
              {items.map((item) => {
                const time = new Date(item.createdAt).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const confPct = Math.round(item.confidence * 100);
                const barWidth = (item.confidence / maxConfidence) * 100;
                return (
                  <div key={item.id} className="relative">
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        'absolute -left-[15px] top-1.5 h-2 w-2 rounded-full ring-2 ring-background',
                        item.topFallacy ? FALLACY_COLORS[item.topFallacy] : 'bg-muted-foreground/40',
                      )}
                    />
                    <div className="rounded-md bg-card/40 p-1.5">
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <span className="text-[9px] text-muted-foreground">{time}</span>
                        {item.fallacyCount > 0 ? (
                          <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-[8px] text-rose-400">
                            {item.fallacyCount} วิบัติ
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[8px] text-emerald-400">
                            ปกติ
                          </Badge>
                        )}
                        <span className="ml-auto text-[9px] font-medium text-primary">{confPct}%</span>
                      </div>
                      <p className="line-clamp-1 text-[10px] text-muted-foreground">{item.title}</p>
                      {item.topFallacy && (
                        <div className="mt-0.5 flex items-center gap-1">
                          <span className={cn('text-[8px] font-medium', FALLACY_TEXT_COLORS[item.topFallacy])}>
                            {FALLACY_META[item.topFallacy].nameTh}
                          </span>
                          <div className="flex-1 h-0.5 overflow-hidden rounded-full bg-card/60">
                            <div
                              className={cn('h-full rounded-full', FALLACY_COLORS[item.topFallacy])}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}


// ===== analysis-insights.tsx =====
interface Insight {
  type: string;
  title: string;
  description: string;
  icon: string;
  severity?: string;
}

interface InsightsData {
  insights: Insight[];
  summary: {
    totalAnalyses: number;
    totalFallacies: number;
    avgConfidence: number;
    cleanRate: number;
    topFallacy?: string;
  };
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Layers,
};

const SEVERITY_STYLES: Record<string, { border: string; bg: string; icon: string }> = {
  high: {
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/5',
    icon: 'text-rose-400',
  },
  medium: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    icon: 'text-amber-400',
  },
  low: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    icon: 'text-emerald-400',
  },
};

export function AnalysisInsights() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/insights');
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
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังวิเคราะห์...
      </div>
    );
  }

  if (!data || data.insights.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-3">
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb className="h-3.5 w-3.5 text-primary" />
        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
           Insight จากการวิเคราะห์
        </h4>
        <Badge variant="outline" className="ml-auto border-primary/30 bg-primary/10 text-[9px] text-primary">
          {data.insights.length} ข้อ
        </Badge>
      </div>

      <div className="space-y-2">
        {data.insights.map((insight, i) => {
          const Icon = ICON_MAP[insight.icon] ?? Lightbulb;
          const style = SEVERITY_STYLES[insight.severity ?? 'low'] ?? SEVERITY_STYLES.low;
          return (
            <div
              key={i}
              className={cn('flex items-start gap-2 rounded-md border p-2', style.border, style.bg)}
            >
              <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', style.icon)} />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium text-foreground">{insight.title}</div>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                  {insight.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}


// ===== self-improvement-stats.tsx =====

interface LatestResult {
  iteration: number;
  f1Score: number;
  precision: number;
  recall: number;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  trueNegative: number;
  totalTested: number;
  rulesAdjusted: number;
  notes: string;
  createdAt: string;
}

interface HistoryItem {
  iteration: number;
  f1Score: number;
  precision: number;
  recall: number;
  totalTested: number;
  rulesAdjusted: number;
}

export function SelfImprovementStats() {
  const [latest, setLatest] = useState<LatestResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/self-improvement/latest');
        const data = await res.json();
        if (!cancelled) {
          setHasData(data.hasData);
          if (data.hasData) {
            setLatest(data.latest);
            setHistory(data.history);
          }
        }
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

  if (!hasData) {
    return (
      <Card className="border-violet-500/20 bg-violet-500/5 p-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-violet-400" />
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Self-Improvement Loop
          </h4>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          ยังไม่มีข้อมูล — รัน self-improvement จากแผงข้อมูลระบบเพื่อปรับปรุงกฎ
        </p>
      </Card>
    );
  }

  if (!latest) return null;

  const f1Pct = Math.round(latest.f1Score * 100);
  const precisionPct = Math.round(latest.precision * 100);
  const recallPct = Math.round(latest.recall * 100);

  return (
    <Card className="border-violet-500/20 bg-violet-500/5 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Brain className="h-4 w-4 text-violet-400" />
        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Self-Improvement Loop
        </h4>
        <Badge variant="outline" className="ml-auto border-violet-500/30 bg-violet-500/10 text-[9px] text-violet-400">
          รอบที่ {latest.iteration}
        </Badge>
      </div>

      {/* F1 / Precision / Recall */}
      <div className="grid grid-cols-3 gap-2">
        <MetricBox label="F1" value={f1Pct} color="text-violet-400" />
        <MetricBox label="Precision" value={precisionPct} color="text-emerald-400" />
        <MetricBox label="Recall" value={recallPct} color="text-cyan-400" />
      </div>

      {/* Confusion matrix */}
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <ConfusionBox label="TP" value={latest.truePositive} color="text-emerald-400" />
        <ConfusionBox label="FP" value={latest.falsePositive} color="text-rose-400" />
        <ConfusionBox label="FN" value={latest.falseNegative} color="text-amber-400" />
        <ConfusionBox label="TN" value={latest.trueNegative} color="text-muted-foreground" />
      </div>

      {/* Notes */}
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        {latest.notes}
      </p>

      {/* History chart */}
      {history.length > 1 && (
        <>
          <Separator className="my-2 bg-white/5" />
          <h5 className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            ประวัติ F1 Score
          </h5>
          <div className="flex h-12 items-end justify-between gap-1">
            {history.map((h) => {
              const height = Math.max(4, h.f1Score * 100);
              return (
                <div key={h.iteration} className="flex flex-1 flex-col items-center gap-0.5">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-violet-500/60 transition-all hover:bg-violet-500/80"
                      style={{ height: `${height}%`, minHeight: '2px' }}
                      title={`รอบ ${h.iteration}: F1=${Math.round(h.f1Score * 100)}%`}
                    />
                  </div>
                  <span className="text-[8px] text-muted-foreground">{h.iteration}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}

function MetricBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-md bg-card/40 p-1.5 text-center">
      <div className={cn('text-base font-semibold', color)}>{value}%</div>
      <div className="text-[8px] text-muted-foreground">{label}</div>
    </div>
  );
}

function ConfusionBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-md bg-card/40 p-1.5 text-center">
      <div className={cn('text-sm font-semibold', color)}>{value}</div>
      <div className="text-[8px] text-muted-foreground">{label}</div>
    </div>
  );
}



export function StatsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (!cancelled && data.ok) setStats(data.stats);
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
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังโหลดสถิติ...
      </div>
    );
  }

  if (!stats || stats.totalAnalyses === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
        <Inbox className="mb-2 h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">ยังไม่มีข้อมูลสถิติ</p>
        <p className="mt-1 text-xs">ทำการวิเคราะห์ข้อความเพื่อเริ่มสะสมสถิติ</p>
      </div>
    );
  }

  const maxDayCount = Math.max(...stats.recentByDay.map((d) => d.count), 1);
  const maxFallacyCount = stats.topFallacies[0]?.count ?? 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">สถิติการวิเคราะห์</h3>
      </div>

      {/* Overview stats */}
      <Card className="p-3">
        <div className="grid grid-cols-2 gap-2">
          <StatBox icon={Activity} label="การวิเคราะห์ทั้งหมด" value={stats.totalAnalyses} color="text-primary" />
          <StatBox icon={AlertTriangle} label="ตรรกะวิบัติที่พบ" value={stats.totalFallacies} color="text-rose-400" />
          <StatBox icon={Layers} label="ประโยคที่วิเคราะห์" value={stats.totalSentences} color="text-cyan-400" />
          <StatBox icon={Clock} label="7 วันล่าสุด" value={stats.recentCount} color="text-amber-400" />
        </div>
      </Card>

      {/* Avg confidence */}
      <Card className="p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="h-3 w-3" /> ความมั่นใจเฉลี่ย
          </span>
          <span className="text-sm font-semibold text-primary">
            {Math.round(stats.avgConfidence * 100)}%
          </span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-card/40">
          <div className="bg-primary/70" style={{ width: `${stats.avgConfidence * 100}%` }} />
        </div>
        <div className="mt-2 text-[10px] text-muted-foreground">
          พบเฉลี่ย {stats.avgFallaciesPerAnalysis} ตรรกะวิบัติต่อการวิเคราะห์
        </div>
      </Card>

      {/* 7-day activity chart */}
      <Card className="p-3">
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          กิจกรรม 7 วันล่าสุด
        </h4>
        <div className="flex h-20 items-end justify-between gap-1">
          {stats.recentByDay.map((d) => {
            const height = d.count > 0 ? (d.count / maxDayCount) * 100 : 4;
            const dayLabel = new Date(d.date).toLocaleDateString('th-TH', { weekday: 'short' });
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={cn(
                      'w-full rounded-t transition-all',
                      d.count > 0 ? 'bg-primary/60 hover:bg-primary/80' : 'bg-white/5',
                    )}
                    style={{ height: `${height}%`, minHeight: '2px' }}
                    title={`${d.date}: ${d.count} ครั้ง`}
                  />
                </div>
                <span className="text-[8px] text-muted-foreground">{dayLabel}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Top fallacies with donut chart */}
      {stats.topFallacies.length > 0 && (
        <Card className="p-3">
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            สัดส่วนตรรกะวิบัติ
          </h4>
          <DonutChart
            data={stats.topFallacies.map((f, i) => ({
              label: f.nameTh,
              value: f.count,
              color: FALLACY_CHART_COLORS[ALL_FALLACY_TYPES.indexOf(f.type) % FALLACY_CHART_COLORS.length],
            }))}
            size={130}
            thickness={16}
            centerValue={String(stats.totalFallacies)}
            centerLabel="ทั้งหมด"
          />
          <h4 className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            อันดับความถี่
          </h4>
          <div className="space-y-1.5">
            {stats.topFallacies.slice(0, 8).map((f, i) => {
              const colorClass = FALLACY_COLORS[f.type] ?? 'bg-white/5 text-foreground border-white/10';
              const pct = (f.count / maxFallacyCount) * 100;
              return (
                <div key={f.type} className="flex items-center gap-2">
                  <span className="w-4 text-[10px] text-muted-foreground">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="mb-0.5 flex items-center justify-between gap-1">
                      <span className="truncate text-[11px] font-medium text-foreground">{f.nameTh}</span>
                      <span className="text-[10px] text-muted-foreground">{f.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-card/40">
                      <div
                        className={cn('h-full rounded-full', colorClass.split(' ')[0].replace('/20', '/60'))}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Distribution */}
      <Card className="p-3">
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          การกระจายตามจำนวนตรรกะวิบัติ
        </h4>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: '0', value: stats.fallaciesPerAnalysis['0'], color: 'text-emerald-400' },
            { label: '1', value: stats.fallaciesPerAnalysis['1'], color: 'text-amber-400' },
            { label: '2', value: stats.fallaciesPerAnalysis['2'], color: 'text-orange-400' },
            { label: '3+', value: stats.fallaciesPerAnalysis['3+'], color: 'text-rose-400' },
          ].map((b) => (
            <div key={b.label} className="rounded-md bg-card/40 p-2 text-center">
              <div className={cn('text-lg font-semibold', b.color)}>{b.value}</div>
              <div className="text-[9px] text-muted-foreground">{b.label} วิบัติ</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Confidence distribution donut */}
      {stats.totalFallacies > 0 && (
        <Card className="p-3">
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            การกระจายระดับความมั่นใจ
          </h4>
          <DonutChart
            data={[
              { label: 'ต่ำ (<35%)', value: stats.confidenceBuckets.low, color: '#fb7185' },
              { label: 'ปานกลาง (35-55%)', value: stats.confidenceBuckets.medium, color: '#fbbf24' },
              { label: 'สูง (55-75%)', value: stats.confidenceBuckets.high, color: '#a3e635' },
              { label: 'สูงมาก (≥75%)', value: stats.confidenceBuckets.veryHigh, color: '#34d399' },
            ]}
            size={130}
            thickness={16}
            centerValue={String(stats.totalFallacies)}
            centerLabel="ตรวจพบ"
          />
        </Card>
      )}

      {/* Self-Improvement Loop results */}
      <SelfImprovementStats />

      {/* Analysis timeline */}
      <AnalysisTimeline />

      {/* Analysis insights */}
      <AnalysisInsights />

      <Separator className="bg-white/5" />
      <p className="text-center text-[9px] text-muted-foreground">
        นับจาก {stats.totalAnalyses} การวิเคราะห์ล่าสุด
      </p>
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/40 p-2.5">
      <Icon className={cn('mb-1 h-3.5 w-3.5', color)} />
      <div className={cn('text-xl font-semibold', color)}>{value.toLocaleString()}</div>
      <div className="text-[9px] text-muted-foreground">{label}</div>
    </div>
  );
}
