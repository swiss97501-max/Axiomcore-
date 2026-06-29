'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Network, TrendingUp } from 'lucide-react';
import type { FallacyType } from '@/lib/engine/types';
import { FALLACY_META, ALL_FALLACY_TYPES } from '@/lib/engine/types';
import { cn } from '@/lib/core';

interface RelationshipData {
  nodes: { id: FallacyType; nameTh: string; nameEn: string; count: number }[];
  edges: { source: string; target: string; weight: number }[];
  topCombos: { source: string; sourceName: string; target: string; targetName: string; weight: number }[];
  totalMixed: number;
}

const FALLACY_SHORT_COLORS: Record<string, string> = {
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

export function FallacyRelationshipMap() {
  const [data, setData] = useState<RelationshipData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/knowledge/relationships');
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

  if (!data || data.totalMixed === 0) {
    return (
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <Network className="h-3.5 w-3.5 text-primary" />
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            แผนที่ความสัมพันธ์ตรรกะวิบัติ
          </h4>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          ยังไม่มีตัวอย่างผสม — สร้างข้อมูลเพิ่มจากแผงข้อมูลระบบ
        </p>
      </Card>
    );
  }

  // สร้าง adjacency matrix สำหรับ heatmap
  const activeTypes = data.nodes.map((n) => n.id);
  const getWeight = (a: string, b: string): number => {
    if (a === b) return 0;
    const edge = data.edges.find(
      (e) =>
        (e.source === a && e.target === b) || (e.source === b && e.target === a),
    );
    return edge?.weight ?? 0;
  };
  const maxWeight = Math.max(...data.edges.map((e) => e.weight), 1);

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center gap-2">
        <Network className="h-3.5 w-3.5 text-primary" />
        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          แผนที่ความสัมพันธ์ตรรกะวิบัติ
        </h4>
        <Badge variant="outline" className="ml-auto border-primary/30 bg-primary/10 text-[9px] text-primary">
          {data.totalMixed} คู่ผสม
        </Badge>
      </div>

      {/* Top combinations list */}
      <div className="mb-3">
        <h5 className="mb-1.5 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="h-2.5 w-2.5" /> คู่ที่พบบ่อย
        </h5>
        <div className="space-y-1">
          {data.topCombos.slice(0, 6).map((combo, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-md bg-card/40 px-1.5 py-1">
              <span className="shrink-0 text-[9px] text-muted-foreground">#{i + 1}</span>
              <span className={cn('truncate text-[10px] font-medium', FALLACY_SHORT_COLORS[combo.source] ?? 'text-foreground')}>
                {combo.sourceName}
              </span>
              <span className="shrink-0 text-muted-foreground/60">+</span>
              <span className={cn('truncate text-[10px] font-medium', FALLACY_SHORT_COLORS[combo.target] ?? 'text-foreground')}>
                {combo.targetName}
              </span>
              <Badge variant="secondary" className="ml-auto shrink-0 bg-primary/10 text-[8px] text-primary">
                ×{combo.weight}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap grid */}
      {activeTypes.length > 1 && activeTypes.length <= 8 && (
        <div>
          <h5 className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            Heatmap การร่วมเกิด
          </h5>
          <div className="overflow-x-auto scrollbar-thin">
            <div className="inline-block">
              {/* Header row */}
              <div className="flex">
                <div className="w-12 shrink-0" />
                {activeTypes.map((t) => (
                  <div
                    key={t}
                    className="w-6 shrink-0 text-center text-[7px] text-muted-foreground/70"
                    title={FALLACY_META[t].nameTh}
                  >
                    {FALLACY_META[t].nameEn.slice(0, 2)}
                  </div>
                ))}
              </div>
              {/* Rows */}
              {activeTypes.map((rowType) => (
                <div key={rowType} className="flex items-center">
                  <div
                    className="w-12 shrink-0 truncate text-[7px] text-muted-foreground/70"
                    title={FALLACY_META[rowType].nameTh}
                  >
                    {FALLACY_META[rowType].nameEn.slice(0, 4)}
                  </div>
                  {activeTypes.map((colType) => {
                    const w = getWeight(rowType, colType);
                    const intensity = w > 0 ? Math.max(0.15, w / maxWeight) : 0;
                    return (
                      <div
                        key={colType}
                        className="m-0.5 h-5 w-5 shrink-0 rounded-sm"
                        style={{
                          background: w > 0
                            ? `oklch(0.72 0.16 155 / ${intensity})`
                            : 'color-mix(in oklch, var(--muted) 30%, transparent)',
                        }}
                        title={w > 0 ? `${FALLACY_META[rowType].nameTh} + ${FALLACY_META[colType].nameTh}: ${w} ครั้ง` : ''}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
