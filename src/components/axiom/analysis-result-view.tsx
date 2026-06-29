'use client';

import { useState } from 'react';
import type { AnalysisResult, DetectedFallacy } from '@/lib/engine/types';
import { FALLACY_META } from '@/lib/engine/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  ShieldAlert,
  Target,
  Quote,
  MessageSquareReply,
  ListOrdered,
  Sparkles,
  CheckCircle2,
  XCircle,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/core';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Copy, Download, Check, FileJson, FileText, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const FALLACY_COLORS: Record<string, string> = {
  ad_hominem: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  straw_man: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  red_herring: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  false_dilemma: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  hasty_generalization: 'text-lime-400 border-lime-500/30 bg-lime-500/10',
  false_cause: 'text-green-400 border-green-500/30 bg-green-500/10',
  appeal_to_authority: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  appeal_to_popularity: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
  slippery_slope: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  circular_reasoning: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
  cherry_picking: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
  burden_of_proof: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
};

function confidenceColor(confidence: number): string {
  if (confidence >= 0.75) return 'text-emerald-400';
  if (confidence >= 0.55) return 'text-lime-400';
  if (confidence >= 0.35) return 'text-amber-400';
  return 'text-rose-400';
}

function riskColor(risk: number): string {
  if (risk >= 0.6) return 'text-rose-400';
  if (risk >= 0.35) return 'text-amber-400';
  return 'text-emerald-400';
}

