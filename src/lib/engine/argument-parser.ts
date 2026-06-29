// AxiomCore Engine - Argument Parser (merged: PremiseExtractor + ConclusionExtractor + EvidenceExtractor)
// ตัวแยกวิเคราะห์โครงสร้างการโต้แย้ง: ประสานงาน premise/conclusion/evidence
// รวม 3 extractors ในไฟล์เดียวเพื่อลดจำนวนไฟล์ โดย preserve exports ทั้งหมด

import type { Sentence, ArgumentStructure, Premise, Conclusion, Evidence } from './types';
import { LOGICAL_MARKERS } from './syntax-analyzer';

// ===== Premise Extractor =====
export class PremiseExtractor {
  extract(sentences: Sentence[]): Premise[] {
    const premises: Premise[] = [];
    const premiseIndicators = LOGICAL_MARKERS.premise;

    for (const sentence of sentences) {
      if (sentence.role === 'premise') {
        const indicator = this.findIndicator(sentence.text, premiseIndicators);
        const text = this.stripIndicator(sentence.text, indicator);
        premises.push({
          text,
          sentenceIndex: sentence.index,
          indicator,
          type: 'explicit',
        });
      }
    }

    if (premises.length === 0) {
      const conclusionIdx = sentences.findIndex((s) => s.role === 'conclusion');
      if (conclusionIdx > 0) {
        for (let i = 0; i < conclusionIdx; i++) {
          const s = sentences[i];
          if (s.role === 'unknown' || s.role === 'claim' || s.role === 'evidence') {
            premises.push({
              text: s.text,
              sentenceIndex: s.index,
              type: 'implicit',
            });
          }
        }
      }
    }

    if (premises.length === 0 && sentences.length > 1) {
      for (const s of sentences) {
        if (s.role !== 'conclusion') {
          premises.push({
            text: s.text,
            sentenceIndex: s.index,
            type: 'implicit',
          });
        }
      }
    }

    return premises;
  }

  private findIndicator(text: string, indicators: string[]): string | undefined {
    const sorted = [...indicators].sort((a, b) => b.length - a.length);
    return sorted.find((i) => text.includes(i));
  }

  private stripIndicator(text: string, indicator?: string): string {
    if (!indicator) return text.trim();
    return text.replace(indicator, '').trim();
  }
}

// ===== Conclusion Extractor =====
export class ConclusionExtractor {
  extract(sentences: Sentence[]): Conclusion | null {
    const conclusionIndicators = LOGICAL_MARKERS.conclusion;

    for (const sentence of sentences) {
      if (sentence.role === 'conclusion') {
        const indicator = this.findIndicator(sentence.text, conclusionIndicators);
        const text = this.stripIndicator(sentence.text, indicator);
        return {
          text,
          sentenceIndex: sentence.index,
          indicator,
        };
      }
    }

    if (sentences.length >= 2) {
      const last = sentences[sentences.length - 1];
      const hasPremiseBefore = sentences.some(
        (s) => s.role === 'premise' || s.role === 'evidence',
      );
      if (hasPremiseBefore) {
        return {
          text: last.text,
          sentenceIndex: last.index,
          type: 'implicit' as never,
        } as Conclusion;
      }
    }

    for (const sentence of sentences) {
      if (/(ควร|ต้อง|สมควร|จำเป็นต้อง|ไม่ควร)/.test(sentence.text)) {
        return {
          text: sentence.text,
          sentenceIndex: sentence.index,
        };
      }
    }

    return null;
  }

  private findIndicator(text: string, indicators: string[]): string | undefined {
    const sorted = [...indicators].sort((a, b) => b.length - a.length);
    return sorted.find((i) => text.includes(i));
  }

  private stripIndicator(text: string, indicator?: string): string {
    if (!indicator) return text.trim();
    return text.replace(indicator, '').trim();
  }
}

// ===== Evidence Extractor =====
export class EvidenceExtractor {
  extract(sentences: Sentence[]): Evidence[] {
    const evidence: Evidence[] = [];
    const evidenceIndicators = LOGICAL_MARKERS.evidence;

    for (const sentence of sentences) {
      const type = this.classify(sentence.text, evidenceIndicators);
      if (type) {
        evidence.push({
          text: sentence.text,
          sentenceIndex: sentence.index,
          type,
        });
      }
    }

    return evidence;
  }

