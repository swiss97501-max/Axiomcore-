'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeftRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileText,
  ChevronRight,
  Download,
  Copy,
  FileJson,
  ChevronDown,
  Check,
} from 'lucide-react';
import type { AnalysisResult, FallacyType } from '@/lib/engine/types';
import { FALLACY_META } from '@/lib/engine/types';
import { cn } from '@/lib/core';
import { toast } from 'sonner';

interface SessionResult {
  userText: string;
  result: AnalysisResult;
  createdAt: string;
}

interface ComparisonData {
  a: { id: string; title: string; createdAt: string; results: SessionResult[] };
  b: { id: string; title: string; createdAt: string; results: SessionResult[] };
}

interface CompareViewProps {
  sessionIdA: string | null;
  sessionIdB: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FALLACY_COLORS: Record<string, string> = {
  ad_hominem: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  straw_man: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  red_herring: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  false_dilemma: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  hasty_generalization: 'text-lime-400 bg-lime-500/10 border-lime-500/30',
  false_cause: 'text-green-400 bg-green-500/10 border-green-500/30',
  appeal_to_authority: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  appeal_to_popularity: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
  slippery_slope: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  circular_reasoning: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  cherry_picking: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  burden_of_proof: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
};

export function CompareView({ sessionIdA, sessionIdB, open, onOpenChange }: CompareViewProps) {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !sessionIdA || !sessionIdB) return;
    let cancelled = false;
    setLoading(true);
    setData(null);
    (async () => {
      try {
        const res = await fetch(`/api/compare?a=${encodeURIComponent(sessionIdA)}&b=${encodeURIComponent(sessionIdB)}`);
        const d = await res.json();
        if (!cancelled && d.ok) {
          setData(d.comparison);
        } else if (!cancelled) {
          toast.error(d.error || 'เปรียบเทียบไม่สำเร็จ');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, sessionIdA, sessionIdB]);

  const exportJson = useCallback(() => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axiomcore-comparison-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('ดาวน์โหลด JSON แล้ว');
  }, [data]);

  const exportTxt = useCallback(() => {
    if (!data) return;
    const lines: string[] = [
      'AxiomCore - รายงานการเปรียบเทียบการวิเคราะห์',
      'สร้างเมื่อ: ' + new Date().toLocaleString('th-TH'),
      '',
      '=== Session A ===',
      `ชื่อ: ${data.a.title}`,
      `จำนวนการวิเคราะห์: ${data.a.results.length}`,
      `ตรรกะวิบัติทั้งหมด: ${data.a.results.reduce((s, r) => s + r.result.detectedFallacies.length, 0)}`,
      '',
      '=== Session B ===',
      `ชื่อ: ${data.b.title}`,
      `จำนวนการวิเคราะห์: ${data.b.results.length}`,
      `ตรรกะวิบัติทั้งหมด: ${data.b.results.reduce((s, r) => s + r.result.detectedFallacies.length, 0)}`,
      '',
      '=== ผลการวิเคราะห์เปรียบเทียบ ===',
    ];
    const maxLen = Math.max(data.a.results.length, data.b.results.length);
    for (let i = 0; i < maxLen; i++) {
      const ra = data.a.results[i];
      const rb = data.b.results[i];
      lines.push(`\n--- คู่ที่ ${i + 1} ---`);
      lines.push('\n[A]');
      if (ra) {
        lines.push(`  ข้อความ: ${ra.userText}`);
        lines.push(`  ตรวจพบ: ${ra.result.detectedFallacies.length} ตรรกะวิบัติ`);
        ra.result.detectedFallacies.forEach((f) => {
          lines.push(`    - ${f.nameTh} (${f.nameEn}): ${Math.round(f.confidence * 100)}%`);
        });
      } else {
        lines.push('  (ไม่มีข้อมูล)');
      }
      lines.push('\n[B]');
      if (rb) {
        lines.push(`  ข้อความ: ${rb.userText}`);
        lines.push(`  ตรวจพบ: ${rb.result.detectedFallacies.length} ตรรกะวิบัติ`);
        rb.result.detectedFallacies.forEach((f) => {
          lines.push(`    - ${f.nameTh} (${f.nameEn}): ${Math.round(f.confidence * 100)}%`);
        });
      } else {
        lines.push('  (ไม่มีข้อมูล)');
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axiomcore-comparison-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('ดาวน์โหลดรายงานแล้ว');
  }, [data]);

  const copySummary = useCallback(async () => {
    if (!data) return;
    const aFall = data.a.results.reduce((s, r) => s + r.result.detectedFallacies.length, 0);
    const bFall = data.b.results.reduce((s, r) => s + r.result.detectedFallacies.length, 0);
    const aConf = data.a.results.length > 0 ? data.a.results.reduce((s, r) => s + r.result.overallConfidence, 0) / data.a.results.length : 0;
    const bConf = data.b.results.length > 0 ? data.b.results.reduce((s, r) => s + r.result.overallConfidence, 0) / data.b.results.length : 0;
    const text = [
      '=== AxiomCore - สรุปการเปรียบเทียบ ===',
      '',
      `Session A: ${data.a.title}`,
      `  การวิเคราะห์: ${data.a.results.length}, ตรรกะวิบัติ: ${aFall}, มั่นใจเฉลี่ย: ${Math.round(aConf * 100)}%`,
      '',
      `Session B: ${data.b.title}`,
      `  การวิเคราะห์: ${data.b.results.length}, ตรรกะวิบัติ: ${bFall}, มั่นใจเฉลี่ย: ${Math.round(bConf * 100)}%`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('คัดลอกสรุปไปยังคลิปบอร์ดแล้ว');
    } catch {
      toast.error('คัดลอกไม่สำเร็จ');
    }
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-5xl flex-col gap-3 p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base">
                <ArrowLeftRight className="h-4 w-4 text-primary" />
                เปรียบเทียบการวิเคราะห์
              </DialogTitle>
              <DialogDescription className="text-xs">
                เปรียบเทียบผลการวิเคราะห์ตรรกะวิบัติระหว่าง 2 session แบบ side-by-side
              </DialogDescription>
            </div>
            {data && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                    <Download className="h-3 w-3" />
                    <span className="hidden sm:inline">ส่งออก</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={copySummary} className="gap-2 text-xs">
                    <Copy className="h-3.5 w-3.5" /> คัดลอกสรุป
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportJson} className="gap-2 text-xs">
                    <FileJson className="h-3.5 w-3.5" /> ดาวน์โหลด JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportTxt} className="gap-2 text-xs">
                    <FileText className="h-3.5 w-3.5" /> ดาวน์โหลด TXT
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
            กำลังโหลดข้อมูลเปรียบเทียบ...
          </div>
        ) : data ? (
          <ComparisonContent data={data} />
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            ไม่สามารถโหลดข้อมูลได้
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ComparisonContent({ data }: { data: ComparisonData }) {
  const a = data.a;
  const b = data.b;
  const aAll = a.results;
  const bAll = b.results;
  const maxLen = Math.max(aAll.length, bAll.length);
  const [activePair, setActivePair] = useState(0);
  const pairRefs = useRef<(HTMLDivElement | null)[]>([]);

  // สรุปการเปรียบเทียบ
  const aFallacyCount = aAll.reduce((s, r) => s + r.result.detectedFallacies.length, 0);
  const bFallacyCount = bAll.reduce((s, r) => s + r.result.detectedFallacies.length, 0);
  const aAvgConf = aAll.length > 0 ? aAll.reduce((s, r) => s + r.result.overallConfidence, 0) / aAll.length : 0;
  const bAvgConf = bAll.length > 0 ? bAll.reduce((s, r) => s + r.result.overallConfidence, 0) / bAll.length : 0;

  // Keyboard navigation: ArrowUp/ArrowDown สลับคู่
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActivePair((prev) => Math.min(maxLen - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActivePair((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [maxLen]);

  // Scroll active pair into view
  useEffect(() => {
    const ref = pairRefs.current[activePair];
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activePair]);

  return (
    <ScrollArea className="flex-1 pr-2">
      <div className="space-y-4">
        {/* Summary comparison */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-primary/20 bg-primary/5 p-3">
            <div className="mb-1 truncate text-xs font-semibold text-foreground">{a.title}</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-card/40 p-1.5 text-center">
                <div className="text-sm font-semibold text-primary">{aAll.length}</div>
                <div className="text-[8px] text-muted-foreground">การวิเคราะห์</div>
              </div>
              <div className="rounded-md bg-card/40 p-1.5 text-center">
                <div className="text-sm font-semibold text-rose-400">{aFallacyCount}</div>
                <div className="text-[8px] text-muted-foreground">ตรรกะวิบัติ</div>
              </div>
            </div>
            <div className="mt-1.5 text-center text-[9px] text-muted-foreground">
              มั่นใจเฉลี่ย {Math.round(aAvgConf * 100)}%
            </div>
          </Card>
          <Card className="border-violet-500/20 bg-violet-500/5 p-3">
            <div className="mb-1 truncate text-xs font-semibold text-foreground">{b.title}</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-card/40 p-1.5 text-center">
                <div className="text-sm font-semibold text-violet-400">{bAll.length}</div>
                <div className="text-[8px] text-muted-foreground">การวิเคราะห์</div>
              </div>
              <div className="rounded-md bg-card/40 p-1.5 text-center">
                <div className="text-sm font-semibold text-rose-400">{bFallacyCount}</div>
                <div className="text-[8px] text-muted-foreground">ตรรกะวิบัติ</div>
              </div>
            </div>
            <div className="mt-1.5 text-center text-[9px] text-muted-foreground">
              มั่นใจเฉลี่ย {Math.round(bAvgConf * 100)}%
            </div>
          </Card>
        </div>

        {/* Keyboard hint */}
        {maxLen > 1 && (
          <div className="flex items-center justify-center gap-2 rounded-md bg-card/30 px-2 py-1 text-[9px] text-muted-foreground">
            <span>ใช้</span>
            <kbd className="rounded border border-border/60 bg-card/60 px-1 py-0.5 font-mono text-[8px]">↑</kbd>
            <kbd className="rounded border border-border/60 bg-card/60 px-1 py-0.5 font-mono text-[8px]">↓</kbd>
            <span>เพื่อนำทางระหว่างคู่</span>
            <span className="text-muted-foreground/60">·</span>
            <span>คู่ที่ {activePair + 1}/{maxLen}</span>
          </div>
        )}

        {/* Per-analysis comparison */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold">
            <FileText className="h-3.5 w-3.5 text-primary" />
            ผลการวิเคราะห์ตามลำดับ ({maxLen} คู่)
          </h3>
          {[...Array(maxLen)].map((_, i) => {
            const ra = aAll[i];
            const rb = bAll[i];
            const isActive = i === activePair;
            return (
              <div
                key={i}
                ref={(el) => { pairRefs.current[i] = el; }}
                className={cn(
                  'grid grid-cols-2 gap-2 rounded-lg p-1 transition-all',
                  isActive ? 'bg-primary/5 ring-1 ring-primary/30' : 'hover:bg-card/20',
                )}
                onClick={() => setActivePair(i)}
              >
                <AnalysisSide result={ra} side="a" index={i} active={isActive} />
                <AnalysisSide result={rb} side="b" index={i} active={isActive} />
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}

function AnalysisSide({ result, side, index, active }: { result?: SessionResult; side: 'a' | 'b'; index: number; active?: boolean }) {
  const sideColor = side === 'a' ? 'border-primary/30' : 'border-violet-500/30';
  if (!result) {
    return (
      <Card className={cn('border p-3 opacity-40', sideColor)}>
        <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
          ไม่มีการวิเคราะห์ที่ {index + 1}
        </div>
      </Card>
    );
  }
  const fallacies = result.result.detectedFallacies;
  return (
    <Card className={cn('border p-3 transition-all', sideColor, active && 'shadow-md')}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[9px] font-medium text-primary">
          {index + 1}
        </span>
        <span className="text-[9px] text-muted-foreground">
          {side === 'a' ? 'A' : 'B'}
        </span>
        {fallacies.length > 0 ? (
          <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-[9px] text-rose-400">
            <AlertTriangle className="mr-0.5 h-2 w-2" />
            {fallacies.length} วิบัติ
          </Badge>
        ) : (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[9px] text-emerald-400">
            <CheckCircle2 className="mr-0.5 h-2 w-2" />
            ปกติ
          </Badge>
        )}
      </div>
      <p className="mb-2 line-clamp-2 text-[10px] text-muted-foreground">{result.userText}</p>
      {fallacies.length > 0 ? (
        <div className="space-y-1">
          {fallacies.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-md bg-card/40 px-1.5 py-1">
              <AlertTriangle className={cn('h-2 w-2', FALLACY_COLORS[f.type]?.split(' ')[0])} />
              <span className={cn('text-[9px] font-medium', FALLACY_COLORS[f.type]?.split(' ')[0])}>
                {f.nameTh}
              </span>
              <span className="text-[8px] text-muted-foreground">·</span>
              <span className="text-[8px] text-muted-foreground">{Math.round(f.confidence * 100)}%</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[9px] text-emerald-400/70">ไม่พบตรรกะวิบัติ</p>
      )}
      <div className="mt-1.5 flex items-center gap-1 text-[8px] text-muted-foreground">
        <TrendingUp className="h-2 w-2" />
        มั่นใจรวม {Math.round(result.result.overallConfidence * 100)}%
      </div>
    </Card>
  );
}

export { FALLACY_META as _FALLACY_META };