function FallacyCard({ fallacy }: { fallacy: DetectedFallacy }) {
  const colorClass = FALLACY_COLORS[fallacy.type] ?? 'text-primary border-primary/30 bg-primary/10';
  return (
    <Card className={cn('border p-4 sm:p-5 animate-fade-in-up', colorClass)}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-white/5 p-2">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-base font-semibold leading-tight">{fallacy.nameTh}</h4>
            <p className="text-xs text-muted-foreground">{fallacy.nameEn}</p>
            <Badge variant="outline" className="mt-1 border-white/10 bg-white/5 text-[10px]">
              มั่นใจ {fallacy.confidenceLabel}
            </Badge>
          </div>
        </div>
        {/* Circular gauges */}
        <div className="flex items-center gap-3">
          <ConfidenceGauge value={fallacy.confidence} size={56} label="มั่นใจ" variant="confidence" />
          <ConfidenceGauge value={fallacy.falsePositiveRisk} size={56} label="FP Risk" variant="risk" />
        </div>
      </div>

      {/* Confidence + False Positive bars (compact) */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">ระดับความมั่นใจ</span>
            <span className={cn('font-medium', confidenceColor(fallacy.confidence))}>
              {Math.round(fallacy.confidence * 100)}%
            </span>
          </div>
          <Progress value={fallacy.confidence * 100} className="h-1.5" />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <ShieldAlert className="h-3 w-3" /> ความเสี่ยง False Positive
            </span>
            <span className={cn('font-medium', riskColor(fallacy.falsePositiveRisk))}>
              {Math.round(fallacy.falsePositiveRisk * 100)}%
            </span>
          </div>
          <Progress value={fallacy.falsePositiveRisk * 100} className="h-1.5" />
        </div>
      </div>

      {/* Explanation */}
      <div className="mt-4 rounded-lg bg-black/20 p-3 text-sm leading-relaxed">
        {fallacy.explanation}
      </div>

      {/* False positive reason */}
      <p className="mt-2 text-xs text-muted-foreground">
        <ShieldAlert className="mr-1 inline h-3 w-3" />
        {fallacy.falsePositiveReason}
      </p>

      <Separator className="my-4 bg-white/5" />

      {/* Reasoning steps */}
      <div>
        <h5 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <ListOrdered className="h-3.5 w-3.5" /> เหตุผลทีละขั้น
        </h5>
        <ol className="space-y-1.5">
          {fallacy.reasoning.map((step, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium">
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <Separator className="my-4 bg-white/5" />

      {/* Problematic & Supporting sentences */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <h5 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-400">
            <XCircle className="h-3.5 w-3.5" /> ประโยคที่เป็นปัญหา
          </h5>
          {fallacy.problematicSentences.length > 0 ? (
            <ul className="space-y-1.5">
              {fallacy.problematicSentences.map((s, i) => (
                <li key={i} className="flex gap-2 rounded-md bg-rose-500/10 p-2 text-xs leading-relaxed">
                  <Quote className="mt-0.5 h-3 w-3 shrink-0 text-rose-400" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">ไม่ระบุประโยคเฉพาะ</p>
          )}
        </div>
        <div>
          <h5 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> ประโยคที่สนับสนุนการตรวจพบ
          </h5>
          {fallacy.supportingSentences.length > 0 ? (
            <ul className="space-y-1.5">
              {fallacy.supportingSentences.map((s, i) => (
                <li key={i} className="flex gap-2 rounded-md bg-emerald-500/10 p-2 text-xs leading-relaxed">
                  <Quote className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">ไม่มีประโยคสนับสนุนแยกต่างหาก</p>
          )}
        </div>
      </div>

      {/* Counter arguments */}
      <div className="mt-4">
        <h5 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-400">
          <MessageSquareReply className="h-3.5 w-3.5" /> ข้อโต้แย้งที่เป็นไปได้
        </h5>
        <ul className="space-y-1.5">
          {fallacy.counterArguments.map((c, i) => (
            <li key={i} className="flex gap-2 rounded-md bg-cyan-500/5 p-2 text-xs leading-relaxed">
              <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-cyan-400" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Matched patterns */}
      {fallacy.matchedPatterns.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">กฎที่ตรง:</span>
          {fallacy.matchedPatterns.map((p) => (
            <Badge key={p} variant="secondary" className="bg-white/5 text-[10px] font-mono">
              {p}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

// ===== confidence-gauge.tsx =====
interface ConfidenceGaugeProps {
  value: number; // 0-1
  size?: number;
  label?: string;
  variant?: 'confidence' | 'risk';
}

export function ConfidenceGauge({
  value,
  size = 56,
  label,
  variant = 'confidence',
}: ConfidenceGaugeProps) {
  const pct = Math.round(value * 100);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value * circumference);

  const color =
    variant === 'confidence'
      ? value >= 0.75
        ? '#34d399' // emerald-400
        : value >= 0.55
          ? '#a3e635' // lime-400
          : value >= 0.35
            ? '#fbbf24' // amber-400
            : '#fb7185' // rose-400
      : value >= 0.6
        ? '#fb7185'
        : value >= 0.35
          ? '#fbbf24'
          : '#34d399';

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          className="text-white/8"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease-out, stroke 0.3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn('font-semibold leading-none')}
          style={{ color, fontSize: size * 0.22 }}
        >
          {pct}
        </span>
        <span className="text-[8px] text-muted-foreground" style={{ fontSize: size * 0.12 }}>
          %
        </span>
      </div>
      {label && (
        <span className="mt-1 text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
      )}
    </div>
  );
}


// ===== analysis-export.tsx =====

interface AnalysisExportProps {
  result: AnalysisResult;
  variant?: 'ghost' | 'outline';
  size?: 'sm' | 'default' | 'icon';
}

export function AnalysisExport({ result, variant = 'ghost', size = 'sm' }: AnalysisExportProps) {
  const [copied, setCopied] = useState(false);

  const copySummary = async () => {
    const lines: string[] = [
      '=== AxiomCore - สรุปผลการวิเคราะห์ตรรกะวิบัติ ===',
      '',
      `ข้อความต้นฉบับ: ${result.input}`,
      '',
      `สรุป: ${result.summary}`,
      `ความมั่นใจรวม: ${Math.round(result.overallConfidence * 100)}%`,
      `ตรรกะวิบัติที่พบ: ${result.detectedFallacies.length} ประเภท`,
      '',
      '--- ตรรกะวิบัติที่พบ ---',
    ];
    result.detectedFallacies.forEach((f, i) => {
      lines.push(
        `${i + 1}. ${f.nameTh} (${f.nameEn}) - ความมั่นใจ ${Math.round(f.confidence * 100)}% (False Positive Risk ${Math.round(f.falsePositiveRisk * 100)}%)`,
      );
      lines.push(`   คำอธิบาย: ${f.explanation}`);
      if (f.problematicSentences.length > 0) {
        lines.push(`   ประโยคที่เป็นปัญหา: ${f.problematicSentences.join(' | ')}`);
      }
      if (f.counterArguments.length > 0) {
        lines.push(`   ข้อโต้แย้ง: ${f.counterArguments.join(' | ')}`);
      }
      lines.push('');
    });

    lines.push('--- โครงสร้างการโต้แย้ง ---');
    if (result.argumentStructure.premises.length > 0) {
      lines.push('ข้อตั้ง:');
      result.argumentStructure.premises.forEach((p, i) => lines.push(`  ${i + 1}. ${p.text}`));
    }
    if (result.argumentStructure.conclusion) {
      lines.push(`ข้อสรุป: ${result.argumentStructure.conclusion.text}`);
    }
    if (result.argumentStructure.evidence.length > 0) {
      lines.push('หลักฐาน:');
      result.argumentStructure.evidence.forEach((e, i) => lines.push(`  ${i + 1}. [${e.type}] ${e.text}`));
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      toast.success('คัดลอกสรุปผลไปยังคลิปบอร์ดแล้ว');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('คัดลอกไม่สำเร็จ');
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axiomcore-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('ดาวน์โหลด JSON แล้ว');
  };

  const downloadText = () => {
    const lines: string[] = [
      'AxiomCore - รายงานการวิเคราะห์ตรรกะวิบัติ',
      'สร้างเมื่อ: ' + new Date().toLocaleString('th-TH'),
      '',
      '=== ข้อความต้นฉบับ ===',
      result.input,
      '',
      '=== สรุปผล ===',
      result.summary,
      `(ความมั่นใจรวม ${Math.round(result.overallConfidence * 100)}%)`,
      '',
      '=== ตรรกะวิบัติที่พบ ===',
    ];
    result.detectedFallacies.forEach((f, i) => {
      lines.push(`\n[${i + 1}] ${f.nameTh} (${f.nameEn})`);
      lines.push(`ความมั่นใจ: ${Math.round(f.confidence * 100)}% (${f.confidenceLabel})`);
      lines.push(`ความเสี่ยง False Positive: ${Math.round(f.falsePositiveRisk * 100)}%`);
      lines.push(`คำอธิบาย: ${f.explanation}`);
      lines.push(`เหตุผลความเสี่ยง FP: ${f.falsePositiveReason}`);
      lines.push('เหตุผลทีละขั้น:');
      f.reasoning.forEach((r, j) => lines.push(`  ${j + 1}. ${r}`));
      if (f.problematicSentences.length > 0) {
        lines.push('ประโยคที่เป็นปัญหา:');
        f.problematicSentences.forEach((p) => lines.push(`  - ${p}`));
      }
      if (f.supportingSentences.length > 0) {
        lines.push('ประโยคที่สนับสนุน:');
        f.supportingSentences.forEach((p) => lines.push(`  - ${p}`));
      }
      if (f.counterArguments.length > 0) {
        lines.push('ข้อโต้แย้งที่เป็นไปได้:');
        f.counterArguments.forEach((c) => lines.push(`  -> ${c}`));
      }
    });

    lines.push('', '=== โครงสร้างการโต้แย้ง ===');
    lines.push('ข้อตั้ง:');
    if (result.argumentStructure.premises.length === 0) lines.push('  (ไม่พบ)');
    result.argumentStructure.premises.forEach((p, i) => lines.push(`  ${i + 1}. ${p.text}`));
    lines.push('ข้อสรุป:');
    lines.push(result.argumentStructure.conclusion ? `  ${result.argumentStructure.conclusion.text}` : '  (ไม่พบ)');
    lines.push('หลักฐาน:');
    if (result.argumentStructure.evidence.length === 0) lines.push('  (ไม่พบ)');
    result.argumentStructure.evidence.forEach((e, i) => lines.push(`  ${i + 1}. [${e.type}] ${e.text}`));

    lines.push('', '=== กระบวนการวิเคราะห์ ===');
    result.stepByStep.forEach((s, i) => lines.push(`${i + 1}. ${s}`));

    lines.push('', '=== สถิติ ===');
    lines.push(`ประโยค: ${result.stats.sentenceCount}`);
    lines.push(`ข้อตั้ง: ${result.stats.premiseCount}`);
    lines.push(`ข้อสรุป: ${result.stats.conclusionCount}`);
    lines.push(`หลักฐาน: ${result.stats.evidenceCount}`);
    lines.push(`ใช้เวลา: ${result.stats.processingMs}ms`);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axiomcore-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('ดาวน์โหลดรายงานแล้ว');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="h-7 gap-1 text-xs">
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Download className="h-3 w-3" />}
          <span className="hidden sm:inline">ส่งออก</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={copySummary} className="gap-2 text-xs">
          <Copy className="h-3.5 w-3.5" /> คัดลอกสรุปผล
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={downloadJson} className="gap-2 text-xs">
          <FileJson className="h-3.5 w-3.5" /> ดาวน์โหลด JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadText} className="gap-2 text-xs">
          <FileText className="h-3.5 w-3.5" /> ดาวน์โหลดรายงาน TXT
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


export function AnalysisResultView({ result }: { result: AnalysisResult }) {
  const structure = result.argumentStructure;
  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/8 via-primary/5 to-transparent p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-primary/15 p-2">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">สรุปผลการวิเคราะห์</h3>
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px]">
                มั่นใจรวม {Math.round(result.overallConfidence * 100)}%
              </Badge>
              <Badge variant="outline" className="border-white/10 bg-white/5 text-[10px]">
                พบ {result.detectedFallacies.length} ตรรกะวิบัติ
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                ใช้เวลา {result.stats.processingMs}ms
              </span>
              <div className="ml-auto">
                <AnalysisExport result={result} />
              </div>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">{result.summary}</p>
          </div>
          {result.detectedFallacies.length > 0 && (
            <div className="hidden shrink-0 sm:block">
              <ConfidenceGauge value={result.overallConfidence} size={64} label="มั่นใจรวม" variant="confidence" />
            </div>
          )}
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'ประโยค', value: result.stats.sentenceCount, icon: Layers },
          { label: 'ข้อตั้ง', value: result.stats.premiseCount, icon: ListOrdered },
          { label: 'ข้อสรุป', value: result.stats.conclusionCount, icon: Target },
          { label: 'หลักฐาน', value: result.stats.evidenceCount, icon: Quote },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-white/5 bg-card/50 p-3 text-center">
            <s.icon className="mx-auto mb-1 h-3.5 w-3.5 text-muted-foreground" />
            <div className="text-lg font-semibold">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Detected fallacies */}
      {result.detectedFallacies.length > 0 ? (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            ตรรกะวิบัติที่พบ ({result.detectedFallacies.length})
          </h3>
          {result.detectedFallacies.map((f, i) => (
            <FallacyCard key={`${f.type}-${i}`} fallacy={f} />
          ))}
        </div>
      ) : (
        <Card className="border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-400" />
          <p className="text-sm font-medium">ไม่พบตรรกะวิบัติที่มีนัยสำคัญ</p>
          <p className="mt-1 text-xs text-muted-foreground">ข้อความนี้มีโครงสร้างการโต้แย้งที่สมเหตุสมผลตามกฎที่กำหนด</p>
        </Card>
      )}

      {/* Argument structure */}
      {(structure.premises.length > 0 || structure.conclusion || structure.evidence.length > 0) && (
        <Card className="p-4 sm:p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Layers className="h-4 w-4 text-primary" />
            โครงสร้างการโต้แย้ง
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-blue-500/5 p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-400">ข้อตั้ง (Premises)</h4>
              {structure.premises.length > 0 ? (
                <ul className="space-y-1.5">
                  {structure.premises.map((p, i) => (
                    <li key={i} className="text-xs leading-relaxed">
                      <span className="text-blue-400">{i + 1}.</span> {p.text}
                      {p.type === 'implicit' && (
                        <span className="ml-1 text-[10px] text-muted-foreground">(โดยนัย)</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">ไม่พบข้อตั้งที่ชัดเจน</p>
              )}
            </div>
            <div className="rounded-lg bg-primary/5 p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">ข้อสรุป (Conclusion)</h4>
              {structure.conclusion ? (
                <p className="text-xs leading-relaxed">{structure.conclusion.text}</p>
              ) : (
                <p className="text-xs text-muted-foreground">ไม่พบข้อสรุปที่ชัดเจน</p>
              )}
            </div>
            <div className="rounded-lg bg-violet-500/5 p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-400">หลักฐาน (Evidence)</h4>
              {structure.evidence.length > 0 ? (
                <ul className="space-y-1.5">
                  {structure.evidence.map((e, i) => (
                    <li key={i} className="text-xs leading-relaxed">
                      <Badge variant="secondary" className="mr-1 bg-violet-500/10 text-[9px] text-violet-300">
                        {e.type}
                      </Badge>
                      {e.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">ไม่พบหลักฐานสนับสนุน</p>
              )}
            </div>
          </div>
          {structure.topicKeywords.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">คำสำคัญของประเด็น:</span>
              {structure.topicKeywords.map((k) => (
                <Badge key={k} variant="outline" className="border-white/10 bg-white/5 text-[10px]">
                  {k}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Step by step */}
      <Card className="p-4 sm:p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <ListOrdered className="h-4 w-4 text-primary" />
          กระบวนการวิเคราะห์ทีละขั้น
        </h3>
        <ol className="w-full space-y-2">
          {result.stepByStep.map((step, i) => (
            <li key={i} className="flex w-full gap-2.5 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-medium text-primary">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 break-words leading-relaxed text-foreground/85">
                {step}
              </span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

export { FALLACY_META };
