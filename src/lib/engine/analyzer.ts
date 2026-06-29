// AxiomCore Engine - Main Analyzer
// ตัววิเคราะห์หลัก: ประสานงาน syntax -> semantic -> argument -> fallacy detection

import type { AnalysisResult, Sentence, ArgumentStructure } from './types';
import { SyntaxAnalyzer } from './syntax-analyzer';
import { SemanticAnalyzer } from './semantic-analyzer';
import { ArgumentParser } from './argument-parser';
import { FallacyDetector, ConfidenceScorer } from './fallacy-detector';

export class AxiomAnalyzer {
  private syntax = new SyntaxAnalyzer();
  private semantic = new SemanticAnalyzer();
  private argParser = new ArgumentParser();
  private detector = new FallacyDetector();
  private scorer = new ConfidenceScorer();

  analyze(text: string): AnalysisResult {
    const start = Date.now();
    const trimmed = text.trim();

    // 1. Syntax analysis - แบ่งประโยค + แยกคำ
    const sentences: Sentence[] = this.syntax.splitSentences(trimmed);

    // 2. Argument structure parsing
    const structure: ArgumentStructure = this.argParser.parse(sentences);

    // 3. Fallacy detection
    const detectedFallacies = this.detector.detect(trimmed, sentences, structure);

    // 4. Build step-by-step narrative
    const stepByStep = this.buildStepByStep(sentences, structure, detectedFallacies);

    // 5. Build summary
    const summary = this.buildSummary(detectedFallacies, structure, sentences);

    const processingMs = Date.now() - start;

    return {
      input: trimmed,
      overallConfidence: this.scorer.overallConfidence(detectedFallacies),
      summary,
      detectedFallacies,
      argumentStructure: structure,
      sentences,
      stepByStep,
      stats: {
        sentenceCount: sentences.length,
        premiseCount: structure.premises.length,
        conclusionCount: structure.conclusion ? 1 : 0,
        evidenceCount: structure.evidence.length,
        detectionCount: detectedFallacies.length,
        processingMs,
      },
    };
  }

  private buildStepByStep(
    sentences: Sentence[],
    structure: ArgumentStructure,
    detected: AnalysisResult['detectedFallacies'],
  ): string[] {
    const steps: string[] = [];

    steps.push(`ขั้นที่ 1 — การแบ่งประโยค: แยกข้อความออกเป็น ${sentences.length} ประโยค`);
    if (sentences.length > 0) {
      steps.push(`ขั้นที่ 2 — การระบุบทบาทประโยค: ${this.describeRoles(sentences)}`);
    }
    steps.push(
      `ขั้นที่ 3 — การสกัดโครงสร้างการโต้แย้ง: พบข้อตั้ง ${structure.premises.length} ข้อ, ข้อสรุป ${structure.conclusion ? 1 : 0} ข้อ, หลักฐาน ${structure.evidence.length} ชิ้น`,
    );
    if (structure.premises.length > 0) {
      steps.push(`ขั้นที่ 4 — ข้อตั้งที่สกัดได้: ${structure.premises.map((p) => `"${truncate(p.text)}"`).join('; ')}`);
    }
    if (structure.conclusion) {
      steps.push(`ขั้นที่ 5 — ข้อสรุปที่สกัดได้: "${truncate(structure.conclusion.text)}"`);
    }
    const detectionStep = Math.max(6, structure.premises.length > 0 ? 5 : 4) + 1;
    steps.push(
      `ขั้นที่ ${detectionStep} — การตรวจจับตรรกะวิบัติ: ตรวจสอบ 12 ประเภท พบ ${detected.length} ประเภทที่มีความมั่นใจเหนือขีด`,
    );
    detected.forEach((d, i) => {
      steps.push(`ขั้นที่ ${detectionStep + 1 + i} — ${d.nameTh} (${d.nameEn}): ความมั่นใจ ${Math.round(d.confidence * 100)}% ความเสี่ยง False Positive ${Math.round(d.falsePositiveRisk * 100)}%`);
    });
    const summaryStep = detectionStep + 1 + detected.length;
    steps.push(`ขั้นที่ ${summaryStep} — สรุปผล: ${this.buildSummary(detected, structure, sentences)}`);

    return steps;
  }

  private describeRoles(sentences: Sentence[]): string {
    const counts = sentences.reduce(
      (acc, s) => {
        const role = s.role ?? 'unknown';
        acc[role] = (acc[role] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const parts = Object.entries(counts).map(([role, count]) => `${roleTh(role)} ${count} ประโยค`);
    return parts.join(', ');
  }

  private buildSummary(
    detected: AnalysisResult['detectedFallacies'],
    structure: ArgumentStructure,
    sentences: Sentence[],
  ): string {
    if (detected.length === 0) {
      return `วิเคราะห์ข้อความ ${sentences.length} ประโยค พบข้อตั้ง ${structure.premises.length} ข้อ และข้อสรุป ${structure.conclusion ? 1 : 0} ข้อ ไม่พบตรรกะวิบัติที่มีนัยสำคัญ โครงสร้างการโต้แย้งมีความเป็นไปได้ที่จะสมเหตุสมผล อย่างไรก็ตามควรพิจารณาคุณภาพของหลักฐานและความสมบูรณ์ของข้อตั้งเพิ่มเติม`;
    }
    const top = detected[0];
    const others = detected.slice(1);
    let summary = `วิเคราะห์พบตรรกะวิบัติ ${detected.length} ประเภท โดยที่เด่นที่สุดคือ "${top.nameTh}" (${top.nameEn}) ที่ความมั่นใจ ${Math.round(top.confidence * 100)}%`;
    if (others.length > 0) {
      summary += ` นอกจากนี้ยังพบ ${others.map((d) => `${d.nameTh} (${Math.round(d.confidence * 100)}%)`).join(', ')}`;
    }
    summary += ` ความมั่นใจรวมของการวิเคราะห์ ${Math.round(this.scorer.overallConfidence(detected) * 100)}%`;
    return summary;
  }
}

function roleTh(role: string): string {
  const map: Record<string, string> = {
    premise: 'ข้อตั้ง',
    conclusion: 'ข้อสรุป',
    evidence: 'หลักฐาน',
    claim: 'ข้ออ้าง',
    unknown: 'ไม่ระบุ',
  };
  return map[role] ?? role;
}

function truncate(s: string, max = 60): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '…';
}

// Singleton instance
let _analyzer: AxiomAnalyzer | null = null;
export function getAnalyzer(): AxiomAnalyzer {
  if (!_analyzer) _analyzer = new AxiomAnalyzer();
  return _analyzer;
}
