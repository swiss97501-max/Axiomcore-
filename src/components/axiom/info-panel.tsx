'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ALL_FALLACY_TYPES, FALLACY_META } from '@/lib/engine/types';
import type { FallacyType } from '@/lib/engine/types';
import {
  Database,
  RefreshCw,
  Brain,
  Activity,
  BookOpen,
  Layers,
  TrendingUp,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Stats {
  fallacyExamples: number;
  mixedFallacyExamples: number;
  debateTopics: number;
  analysisSessions: number;
  detectionRules: number;
  improvementLogs: number;
  supportedFallacyTypes: number;
  supportedDebateCategories: number;
  byDifficulty: { difficulty: string; _count: { _all: number } }[];
  debateByCategory: { category: string; _count: { _all: number } }[];
}

interface FallacyInfo {
  type: FallacyType;
  nameTh: string;
  nameEn: string;
  ruleCount: number;
  exampleCount: number;
}

const CATEGORY_TH: Record<string, string> = {
  science: 'วิทยาศาสตร์',
  physics: 'ฟิสิกส์',
  mathematics: 'คณิตศาสตร์',
  philosophy: 'ปรัชญา',
  economics: 'เศรษฐศาสตร์',
  law: 'กฎหมาย',
  politics: 'รัฐศาสตร์',
  ai: 'AI',
  ml: 'Machine Learning',
  quantum: 'Quantum Computing',
  religion: 'ศาสนา',
  ethics: 'จริยธรรม',
  medicine: 'การแพทย์',
  biology: 'ชีววิทยา',
  energy: 'พลังงาน',
  space: 'อวกาศ',
  cybersecurity: 'ความมั่นคงไซเบอร์',
  blockchain: 'Blockchain',
  linguistics: 'ภาษาศาสตร์',
  history: 'ประวัติศาสตร์',
};

export function InfoPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [fallacies, setFallacies] = useState<FallacyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [improving, setImproving] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dataset/stats');
      const data = await res.json();
      if (data.ok) {
        setStats(data.stats);
        setFallacies(data.fallacies);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/dataset/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perType: 15, mixed: 30, debates: 40 }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(
          `สร้างข้อมูลเพิ่มแล้ว: ${data.generated.fallacyExamples} ตัวอย่าง, ${data.generated.mixedFallacyExamples} ผสม, ${data.generated.debateTopics} หัวข้อ`,
        );
        await loadStats();
      } else {
        toast.error(data.error || 'สร้างข้อมูลไม่สำเร็จ');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการสร้างข้อมูล');
    } finally {
      setGenerating(false);
    }
  };

  const runImprovement = async () => {
    setImproving(true);
    try {
      const res = await fetch('/api/self-improvement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samplesPerType: 6 }),
      });
      const data = await res.json();
      if (data.ok) {
        const r = data.result;
        toast.success(
          `Self-Improvement เสร็จ: F1 ${Math.round(r.finalF1 * 100)}%, ทดสอบ ${r.totalTested} ตัวอย่าง, ${r.converged ? 'ลู่เข้าแล้ว' : 'ยังไม่ลู่เข้า'}`,
        );
        await loadStats();
      } else {
        toast.error(data.error || 'รันไม่สำเร็จ');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setImproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังโหลดข้อมูล...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview stats */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Database className="h-4 w-4 text-primary" /> ภาพรวมชุดข้อมูล
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="ตัวอย่างตรรกะวิบัติ" value={stats?.fallacyExamples ?? 0} icon={BookOpen} />
          <StatBox label="ตัวอย่างผสม" value={stats?.mixedFallacyExamples ?? 0} icon={Layers} />
          <StatBox label="หัวข้อโต้วาที" value={stats?.debateTopics ?? 0} icon={Activity} />
          <StatBox label="กฎตรวจจับ" value={stats?.detectionRules ?? 0} icon={Brain} />
        </div>
      </Card>

      {/* By difficulty */}
      {stats?.byDifficulty && stats.byDifficulty.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" /> จำนวนตามระดับความยาก
          </h3>
          <div className="space-y-2">
            {(['easy', 'medium', 'hard', 'expert'] as const).map((diff) => {
              const count = stats.byDifficulty.find((d) => d.difficulty === diff)?._count._all ?? 0;
              const total = stats.byDifficulty.reduce((s, d) => s + d._count._all, 0) || 1;
              const label = { easy: 'ง่าย', medium: 'กลาง', hard: 'ยาก', expert: 'ผู้เชี่ยวชาญ' }[diff];
              return (
                <div key={diff}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <Progress value={(count / total) * 100} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 12 fallacy types */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4 text-primary" /> 12 ประเภทตรรกะวิบัติที่รองรับ
        </h3>
        <div className="space-y-2">
          {fallacies.map((f) => (
            <div key={f.type} className="rounded-lg border border-border/40 bg-card/40 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium">{f.nameTh}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{f.nameEn}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge variant="secondary" className="bg-primary/10 text-[9px] text-primary">
                    {f.ruleCount} กฎ
                  </Badge>
                  <Badge variant="outline" className="border-white/10 text-[9px]">
                    {f.exampleCount} ตัวอย่าง
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Debate categories */}
      {stats?.debateByCategory && stats.debateByCategory.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-primary" /> หัวข้อโต้วาทีตามหมวดวิชา
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {stats.debateByCategory
              .sort((a, b) => b._count._all - a._count._all)
              .map((c) => (
                <div key={c.category} className="flex items-center justify-between rounded-md bg-card/40 px-2 py-1.5 text-xs">
                  <span className="truncate text-muted-foreground">{CATEGORY_TH[c.category] ?? c.category}</span>
                  <span className="font-medium">{c._count._all}</span>
                </div>
              ))}
          </div>
        </Card>
      )}

      <Separator className="bg-white/5" />

      {/* Actions */}
      <div className="space-y-2">
        <Button
          onClick={generate}
          disabled={generating}
          variant="outline"
          className="w-full border-primary/30 bg-primary/5 hover:bg-primary/10"
        >
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          สร้างชุดข้อมูลเพิ่มเติม
        </Button>
        <Button
          onClick={runImprovement}
          disabled={improving}
          variant="outline"
          className="w-full border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10"
        >
          {improving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
          รัน Self-Improvement Loop
        </Button>
        {stats?.improvementLogs && stats.improvementLogs > 0 && (
          <p className="text-center text-[10px] text-muted-foreground">
            รัน Self-Improvement แล้ว {stats.improvementLogs} รอบ
          </p>
        )}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/40 p-3">
      <Icon className="mb-1 h-3.5 w-3.5 text-muted-foreground" />
      <div className="text-xl font-semibold text-primary">{value.toLocaleString()}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
