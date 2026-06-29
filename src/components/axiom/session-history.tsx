'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  History,
  Plus,
  Trash2,
  MessageSquare,
  Loader2,
  Clock,
  Search,
  X,
  ArrowLeftRight,
  Check,
} from 'lucide-react';
import type { AnalysisResult } from '@/lib/engine/types';
import { cn } from '@/lib/core';
import { toast } from 'sonner';

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  result?: AnalysisResult | null;
  createdAt: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  createdAt: string;
  preview: string;
  messageCount?: number;
}

interface SessionHistoryProps {
  activeSessionId: string | null;
  onSelectSession: (sessionId: string, messages: SessionMessage[]) => void;
  onNewSession: () => void;
  refreshKey: number;
  onCompare?: (sessionIdA: string, sessionIdB: string) => void;
}

export function SessionHistory({
  activeSessionId,
  onSelectSession,
  onNewSession,
  refreshKey,
  onCompare,
}: SessionHistoryProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelected, setCompareSelected] = useState<string[]>([]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      if (data.ok) setSessions(data.sessions);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions, refreshKey]);

  // กรอง sessions ตาม search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase().trim();
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.preview ?? '').toLowerCase().includes(q),
    );
  }, [sessions, searchQuery]);

  const handleSelect = async (sessionId: string) => {
    setLoadingId(sessionId);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (data.ok) {
        onSelectSession(sessionId, data.session.messages);
      } else {
        toast.error(data.error || 'ดึง session ไม่สำเร็จ');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการดึง session');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        toast.success('ลบ session แล้ว');
      }
    } catch {
      toast.error('ลบไม่สำเร็จ');
    }
  };

  const handleCompareSelect = (sessionId: string) => {
    setCompareSelected((prev) => {
      if (prev.includes(sessionId)) {
        return prev.filter((id) => id !== sessionId);
      }
      if (prev.length >= 2) {
        return [prev[1], sessionId];
      }
      return [...prev, sessionId];
    });
  };

  const runCompare = () => {
    if (compareSelected.length !== 2 || !onCompare) return;
    onCompare(compareSelected[0], compareSelected[1]);
    setCompareMode(false);
    setCompareSelected([]);
  };

  const toggleCompareMode = () => {
    setCompareMode((prev) => !prev);
    setCompareSelected([]);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 1) return 'เมื่อสักครู่';
    if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
    if (diffHr < 24) return `${diffHr} ชม.ที่แล้ว`;
    if (diffDay < 7) return `${diffDay} วันที่แล้ว`;
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2 px-1">
        <History className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">ประวัติการวิเคราะห์</h3>
        <div className="ml-auto flex items-center gap-1">
          {onCompare && sessions.length >= 2 && (
            <Button
              size="sm"
              variant={compareMode ? 'default' : 'outline'}
              onClick={toggleCompareMode}
              className="h-7 gap-1 px-2 text-[11px]"
            >
              <ArrowLeftRight className="h-3 w-3" />
              {compareMode ? `${compareSelected.length}/2` : 'เปรียบเทียบ'}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onNewSession}
            className="h-7 gap-1 border-primary/30 bg-primary/5 px-2 text-[11px] hover:bg-primary/10"
          >
            <Plus className="h-3 w-3" /> ใหม่
          </Button>
        </div>
      </div>

      {/* Compare mode action bar */}
      {compareMode && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2">
          <span className="text-[10px] text-muted-foreground">
            {compareSelected.length === 0
              ? 'เลือก 2 session เพื่อเปรียบเทียบ'
              : compareSelected.length === 1
                ? 'เลือกอีก 1 session'
                : 'พร้อมเปรียบเทียบ'}
          </span>
          <Button
            size="sm"
            onClick={runCompare}
            disabled={compareSelected.length !== 2}
            className="ml-auto h-6 gap-1 text-[10px]"
          >
            <ArrowLeftRight className="h-3 w-3" /> เปรียบเทียบ
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังโหลด...
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
          <MessageSquare className="mb-2 h-8 w-8 opacity-30" />
          <p className="text-xs">ยังไม่มีประวัติ</p>
          <p className="mt-1 text-[10px]">การวิเคราะห์ที่บันทึกจะปรากฏที่นี่</p>
        </div>
      ) : (
        <>
          {/* Search input */}
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาในประวัติ..."
              className="h-7 border-border/40 bg-card/40 pl-7 pr-6 text-[11px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="ล้างคำค้นหา"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/60 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Search className="mb-2 h-6 w-6 opacity-30" />
              <p className="text-xs">ไม่พบผลลัพธ์สำหรับ "{searchQuery}"</p>
            </div>
          ) : (
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-1.5">
            {filteredSessions.map((s) => {
              const isSelectedForCompare = compareSelected.includes(s.id);
              return (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => compareMode ? handleCompareSelect(s.id) : handleSelect(s.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (compareMode) {
                      handleCompareSelect(s.id);
                    } else {
                      void handleSelect(s.id);
                    }
                  }
                }}
                className={cn(
                  'group cursor-pointer rounded-lg border p-2.5 transition',
                  compareMode && isSelectedForCompare
                    ? 'border-primary/60 bg-primary/15 ring-1 ring-primary/30'
                    : activeSessionId === s.id
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-border/40 bg-card/40 hover:border-primary/30 hover:bg-card/80',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {compareMode && isSelectedForCompare && (
                        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground">
                          <Check className="h-2 w-2" />
                        </span>
                      )}
                      <div className="truncate text-xs font-medium text-foreground">{s.title}</div>
                    </div>
                    {/* แสดง preview เฉพาะเมื่อต่างจาก title */}
                    {s.preview && s.preview !== s.title && (
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground/80">
                        {s.preview}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-1.5 text-[9px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTime(s.createdAt)}
                      </span>
                      {s.messageCount && s.messageCount > 0 && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span>{Math.floor(s.messageCount / 2)} ครั้ง</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, s.id)}
                    aria-label="ลบ session"
                    className="shrink-0 rounded-md p-1 text-muted-foreground/50 opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    {loadingId === s.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        </ScrollArea>
          )}
        </>
      )}
      <Separator className="mt-3 bg-white/5" />
      <p className="mt-2 px-1 text-[9px] text-muted-foreground">
        บันทึกอัตโนมัติเมื่อมีการวิเคราะห์ใน session ที่เลือก
      </p>
    </div>
  );
}
