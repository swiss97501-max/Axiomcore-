'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sparkles,
  AlertTriangle,
  Layers,
  BookOpen,
  BarChart3,
  Keyboard,
  Shield,
  ArrowRight,
  Check,
} from 'lucide-react';

const STORAGE_KEY = 'axiomcore-onboarding-dismissed';

const STEPS = [
  {
    icon: Sparkles,
    title: 'ยินดีต้อนรับสู่ AxiomCore',
    description: 'ระบบวิเคราะห์ตรรกะวิบัติ 12 ประเภท ทำงานด้วย Rule Engine ภายในเว็บทั้งหมด — ไม่ใช้ AI ภายนอกใดๆ',
    color: 'text-primary',
  },
  {
    icon: AlertTriangle,
    title: 'วิเคราะห์ข้อความ',
    description: 'วางข้อความที่ต้องการวิเคราะห์ในช่องด้านล่าง แล้วกด Enter ระบบจะแสดงตรรกะวิบัติที่พบ พร้อมความมั่นใจและข้อโต้แย้ง',
    color: 'text-amber-400',
  },
  {
    icon: Layers,
    title: 'วิเคราะห์แบบชุด',
    description: 'กดปุ่ม Layers เพื่อวิเคราะห์หลายข้อความพร้อมกันและเปรียบเทียบผลลัพธ์',
    color: 'text-cyan-400',
  },
  {
    icon: BookOpen,
    title: 'ฐานความรู้',
    description: 'เรียกดูรายละเอียดและตัวอย่างของตรรกะวิบัติทั้ง 12 ประเภทได้จากปุ่ม BookOpen',
    color: 'text-violet-400',
  },
  {
    icon: BarChart3,
    title: 'สถิติการวิเคราะห์',
    description: 'ดูสถิติรวม กราฟกิจกรรม 7 วัน และตรรกะวิบัติที่พบบ่อย ได้จากปุ่ม BarChart3',
    color: 'text-emerald-400',
  },
  {
    icon: Keyboard,
    title: 'คีย์ลัด',
    description: 'Ctrl+/ เพื่อโฟกัสช่องกรอกข้อความ · Ctrl+Shift+N เพื่อสร้างบทสนทนาใหม่',
    color: 'text-sky-400',
  },
  {
    icon: Shield,
    title: 'ความเป็นส่วนตัว',
    description: 'การวิเคราะห์ทำงานในเซิร์ฟเวอร์ของเว็บเอง ไม่ส่งข้อมูลไปยังบริการภายนอกใดๆ',
    color: 'text-rose-400',
  },
];

function getInitialOpen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

export function OnboardingOverlay() {
  const [open, setOpen] = useState(getInitialOpen);
  const [step, setStep] = useState(0);

  // ฟัง event สำหรับเปิดซ้ำจาก HelpButton (รีเซ็ต step ด้วย)
  useEffect(() => {
    const handler = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener('axiomcore-open-onboarding', handler);
    return () => window.removeEventListener('axiomcore-open-onboarding', handler);
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setOpen(false);
  }, []);

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else dismiss();
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) dismiss();
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[92vw] max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <Icon className={`h-4 w-4 ${current.color}`} />
            </span>
            {current.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            ขั้นตอนที่ {step + 1} จาก {STEPS.length}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground/85">{current.description}</p>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                aria-label={`ขั้นตอนที่ ${i + 1}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={dismiss} className="text-xs text-muted-foreground">
              ข้าม
            </Button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={() => setStep(step - 1)} className="text-xs">
                  ย้อนกลับ
                </Button>
              )}
              <Button size="sm" onClick={next} className="gap-1 text-xs">
                {isLast ? (
                  <>
                    <Check className="h-3 w-3" /> เริ่มใช้งาน
                  </>
                ) : (
                  <>
                    ถัดไป <ArrowRight className="h-3 w-3" />
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="text-center text-[10px] text-muted-foreground">
            ขั้นตอนที่ {step + 1} จาก {STEPS.length}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** ปุ่ม Help สำหรับเปิด onboarding ซ้ำ */
export function HelpButton() {
  const reopen = () => {
    window.dispatchEvent(new Event('axiomcore-open-onboarding'));
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={reopen}
      aria-label="คู่มือการใช้งาน"
    >
      <Sparkles className="h-4 w-4" />
    </Button>
  );
}