  private classify(
    text: string,
    indicators: string[],
  ): Evidence['type'] | null {
    if (/\d+(\.\d+)?\s*%/.test(text)) return 'statistic';
    if (/\d+\s*(คน|ราย|ครั้ง|ปี|เปอร์เซ็นต์|ล้าน|พัน|แสก)/.test(text)) return 'statistic';
    if (indicators.some((i) => text.includes(i)) || /ตัวอย่าง/.test(text)) return 'example';
    if (/(ผู้เชี่ยวชาญ|นักวิทยาศาสตร์|ศาสตราจารย์|นักวิจัย|แพทย์|หมอ|รายงาน)/.test(text)) {
      return 'authority';
    }
    if (/["""'']/.test(text)) return 'quote';
    if (/(เหมือน|เปรียบเหมือน|เปรียบได้กับ|ดังเช่น|คล้ายกับ)/.test(text)) return 'analogy';
    return null;
  }
}

// ===== Argument Parser =====
const STOP_WORDS = new Set([
  'ของ', 'และ', 'หรือ', 'ที่', 'ใน', 'มี', 'เป็น', 'ไม่', 'ก็', 'จะ',
  'ได้', 'ให้', 'กับ', 'แต่', 'จึง', 'นี้', 'นั้น', 'อย่าง', 'ทุก', 'เพราะ',
  'เพื่อ', 'โดย', 'จาก', 'ซึ่ง', 'เมื่อ', 'เขา', 'เรา', 'คุณ', 'ฉัน',
  'ผม', 'มัน', 'มาก', 'น้อย', 'ไป', 'มา', 'อยู่', 'ทำ', 'พบ', 'เห็น',
  'ถ้า', 'หาก', 'ก็เลย', 'อาจ', 'คง', 'น่า', 'ควร', 'ต้อง', 'ส่วน',
  'ทั้ง', 'บาง', 'อีก', 'ยัง', 'จะ', 'ว่า', 'แล้ว', 'ต่อ', 'ใน',
]);

export class ArgumentParser {
  private premiseExtractor = new PremiseExtractor();
  private conclusionExtractor = new ConclusionExtractor();
  private evidenceExtractor = new EvidenceExtractor();

  parse(sentences: Sentence[]): ArgumentStructure {
    const premises = this.premiseExtractor.extract(sentences);
    const conclusion = this.conclusionExtractor.extract(sentences);
    const evidence = this.evidenceExtractor.extract(sentences);
    const claims = this.extractClaims(sentences);
    const topicKeywords = this.extractTopicKeywords(sentences, conclusion);

    return {
      premises,
      conclusion,
      evidence,
      claims,
      topicKeywords,
    };
  }

  private extractClaims(sentences: Sentence[]): string[] {
    const claims: string[] = [];
    const claimPattern = /(เห็นว่า|คิดว่า|เชื่อว่า|สมควร|ควร|ต้อง|ไม่ควร|จำเป็น|เป็นสิ่งที่|เป็นการ)/;
    for (const s of sentences) {
      if (claimPattern.test(s.text) && !claims.includes(s.text)) {
        claims.push(s.text);
      }
    }
    return claims;
  }

  private extractTopicKeywords(sentences: Sentence[], conclusion: { text: string } | null): string[] {
    const freq = new Map<string, number>();
    const allText = sentences.map((s) => s.text).join(' ');
    const thaiWords = allText.match(/[ก-๛]{2,6}/g) ?? [];
    for (const w of thaiWords) {
      if (STOP_WORDS.has(w)) continue;
      if (w.length < 2) continue;
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted
      .filter(([, c]) => c >= 1)
      .slice(0, 8)
      .map(([w]) => w)
      .filter((w) => w.length >= 3);

    if (conclusion) {
      const conclWords = conclusion.text.match(/[ก-๛]{3,6}/g) ?? [];
      for (const w of conclWords) {
        if (!STOP_WORDS.has(w) && !top.includes(w)) top.push(w);
      }
    }

    return top.slice(0, 6);
  }
}
