'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AnalysisResultView } from '@/components/axiom/analysis-result-view';
import { InfoPanel } from '@/components/axiom/info-panel';
import { KnowledgeBase } from '@/components/axiom/knowledge-base';
import { SessionHistory, type SessionMessage } from '@/components/axiom/session-history';
import { BatchAnalysis } from '@/components/axiom/batch-analysis';
import { StatsDashboard } from '@/components/axiom/stats-dashboard';
import { ThemeToggle } from '@/components/axiom/theme';
import { OnboardingOverlay, HelpButton } from '@/components/axiom/onboarding-overlay';
import { AnalysisSkeleton } from '@/components/axiom/analysis-skeleton';
import { MobileOverflowMenu } from '@/components/axiom/mobile-overflow-menu';
import { CompareView } from '@/components/axiom/compare-view';
import { KeyboardShortcutsHelp, ShortcutsHelpButton } from '@/components/axiom/keyboard-shortcuts-help';
import { PixelMascot } from '@/components/pixel-mascot';
import type { AnalysisResult } from '@/lib/engine/types';
import {
  Send,
  Trash2,
  Info,
  AlertTriangle,
  Loader2,
  User,
  Brain,
  Database,
  Zap,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
  Plus,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/core';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  result?: AnalysisResult;
  loading?: boolean;
  error?: string;
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('history');
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastAssistantRef = useRef<HTMLDivElement>(null);

  // Scroll ไปที่หัวของคำตอบ AxiomCore ล่าสุด (ไม่ใช่ล่างสุด)
  // ใช้ scroll ครั้งเดียวเพื่อหลีกเลี่ยงการเด้ง
  const scrollToLatestResponse = useCallback(() => {
    requestAnimationFrame(() => {
      if (lastAssistantRef.current) {
        lastAssistantRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    });
  }, []);

  useEffect(() => {
    // ยิง scroll เฉพาะเมื่อมีการเพิ่ม message ใหม่ (ไม่ใช่ update loading → result)
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && !lastMsg.loading) {
      scrollToLatestResponse();
    }
  }, [messages.length, scrollToLatestResponse]);

  // ปรับความสูง textarea อัตโนมัติ
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Keyboard shortcuts ทั่วโลก
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd + / โฟกัสที่ textarea
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
      // Ctrl/Cmd + Shift + N สร้าง session ใหม่
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        startNewSession();
        toast.success('เริ่มบทสนทนาใหม่');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // โหลด session ที่ active ล่าสุดตอนเริ่มต้น (optional - leave empty for new chat)
  const ensureSession = async (): Promise<string> => {
    if (sessionId) return sessionId;
    try {
      const res = await fetch('/api/sessions', {
        cache: 'no-store',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'การวิเคราะห์ใหม่' }),
      });
      const data = await res.json();
      if (data.ok) {
        setSessionId(data.session.id);
        setSessionRefreshKey((k) => k + 1);
        return data.session.id;
      }
    } catch {
      // ignore
    }
    return '';
  };

  const analyze = async (text: string) => {
    // Add user message + loading message IMMEDIATELY (before session creation)
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
    };
    const loadingMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: 'กำลังวิเคราะห์...',
      loading: true,
    };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setAnalyzing(true);

    // Create session in background (don't block UI)
    const sid = await ensureSession();

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sessionId: sid || undefined }),
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'วิเคราะห์ไม่สำเร็จ');
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? {
                ...m,
                content: data.result.summary,
                result: data.result as AnalysisResult,
                loading: false,
              }
            : m,
        ),
      );
      // อัปเดตชื่อ session ถ้าเป็นข้อความแรก
      if (messages.length === 0 && sid) {
        await fetch(`/api/sessions/${encodeURIComponent(sid)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: text.slice(0, 60) }),
        }).catch(() => {});
      }
      setSessionRefreshKey((k) => k + 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: 'เกิดข้อผิดพลาดในการวิเคราะห์', error: msg, loading: false }
            : m,
        ),
      );
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || analyzing) return;
    setInput('');
    void analyze(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
    setSessionRefreshKey((k) => k + 1);
    toast.success('เริ่มบทสนทนาใหม่');
  };

  const startNewSession = () => {
    setMessages([]);
    setSessionId(null);
    setSessionRefreshKey((k) => k + 1);
    setSidebarOpen(false);
  };

  const handleSelectSession = (sid: string, sessionMessages: SessionMessage[]) => {
    setSessionId(sid);
    const mapped: ChatMessage[] = sessionMessages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      result: m.result ?? undefined,
      loading: false,
    }));
    setMessages(mapped);
    setSidebarOpen(false);
    toast.success('โหลด session แล้ว');
  };

  const handleCompare = (sidA: string, sidB: string) => {
    setCompareA(sidA);
    setCompareB(sidB);
    setCompareOpen(true);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden shrink-0 border-r border-border/40 bg-sidebar/40 transition-all duration-200 lg:flex lg:flex-col',
        sidebarCollapsed ? 'w-14' : 'w-72'
      )}>
        {sidebarCollapsed ? (
          <CollapsedSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onExpand={() => setSidebarCollapsed(false)}
            onNewSession={startNewSession}
          />
        ) : (
          <SidebarContent
            activeSessionId={sessionId}
            onSelectSession={handleSelectSession}
            onNewSession={startNewSession}
            refreshKey={sessionRefreshKey}
            onCompare={handleCompare}
            onCollapse={() => setSidebarCollapsed(true)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        )}
      </aside>

      {/* Mobile sidebar drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-full p-0 sm:max-w-xs">
          <SheetHeader className="sr-only">
            <SheetTitle>เมนู AxiomCore</SheetTitle>
            <SheetDescription>ประวัติการวิเคราะห์และฐานความรู้</SheetDescription>
          </SheetHeader>
          <div className="flex h-full flex-col p-3">
            <SidebarContent
              activeSessionId={sessionId}
              onSelectSession={handleSelectSession}
              onNewSession={startNewSession}
              refreshKey={sessionRefreshKey}
              onCompare={handleCompare}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="glass sticky top-0 z-30 border-b border-border/50">
          <div className="flex h-14 items-center justify-between px-3 sm:px-4">
            <div className="flex items-center gap-2.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="เปิดเมนู"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                <PixelMascot size={2} animated={false} border={false} />
              </div>
              <div className="flex flex-col">
                <h1 className="text-sm font-semibold leading-none">AxiomCore</h1>
                <span className="text-[10px] text-muted-foreground">ระบบวิเคราะห์ตรรกะวิบัติ</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="hidden border-primary/30 bg-primary/10 text-primary sm:inline-flex">
                      <Zap className="mr-1 h-3 w-3" />
                      12 ประเภท
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>ตรวจจับตรรกะวิบัติ 12 ประเภท</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Batch analysis button - opens dialog */}
              <BatchAnalysis />

              {/* Knowledge base button - opens sheet (desktop only trigger) */}
              <Sheet open={knowledgeOpen} onOpenChange={setKnowledgeOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden h-8 w-8 lg:inline-flex" aria-label="ฐานความรู้">
                    <BookOpen className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      ฐานความรู้ตรรกะวิบัติ
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                      เรียกดูรายละเอียดและตัวอย่างของตรรกะวิบัติทั้ง 12 ประเภท
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-4 px-1">
                    <KnowledgeBase />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Info button (desktop only trigger) */}
              <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden h-8 w-8 lg:inline-flex" aria-label="ข้อมูลระบบ">
                    <Info className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-primary" />
                      ข้อมูลระบบ AxiomCore
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                      สถิติชุดข้อมูล จำนวนตัวอย่าง กฎตรวจจับ และเครื่องมือสร้างข้อมูล
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-4 px-1">
                    <InfoPanel />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Stats dashboard button (desktop only trigger) */}
              <Sheet open={statsOpen} onOpenChange={setStatsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden h-8 w-8 lg:inline-flex" aria-label="สถิติการวิเคราะห์">
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      สถิติการวิเคราะห์
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                      สถิติการวิเคราะห์รวมจากประวัติทั้งหมด พร้อมกราฟและการกระจาย
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-4 px-1">
                    <StatsDashboard />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Help button - desktop only (mobile uses overflow menu) */}
              <div className="hidden lg:block">
                <HelpButton />
              </div>

              {/* Keyboard shortcuts help - desktop only */}
              <div className="hidden lg:block">
                <ShortcutsHelpButton />
              </div>

              <ThemeToggle />

              {/* Mobile overflow menu - consolidates secondary buttons */}
              <MobileOverflowMenu
                onOpenKnowledge={() => setKnowledgeOpen(true)}
                onOpenInfo={() => setInfoOpen(true)}
                onOpenStats={() => setStatsOpen(true)}
                onOpenHelp={() => window.dispatchEvent(new Event('axiomcore-open-onboarding'))}
              />

              {messages.length > 0 && (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearChat} aria-label="ล้างบทสนทนา">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>ล้างบทสนทนา</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </header>

        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-4xl px-3 py-6 sm:px-4">
            {messages.length === 0 ? (
              <WelcomeView />
            ) : (
              <div className="space-y-6">
                {messages.map((m, i) => {
                  const isLastAssistant = m.role === 'assistant' && i === messages.length - 1;
                  return (
                    <div key={m.id} ref={isLastAssistant ? lastAssistantRef : undefined}>
                      <ChatMessageView message={m} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Input area - sticky bottom */}
        <footer className="glass sticky bottom-0 border-t border-border/50">
          <div className="mx-auto max-w-4xl px-3 py-3 sm:px-4">
            <form onSubmit={handleSubmit} className="relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder=""
                disabled={analyzing}
                className="min-h-[52px] resize-none border-border/60 bg-card/60 pr-14 text-sm scrollbar-thin focus-visible:border-primary/50 focus-visible:ring-primary/20"
                rows={1}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || analyzing}
                className="absolute bottom-2.5 right-2.5 h-8 w-8 rounded-lg"
                aria-label="ส่งข้อความ"
              >
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </footer>
      </div>
      <OnboardingOverlay />
      <CompareView
        sessionIdA={compareA}
        sessionIdB={compareB}
        open={compareOpen}
        onOpenChange={setCompareOpen}
      />
      <KeyboardShortcutsHelp />
    </div>
  );
}

function SidebarContent({
  activeSessionId,
  onSelectSession,
  onNewSession,
  refreshKey,
  onCompare,
  onCollapse,
  activeTab,
  setActiveTab,
}: {
  activeSessionId: string | null;
  onSelectSession: (sessionId: string, messages: SessionMessage[]) => void;
  onNewSession: () => void;
  refreshKey: number;
  onCompare?: (sessionIdA: string, sessionIdB: string) => void;
  onCollapse?: () => void;
  activeTab: string;
  setActiveTab: (t: string) => void;
}) {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2 px-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
          <PixelMascot size={2} animated={false} border={false} />
        </div>
        <span className="text-sm font-semibold">AxiomCore</span>
        <Button
          size="sm"
          variant="outline"
          onClick={onNewSession}
          className="ml-auto h-7 gap-1 border-primary/30 bg-primary/5 px-2 text-[11px] hover:bg-primary/10"
        >
          <Plus className="h-3 w-3" /> ใหม่
        </Button>
        {onCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={onCollapse}
            aria-label="ย่อแถบข้าง"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
      </div>
      <TabsList className="grid h-9 w-full grid-cols-3 bg-card/40">
        <TabsTrigger value="history" className="gap-1 text-[11px]">
          <Brain className="h-3 w-3" /> ประวัติ
        </TabsTrigger>
        <TabsTrigger value="knowledge" className="gap-1 text-[11px]">
          <BookOpen className="h-3 w-3" /> ความรู้
        </TabsTrigger>
        <TabsTrigger value="stats" className="gap-1 text-[11px]">
          <BarChart3 className="h-3 w-3" /> สถิติ
        </TabsTrigger>
      </TabsList>
      <TabsContent value="history" className="mt-3 flex-1 overflow-hidden">
        <SessionHistory
          activeSessionId={activeSessionId}
          onSelectSession={onSelectSession}
          onNewSession={onNewSession}
          refreshKey={refreshKey}
          onCompare={onCompare}
        />
      </TabsContent>
      <TabsContent value="knowledge" className="mt-3 flex-1 overflow-hidden">
        <KnowledgeBase />
      </TabsContent>
      <TabsContent value="stats" className="mt-3 flex-1 overflow-y-auto pr-1">
        <StatsDashboard />
      </TabsContent>
    </Tabs>
  );
}

function CollapsedSidebar({
  activeTab,
  setActiveTab,
  onExpand,
  onNewSession,
}: {
  activeTab: string;
  setActiveTab: (t: string) => void;
  onExpand: () => void;
  onNewSession: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center gap-2 py-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
        <PixelMascot size={2} animated={false} border={false} />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onExpand}
        aria-label="ขยายแถบข้าง"
        title="ขยายแถบข้าง"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </Button>
      <div className="my-1 h-px w-8 bg-border/40" />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onNewSession}
        aria-label="เริ่ม session ใหม่"
        title="เริ่ม session ใหม่"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <div className="my-1 h-px w-8 bg-border/40" />
      <Button
        variant={activeTab === 'history' ? 'secondary' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onClick={() => setActiveTab('history')}
        aria-label="ประวัติการวิเคราะห์"
        title="ประวัติการวิเคราะห์"
      >
        <Brain className="h-4 w-4" />
      </Button>
      <Button
        variant={activeTab === 'knowledge' ? 'secondary' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onClick={() => setActiveTab('knowledge')}
        aria-label="ฐานความรู้"
        title="ฐานความรู้"
      >
        <BookOpen className="h-4 w-4" />
      </Button>
      <Button
        variant={activeTab === 'stats' ? 'secondary' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onClick={() => setActiveTab('stats')}
        aria-label="สถิติการวิเคราะห์"
        title="สถิติการวิเคราะห์"
      >
        <BarChart3 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function WelcomeView() {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center sm:py-12">
      {/* Main mascot — ลอยอิสระ ไม่มีกรอบสี่เหลี่ยม */}
      <div className="mb-6">
        <PixelMascot size={5} animated border />
      </div>
      <h2 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
        <span className="gradient-text">AxiomCore</span>
      </h2>
    </div>
  );
}

function ChatMessageView({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-3 animate-fade-in-up', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          isUser ? 'bg-secondary' : 'bg-primary/15',
        )}
      >
        {isUser ? <User className="h-4 w-4 text-muted-foreground" /> : (
          <PixelMascot size={2} animated={false} border={false} />
        )}
      </div>
      <div className={cn('flex-1 space-y-3', isUser && 'flex flex-col items-end')}>
        <div className="text-[10px] text-muted-foreground">{isUser ? 'คุณ' : 'AxiomCore'}</div>
        {isUser ? (
          <div className="inline-block max-w-[85%] rounded-2xl rounded-tr-sm bg-secondary px-4 py-2.5 text-sm leading-relaxed">
            {message.content}
          </div>
        ) : message.loading ? (
          <div className="w-full space-y-3">
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-card/60 px-4 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="animate-pulse-soft">กำลังวิเคราะห์...</span>
            </div>
            <AnalysisSkeleton />
          </div>
        ) : message.error ? (
          <div className="rounded-2xl rounded-tl-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {message.error}
          </div>
        ) : message.result ? (
          <div className="w-full">
            <AnalysisResultView result={message.result} />
          </div>
        ) : (
          <div className="inline-block rounded-2xl rounded-tl-sm bg-card/60 px-4 py-2.5 text-sm">
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}
