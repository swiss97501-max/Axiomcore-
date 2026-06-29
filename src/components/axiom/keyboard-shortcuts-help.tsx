'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard, Command } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['Enter'], description: 'ส่งข้อความวิเคราะห์', category: 'การวิเคราะห์' },
  { keys: ['Shift', 'Enter'], description: 'ขึ้นบรรทัดใหม่ในช่องกรอก', category: 'การวิเคราะห์' },
  { keys: ['Ctrl', '/'], description: 'โฟกัสที่ช่องกรอกข้อความ', category: 'การนำทาง' },
  { keys: ['Ctrl', 'Shift', 'N'], description: 'สร้างบทสนทนาใหม่', category: 'การนำทาง' },
  { keys: ['↑'], description: 'คู่การวิเคราะห์ก่อนหน้า (ใน Compare View)', category: 'Compare View' },
  { keys: ['↓'], description: 'คู่การวิเคราะห์ถัดไป (ใน Compare View)', category: 'Compare View' },
  { keys: ['Esc'], description: 'ปิด Dialog / Sheet', category: 'การนำทาง' },
];

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  // ฟัง event สำหรับเปิดจากที่อื่น
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('axiomcore-open-shortcuts', handler);
    return () => window.removeEventListener('axiomcore-open-shortcuts', handler);
  }, []);

  // Group by category
  const categories = [...new Set(SHORTCUTS.map((s) => s.category))];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[92vw] max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Keyboard className="h-4 w-4 text-primary" />
            คีย์ลัด
          </DialogTitle>
          <DialogDescription className="text-xs">
            คีย์ลัดทั้งหมดที่ใช้ใน AxiomCore ได้
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat}>
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {cat}
              </h4>
              <div className="space-y-1.5">
                {SHORTCUTS.filter((s) => s.category === cat).map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-foreground/85">{s.description}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((key, j) => (
                        <span key={j} className="flex items-center gap-1">
                          {j > 0 && <span className="text-[9px] text-muted-foreground">+</span>}
                          <kbd className="rounded border border-border/60 bg-card/60 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-primary/5 px-2 py-1.5 text-[10px] text-muted-foreground">
          <Command className="h-3 w-3 text-primary" />
          <span>บน Mac ใช้ Cmd แทน Ctrl</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** ปุ่มสำหรับเปิด help dialog */
export function ShortcutsHelpButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => window.dispatchEvent(new Event('axiomcore-open-shortcuts'))}
      aria-label="คีย์ลัด"
    >
      <Keyboard className="h-4 w-4" />
    </Button>
  );
}
