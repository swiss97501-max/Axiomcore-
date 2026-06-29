'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { BookOpen, BarChart3, Database, Sparkles, MoreVertical } from 'lucide-react';

interface MobileOverflowMenuProps {
  onOpenKnowledge: () => void;
  onOpenInfo: () => void;
  onOpenStats: () => void;
  onOpenHelp: () => void;
}

/**
 * Mobile overflow menu — รวมปุ่ม secondary (knowledge, info, stats, help)
 * เป็น DropdownMenu เดียวเพื่อลดความแออัดบน header ของ mobile
 * แสดงเฉพาะบนจอเล็ก (lg:hidden)
 */
export function MobileOverflowMenu({
  onOpenKnowledge,
  onOpenInfo,
  onOpenStats,
  onOpenHelp,
}: MobileOverflowMenuProps) {
  const [open, setOpen] = useState(false);

  const handle = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 lg:hidden"
          aria-label="เมนูเพิ่มเติม"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
          เมนูเพิ่มเติม
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handle(onOpenKnowledge)} className="gap-2 text-xs">
          <BookOpen className="h-3.5 w-3.5 text-violet-400" />
          ฐานความรู้
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle(onOpenStats)} className="gap-2 text-xs">
          <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
          สถิติการวิเคราะห์
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle(onOpenInfo)} className="gap-2 text-xs">
          <Database className="h-3.5 w-3.5 text-primary" />
          ข้อมูลระบบ
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handle(onOpenHelp)} className="gap-2 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          คู่มือการใช้งาน
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
