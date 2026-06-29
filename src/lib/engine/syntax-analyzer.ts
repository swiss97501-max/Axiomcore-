// AxiomCore Engine - Syntax Analyzer
// ตัววิเคราะห์วากยสัมพันธ์: แบ่งประโยคและแยกคำสำหรับภาษาไทย

import type { Sentence, Token } from './types';

// ตัวคั่นประโยคในภาษาไทยและสากล
const SENTENCE_DELIMITERS = /([.!?。！？\n]+)/g;

// มาร์กเกอร์เชิงตรรกะในภาษาไทย
const LOGICAL_MARKERS: Record<string, string[]> = {
  premise: [
    'เพราะ', 'เนื่องจาก', 'เพราะว่า', 'ด้วยเหตุว่า', 'ก็เพราะ', 'ที่ว่า',
    'เนื่องจากว่า', 'ดังที่', 'เช่นที่', 'จากที่', 'โดย', 'เพราะฉะนั้น',
    'จากการที่', 'ในเมื่อ', 'ตลอดจน',
  ],
  conclusion: [
    'ดังนั้น', 'ฉะนั้น', 'เพราะฉะนั้น', 'สรุปแล้ว', 'สรุปได้ว่า', 'ดังนั้นจึง',
    'จึง', 'ก็เลย', 'ในที่สุด', 'แสดงว่า', 'แปลว่า', 'หมายความว่า',
    'จึงกล่าวได้ว่า', 'นั่นคือ', 'กล่าวคือ', 'เป็นไปได้ว่า', 'อาจกล่าวได้ว่า',
  ],
  contrast: [
    'แต่', 'อย่างไรก็ตาม', 'ทว่า', 'มิหรือ', 'ตรงกันข้าม', 'ในขณะที่',
    'ขณะที่', 'ถึงแม้', 'แม้ว่า', 'ทั้งที่', 'ต่างจาก', 'ไม่เหมือน',
  ],
  condition: [
    'ถ้า', 'หาก', 'ถ้าหาก', 'ในกรณีที่', 'เมื่อ', 'ก็ต่อเมื่อ', 'ตราบใดที่',
  ],
  evidence: [
    'ตัวอย่างเช่น', 'เช่น', 'อย่างเช่น', 'เห็นได้จาก', 'จากการศึกษา',
    'จากข้อมูล', 'ตามที่', 'อ้างอิงจาก', 'จากรายงาน', 'จากสถิติ',
  ],
};

const PUNCT_PATTERN = /[.,;:!?。！？"'“”‘’()()\[\]{}—–\-…]/;
const NUMBER_PATTERN = /^[0-9]+([.,][0-9]+)?%?$/;

export class SyntaxAnalyzer {
  /**
   * แบ่งข้อความออกเป็นประโยคย่อย
   */
  splitSentences(text: string): Sentence[] {
    const normalized = text.replace(/\r\n/g, '\n').trim();
    if (!normalized) return [];

    // แบ่งตามตัวคั่น แต่เก็บตัวคั่นไว้ด้วย
    const parts = normalized.split(SENTENCE_DELIMITERS).filter((p) => p.length > 0);

    const sentences: Sentence[] = [];
    let current = '';
    let cursor = 0;
    let sentenceIndex = 0;

    for (const part of parts) {
      if (/^[.!?。！？\n]+$/.test(part)) {
        current += part;
        if (current.trim()) {
          const trimmed = current.trim();
          const start = normalized.indexOf(trimmed, cursor);
          const end = start + trimmed.length;
          sentences.push(this.buildSentence(trimmed, sentenceIndex, start >= 0 ? start : cursor, end));
          if (start >= 0) cursor = end;
          sentenceIndex++;
        }
        current = '';
      } else {
        current += part;
      }
    }
    if (current.trim()) {
      const trimmed = current.trim();
      const start = normalized.indexOf(trimmed, cursor);
      const end = (start >= 0 ? start : cursor) + trimmed.length;
      sentences.push(this.buildSentence(trimmed, sentenceIndex, start >= 0 ? start : cursor, end));
    }

    return sentences;
  }

  private buildSentence(text: string, index: number, start: number, end: number): Sentence {
    const tokens = this.tokenize(text);
    const indicators = this.findIndicators(text);
    const role = this.inferRole(text, indicators);
    return { text, index, start, end, tokens, role, indicators };
  }

  /**
   * แยกคำ (tokenize) สำหรับภาษาไทยและอังกฤษ
   */
  tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    // แยกโดยใช้รูปแบบ: ช่องว่าง หรือเครื่องหมายวรรคตอน แต่เก็บคำไทยติดกัน
    const regex = /([A-Za-z]+|[0-9]+(?:[.,][0-9]+)?%?|[ก-๛]+|[^\sA-Za-z0-9ก-๛])/g;
    let match: RegExpExecArray | null;
    let idx = 0;
    while ((match = regex.exec(text)) !== null) {
      const t = match[0];
      let type: Token['type'] = 'word';
      if (PUNCT_PATTERN.test(t)) type = 'punct';
      else if (NUMBER_PATTERN.test(t)) type = 'number';
      else if (this.isMarker(t)) type = 'marker';
      tokens.push({ text: t, index: idx++, type });
    }
    return tokens;
  }

  private isMarker(word: string): boolean {
    for (const list of Object.values(LOGICAL_MARKERS)) {
      if (list.includes(word)) return true;
    }
    return false;
  }

  private findIndicators(text: string): string[] {
    const found: string[] = [];
    for (const [category, list] of Object.entries(LOGICAL_MARKERS)) {
      for (const marker of list) {
        if (text.includes(marker)) {
          found.push(`${category}:${marker}`);
        }
      }
    }
    return found;
  }

  private inferRole(
    text: string,
    indicators: string[],
  ): Sentence['role'] {
    const hasPremise = indicators.some((i) => i.startsWith('premise:'));
    const hasConclusion = indicators.some((i) => i.startsWith('conclusion:'));
    const hasEvidence = indicators.some((i) => i.startsWith('evidence:'));

    if (hasEvidence) return 'evidence';
    if (hasConclusion) return 'conclusion';
    if (hasPremise) return 'premise';
    // ประโยคที่มีกริยาแสดงความเห็น ถือเป็น claim
    if (/(เห็นว่า|คิดว่า|เชื่อว่า|สมควร|ควร|ต้อง|ไม่ควร)/.test(text)) {
      return 'claim';
    }
    return 'unknown';
  }
}

export const LOGICAL_MARKERS_EXPORT = LOGICAL_MARKERS;
export { LOGICAL_MARKERS };
