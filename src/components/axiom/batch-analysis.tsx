'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Loader2,
  Layers,
  Plus,
  X,
  Play,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import type { AnalysisResult, FallacyType } from '@/lib/engine/types';
import { FALLACY_META } from '@/lib/engine/types';
import { cn } from '@/lib/core';
import { toast } from 'sonner';

interface BatchItem {
  id: string;
  text: string;
  result?: AnalysisResult;
  loading?: boolean;
  error?: string;
}

interface BatchComparison {
  total: number;
  withFallacies: number;
  clean: number;
  errors: number;
  typeFrequency: Record<string, number>;
  avgConfidence: number;
}

const FALLACY_COLORS: Record<string, string> = {
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

export function BatchAnalysis() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BatchItem[]>([
    { id: '1', text: '' },
    { id: '2', text: '' },
  ]);
  const [analyzing, setAnalyzing] = useState(false);
  const [comparison, setComparison] = useState<BatchComparison | null>(null);

  const addItem = () => {
    if (items.length >= 20) {
      toast.warning('สูงสุด 20 ข้อความต่อครั้ง');
      return;
    }
    setItems((prev) => [...prev, { id: `${Date.now()}`, text: '' }]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));
  };

  const updateItem = (id: string, text: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
  };

  const runBatch = async () => {
    const valid = items.filter((i) => i.text.trim());
    if (valid.length === 0) {
      toast.warning('กรุณาใส่ข้อความอย่างน้อย 1 ข้อความ');
      return;
    }
    setAnalyzing(true);
    setItems((prev) => prev.map((i) => ({ ...i, result: undefined, error: undefined, loading: !!i.text.trim() })));

    try {
      const res = await fetch('/api/analyze/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: valid.map((i) => i.text) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'วิเคราะห์ไม่สำเร็จ');
      }
      // map results back to items
      setItems((prev) =>
        prev.map((i) => {
          if (!i.text.trim()) return i;
          const found = data.results.find((r: { text: string }) => r.text === i.text);
          if (!found) return { ...i, loading: false };
          if (found.error) return { ...i, loading: false, error: found.error };
          return { ...i, loading: false, result: found.result };
        }),
      );
      setComparison(data.comparison);
      toast.success(`วิเคราะห์ ${data.comparison.total} ข้อความเสร็จ`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด';
      toast.error(msg);
      setItems((prev) => prev.map((i) => ({ ...i, loading: false })));
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setItems([{ id: '1', text: '' }, { id: '2', text: '' }]);
    setComparison(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="วิเคราะห์แบบชุด">
          <Layers className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-4xl flex-col gap-3 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-primary" />
            วิเคราะห์แบบชุดและเปรียบเทียบ
          </DialogTitle>
          <DialogDescription className="text-xs">
            วิเคราะห์หลายข้อความพร้อมกันเพื่อเปรียบเทียบตรรกะวิบัติที่พบ (สูงสุด 20 ข้อความ)
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={addItem} disabled={analyzing || items.length >= 20} className="h-7 gap-1 text-xs">
            <Plus className="h-3 w-3" /> เพิ่มข้อความ
          </Button>
          <Button
            size="sm"
            onClick={runBatch}
            disabled={analyzing || items.every((i) => !i.text.trim())}
            className="h-7 gap-1 text-xs"
          >
            {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            วิเคราะห์ทั้งหมด
          </Button>
          {(comparison || items.some((i) => i.text)) && (
            <Button size="sm" variant="ghost" onClick={reset} disabled={analyzing} className="h-7 text-xs">
              รีเซ็ต
            </Button>
          )}
          <Badge variant="outline" className="ml-auto border-white/10 bg-white/5 text-[10px]">
            {items.length}/20
          </Badge>
        </div>

        {/* Comparison summary */}
        {comparison && (
          <Card className="border-primary/20 bg-primary/5 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              สรุปการเปรียบเทียบ
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-md bg-card/40 p-2 text-center">
                <div className="text-lg font-semibold text-foreground">{comparison.total}</div>
                <div className="text-[9px] text-muted-foreground">ทั้งหมด</div>
              </div>
              <div className="rounded-md bg-rose-500/10 p-2 text-center">
                <div className="text-lg font-semibold text-rose-400">{comparison.withFallacies}</div>
                <div className="text-[9px] text-muted-foreground">พบวิบัติ</div>
              </div>
              <div className="rounded-md bg-emerald-500/10 p-2 text-center">
                <div className="text-lg font-semibold text-emerald-400">{comparison.clean}</div>
                <div className="text-[9px] text-muted-foreground">ปกติ</div>
              </div>
              <div className="rounded-md bg-amber-500/10 p-2 text-center">
                <div className="text-lg font-semibold text-amber-400">{Math.round(comparison.avgConfidence * 100)}%</div>
                <div className="text-[9px] text-muted-foreground">มั่นใจเฉลี่ย</div>
              </div>
            </div>
            {Object.keys(comparison.typeFrequency).length > 0 && (
              <div className="mt-2">
                <div className="mb-1 text-[9px] uppercase tracking-wide text-muted-foreground">ตรรกะวิบัติที่พบ:</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(comparison.typeFrequency)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => (
                      <Badge
                        key={type}
                        variant="secondary"
                        className={cn('bg-white/5 text-[9px]', FALLACY_COLORS[type] ?? 'text-primary')}
                      >
                        {FALLACY_META[type as FallacyType]?.nameTh ?? type} × {count}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Items list */}
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-2">
            {items.map((item, idx) => (
              <BatchItemView
                key={item.id}
                index={idx}
                item={item}
                onUpdate={(text) => updateItem(item.id, text)}
                onRemove={() => removeItem(item.id)}
                canRemove={items.length > 1}
                analyzing={analyzing}
              />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function BatchItemView({
  index,
  item,
  onUpdate,
  onRemove,
  canRemove,
  analyzing,
}: {
  index: number;
  item: BatchItem;
  onUpdate: (text: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  analyzing: boolean;
}) {
  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-medium text-primary">
            {index + 1}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">ข้อความที่ {index + 1}</span>
          {item.result && (
            <Badge
              variant="outline"
              className={cn(
                'text-[9px]',
                item.result.detectedFallacies.length > 0
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
              )}
            >
              {item.result.detectedFallacies.length > 0
                ? `${item.result.detectedFallacies.length} วิบัติ`
                : 'ปกติ'}
            </Badge>
          )}
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            disabled={analyzing}
            aria-label="ลบข้อความ"
            className="rounded-md p-1 text-muted-foreground/50 transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <Textarea
        value={item.text}
        onChange={(e) => onUpdate(e.target.value)}
        placeholder="วางข้อความที่ต้องการวิเคราะห์..."
        disabled={analyzing}
        className="min-h-[60px] resize-none border-border/60 bg-card/40 text-xs scrollbar-thin"
        rows={2}
      />
      {item.loading && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          กำลังวิเคราะห์...
        </div>
      )}
      {item.error && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-destructive">
          <XCircle className="h-3 w-3" />
          {item.error}
        </div>
      )}
      {item.result && (
        <div className="mt-2 space-y-1.5">
          {/* Detected fallacies summary */}
          {item.result.detectedFallacies.length > 0 ? (
            <div className="space-y-1">
              {item.result.detectedFallacies.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-md bg-card/40 px-2 py-1 text-[10px]"
                >
                  <AlertTriangle className={cn('h-2.5 w-2.5', FALLACY_COLORS[f.type])} />
                  <span className={cn('font-medium', FALLACY_COLORS[f.type])}>{f.nameTh}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">มั่นใจ {Math.round(f.confidence * 100)}%</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">FP {Math.round(f.falsePositiveRisk * 100)}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/5 px-2 py-1 text-[10px] text-emerald-400">
              <CheckCircle2 className="h-2.5 w-2.5" />
              ไม่พบตรรกะวิบัติ
            </div>
          )}
          <p className="line-clamp-2 px-1 text-[10px] text-muted-foreground">{item.result.summary}</p>
        </div>
      )}
    </Card>
  );
}
