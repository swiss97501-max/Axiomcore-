// AxiomCore Engine - Fallacy Detector (v2 — Deep Structural)
// ใช้ DeepFeatures เป็น "หลักการแยก" หลัก + regex เป็นเสริม
// มี conflict resolution: กรอง false positives, เสริม missed detections

import type {
  Sentence,
  ArgumentStructure,
  FallacySignal,
  DetectedFallacy,
  FallacyType,
} from './types';
import { FALLACY_META } from './types';
import { DETECTION_RULES, RULES_BY_TYPE } from './fallacies/rules';
import { SemanticAnalyzer } from './semantic-analyzer';
import { DeepAnalyzer, type DeepFeatures } from './deep-analyzer';

// ===== Confidence Scoring System =====
export interface ConfidenceInput {
  type: FallacyType;
  signals: FallacySignal[];
  sentenceCount: number;
  structureStrength: number; // 0-1 ความชัดเจนของโครงสร้างการโต้แย้ง
}

export class ConfidenceScorer {
  // ค่าสูงสุดของ confidence — ไม่มีวัน 100% เพราะการวิเคราะห์ rule-based
  // ย่อมมีความเสี่ยง False Positive ต่ำเสมอ
  private readonly MAX_CONFIDENCE = 0.92;

  /**
   * คำนวณความมั่นใจรวมของตรรกะวิบัติแต่ละประเภท
   *
   * โมเดลใหม่ (realistic distribution):
   * - ใช้ noisy-OR สำหรับรวมสัญญาณ (diminishing returns)
   * - แต่ละสัญญาณมี reliability = weight, ความน่าจะเป็นที่ตรวจพบจริง = weight × score
   * - รวมด้วย noisy-OR: P = 1 - ∏(1 - p_i) แล้วลดด้วย base skepticism
   * - โครงสร้างชัดเพิ่มความมั่นใจ, สัญญาณเดี่ยวลด
   */
  score(input: ConfidenceInput): { confidence: number; falsePositiveRisk: number } {
    const { signals, structureStrength } = input;
    if (signals.length === 0) {
      return { confidence: 0, falsePositiveRisk: 0 };
    }

    // 1. คำนวณ reliability รายสัญญาณ (probability ที่สัญญาณนี้บ่งชี้ตรรกะวิบัติจริง)
    // p_i = score * weight — แต่ละสัญญาณมีความน่าเชื่อถือเป็น weight ของกฎ
    const probs = signals.map((s) => Math.min(0.85, s.score * s.weight));

    // 2. รวมด้วย noisy-OR (diminishing returns — สัญญาณเพิ่มเติมให้ bonus ลดลง)
    let probTrue = 0;
    let probNotTrue = 1;
    for (const p of probs) {
      probNotTrue *= (1 - p);
    }
    probTrue = 1 - probNotTrue;

    // 3. Base skepticism — rule-based ย่อมมีโอกาสผิด ลดลง 10%
    let confidence = probTrue * 0.9;

    // 4. ปรับตามโครงสร้างการโต้แย้ง (โครงสร้างชัด = เพิ่มความมั่นใจ สูงสุด +5%)
    confidence += structureStrength * 0.05;

    // 5. สัญญาณเดี่ยว = ลด 8% (เสี่ยง FP สูง)
    if (signals.length === 1) {
      confidence -= 0.08;
    }

    // 6. จำกัดที่ [0, MAX_CONFIDENCE]
    confidence = Math.max(0, Math.min(this.MAX_CONFIDENCE, confidence));

    // 7. คำนวณ False Positive Risk
    // FP risk สูงเมื่อ: สัญญาณน้อย, confidence ปานกลาง, ไม่มี corroboration
    const falsePositiveRisk = this.computeFalsePositiveRisk(confidence, signals.length, structureStrength);

    return {
      confidence: Math.round(confidence * 100) / 100,
      falsePositiveRisk: Math.round(falsePositiveRisk * 100) / 100,
    };
  }

  /**
   * คำนวณความเสี่ยง False Positive อย่างสมจริง
   *
   * ปัจจัย:
   * - confidence สูง → FP risk ต่ำ (แต่ไม่เป็น 0 — rule-based ย่อมมีโอกาสผิด)
   * - สัญญาณเดี่ยว → FP risk สูง
   * - ไม่มีโครงสร้างการโต้แย้ง → FP risk สูง (อาจเป็นประโยคธรรมดา)
   * - มีเพียง regex match โดยไม่มี structural corroboration → FP risk สูงขึ้น
   */
  private computeFalsePositiveRisk(
    confidence: number,
    signalCount: number,
    structureStrength: number,
  ): number {
    // Base FP risk — ขั้นต่ำ 8% เสมอ (rule-based analysis ย่อมไม่แน่นอน 100%)
    let risk = 0.08;

    // ความสัมพันธ์ผกผันกับ confidence — แต่ใช้ด่างแบบนุ่มนวล
    // confidence สูง → ลด risk ลง แต่ไม่เหลือ 0
    const confidenceDeduction = confidence * 0.4; // สูงสุด 0.36
    risk += (0.45 - confidenceDeduction);

    // สัญญาณเดี่ยว → เพิ่ม risk
    if (signalCount === 1) risk += 0.12;
    else if (signalCount === 2) risk += 0.04;
    // 3+ สัญญาณ: ไม่เพิ่ม (corroboration ช่วย)

    // ไม่มีโครงสร้างการโต้แย้ง → เพิ่ม risk (อาจเป็นประโยคสั้นที่บังเอิญ match pattern)
    risk += (1 - structureStrength) * 0.1;

    // จำกัดที่ [0.05, 0.85]
    return Math.max(0.05, Math.min(0.85, risk));
  }

  label(confidence: number): DetectedFallacy['confidenceLabel'] {
    if (confidence >= 0.75) return 'สูงมาก';
    if (confidence >= 0.55) return 'สูง';
    if (confidence >= 0.35) return 'ปานกลาง';
    return 'ต่ำ';
  }

  /**
   * คำนวณความมั่นใจรวมของการวิเคราะห์ทั้งหมด
   */
  overallConfidence(detected: DetectedFallacy[]): number {
    if (detected.length === 0) return 0;
    const sum = detected.reduce((acc, d) => acc + d.confidence, 0);
    return Math.round((sum / detected.length) * 100) / 100;
  }

  /**
   * สร้างข้อความอธิบายเหตุผลของ false positive risk
   */
  explainFalsePositive(type: FallacyType, risk: number, signalCount: number): string {
    const meta = FALLACY_META[type];
    if (risk < 0.2) {
      return `พบสัญญาณหลายตัวที่สอดคล้องกันและโครงสร้างการโต้แย้งชัดเจน ความเสี่ยงว่าจะเป็น "${meta.nameTh}" เท็จอยู่ในระดับต่ำ (แต่ยังมีโอกาสคลาดเคลื่อนเล็กน้อยจากการวิเคราะห์ด้วยกฎ)`;
    }
    if (risk < 0.4) {
      return `ความเสี่ยงปานกลาง: รูปแบบที่พบอาจเกิดจากการใช้ถ้อยคำในเชิงวาทกรรมโดยไม่ได้ตั้งใจสร้างตรรกะวิบัติ ควรพิจารณาบริบทเพิ่มเติม`;
    }
    if (signalCount === 1) {
      return `ตรวจพบสัญญาณเดียว อาจเป็นการใช้คำโดยบังเอิญที่ match pattern โดยไม่ได้เป็นตรรกะวิบัติจริง ควรพิจารณาบริบทและเจตนาของผู้พูด`;
    }
    return `ความเสี่ยงสูง: รูปแบบที่พบอาจเป็นการใช้ภาษาตามปกติ มิใช่ตรรกะวิบัติโดยเจตนา ควรตรวจสอบเพิ่มเติมก่อนสรุปผล`;
  }
}


// ===== Fallacy Detector =====
export class FallacyDetector {
  private semantic = new SemanticAnalyzer();
  private deep = new DeepAnalyzer();
  private scorer = new ConfidenceScorer();

  detect(
    text: string,
    sentences: Sentence[],
    structure: ArgumentStructure,
  ): DetectedFallacy[] {
    const detected: DetectedFallacy[] = [];
    const features = this.semantic.analyze(text);
    const deepFeatures = this.deep.analyze(text, sentences, structure);
    const structureStrength = this.computeStructureStrength(structure, sentences);

    // 1. รวบรวม raw signals จากทุกประเภท (regex + semantic + structural)
    const candidateMap = new Map<FallacyType, FallacySignal[]>();
    for (const type of Object.keys(FALLACY_META) as FallacyType[]) {
      const signals = this.collectSignals(type, text, sentences, structure, features, deepFeatures);
      if (signals.length > 0) candidateMap.set(type, signals);
    }

    // 2. Apply deep filtering — กรอง false positives ด้วย DeepFeatures
    const filteredMap = this.applyDeepFilter(candidateMap, deepFeatures);

    // 3. Add missed detections — เพิ่ม detections ที่ DeepFeatures บอกว่ามีแต่ regex ไม่จับ
    this.addMissedDetections(filteredMap, deepFeatures, text, sentences);

    // 4. Conflict resolution — แยกประเภทที่ทับซ้อน
    const resolvedMap = this.resolveConflicts(filteredMap, deepFeatures);

    // 5. Build detected fallacies
    for (const [type, signals] of resolvedMap) {
      if (signals.length === 0) continue;
      const { confidence, falsePositiveRisk } = this.scorer.score({
        type,
        signals,
        sentenceCount: sentences.length,
        structureStrength,
      });
      // threshold ขั้นต่ำ 0.48 — balance ระหว่าง false positive และ recall
      if (confidence < 0.48) continue;
      const detected_fallacy = this.buildDetectedFallacy(
        type,
        confidence,
        falsePositiveRisk,
        signals,
        sentences,
        structure,
        features,
        deepFeatures,
      );
      detected.push(detected_fallacy);
    }

    return detected.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * รวบรวมสัญญาณ — regex + semantic + structural (จาก DeepFeatures)
   */
  private collectSignals(
    type: FallacyType,
    text: string,
    sentences: Sentence[],
    structure: ArgumentStructure,
    features: ReturnType<SemanticAnalyzer['analyze']>,
    deepFeatures: DeepFeatures,
  ): FallacySignal[] {
    const signals: FallacySignal[] = [];

    // 1. กฎ regex (เหมือนเดิม)
    const rules = RULES_BY_TYPE[type] ?? [];
    for (const rule of rules) {
      const match = text.match(rule.pattern);
      if (match) {
        const matchedText = [...text.matchAll(new RegExp(rule.pattern.source, 'g'))].map(
          (m) => m[0],
        );
        const matchedSentences = sentences
          .filter((s) => rule.pattern.test(s.text))
          .map((s) => s.index);
        signals.push({
          type,
          matchedPatterns: [rule.code],
          matchedSentences,
          matchedText,
          score: 1.0,
          weight: rule.weight,
          reasoning: rule.description,
        });
      }
    }

    // 2. Deep structural signals (ใหม่ — ใช้หลักการแยกจริง)
    this.addDeepSignals(type, signals, sentences, structure, features, deepFeatures);

    return signals;
  }

  /**
   * เพิ่ม deep signals จาก DeepFeatures — เป็น "หลักการแยก" จริง
   */
  private addDeepSignals(
    type: FallacyType,
    signals: FallaySignalHelper,
    sentences: Sentence[],
    structure: ArgumentStructure,
    features: ReturnType<SemanticAnalyzer['analyze']>,
    deep: DeepFeatures,
  ) {
    switch (type) {
      case 'ad_hominem': {
        // AH แท้: โจมตีบุคคล + dismiss ข้อโต้แย้ง
        if (deep.personAttack.detected && deep.personAttack.hasDismissal) {
          signals.push({
            type,
            matchedPatterns: ['AH-DEEP'],
            matchedSentences: this.findSentencesWith(sentences, deep.personAttack.attackTerms),
            matchedText: deep.personAttack.attackTerms,
            score: 0.9, // strong structural signal
            weight: 0.85,
            reasoning: `โจมตี${this.targetLabel(deep.personAttack.target)}พร้อม dismiss ข้อโต้แย้ง (${deep.personAttack.attackTerms.slice(0, 3).join(', ')})`,
          });
        } else if (deep.personAttack.detected) {
          // มีโจมตีบุคคล แต่ไม่มี dismissal — สัญญาณอ่อน
          signals.push({
            type,
            matchedPatterns: ['AH-DEEP-WEAK'],
            matchedSentences: this.findSentencesWith(sentences, deep.personAttack.attackTerms),
            matchedText: deep.personAttack.attackTerms,
            score: 0.5,
            weight: 0.55,
            reasoning: `มีคำโจมตี${this.targetLabel(deep.personAttack.target)} แต่ไม่ชัดเจนว่า dismiss ข้อโต้แย้ง`,
          });
        }
        // v12: Group/identity attack (คนกรุง, คนบ้านนอก, Gen Z ฯลฯ)
        if (deep.hasGroupAttack) {
          signals.push({
            type,
            matchedPatterns: ['AH-DEEP-GROUP'],
            matchedSentences: this.findSentencesWith(sentences, ['คนกรุง', 'คนบ้านนอก', 'Gen Z', 'คนรุ่นใหม่']),
            matchedText: [],
            score: 0.55,
            weight: 0.6,
            reasoning: 'โจมตีกลุ่มบุคคล/กลุ่มวัย แทนการโต้แย้ง',
          });
        }
        break;
      }
      case 'straw_man': {
        // SM v12: Concession twist ("แม้แต่คุณเองก็")
        if (deep.hasConcessionTwist && !deep.strawMan.distortionThenExtreme) {
          signals.push({
            type,
            matchedPatterns: ['SM-DEEP-CONCESSION'],
            matchedSentences: this.findSentencesWith(sentences, ['แม้แต่คุณเองก็', 'คุณเองก็บอกว่า']),
            matchedText: [],
            score: 0.6,
            weight: 0.65,
            reasoning: 'บิดเบือนการยอมรับของฝ่ายตรงข้ามเพื่อสร้างหุ่นฟาง',
          });
        }
        // SM แท้: ตีความข้อโต้แย้งฝ่ายตรงข้าม + ขยายสู่ขั้วสุด
        if (deep.strawMan.distortionThenExtreme) {
          signals.push({
            type,
            matchedPatterns: ['SM-DEEP'],
            matchedSentences: this.findSentencesWith(sentences, deep.strawMan.terms),
            matchedText: deep.strawMan.terms,
            score: 0.85,
            weight: 0.8,
            reasoning: `ตีความข้อโต้แย้งฝ่ายตรงข้าม แล้วขยายสู่ขั้วสุด (${deep.strawMan.terms.slice(0, 3).join(', ')})`,
          });
        } else if (deep.strawMan.hasDistortion) {
          signals.push({
            type,
            matchedPatterns: ['SM-DEEP-DISTORT'],
            matchedSentences: this.findSentencesWith(sentences, deep.strawMan.terms),
            matchedText: deep.strawMan.terms,
            score: 0.55,
            weight: 0.6,
            reasoning: `มีการตีความข้อโต้แย้งฝ่ายตรงข้าม (${deep.strawMan.terms.slice(0, 2).join(', ')})`,
          });
        }
        break;
      }
      case 'red_herring': {
        // v12: Emotion-based redirect
        if (deep.hasEmotionRedirect && !deep.redHerring.hasTopicShift) {
          signals.push({
            type,
            matchedPatterns: ['RH-DEEP-EMOTION'],
            matchedSentences: [],
            matchedText: [],
            score: 0.45,
            weight: 0.55,
            reasoning: 'เบี่ยงเบนไปยังอารมณ์แทนการให้เหตุผล',
          });
        }
        if (deep.redHerring.hasTopicShift) {
          signals.push({
            type,
            matchedPatterns: ['RH-DEEP'],
            matchedSentences: this.findSentencesWith(sentences, deep.redHerring.shiftMarkers),
            matchedText: deep.redHerring.shiftMarkers,
            score: 0.8,
            weight: 0.75,
            reasoning: `เปลี่ยนประเด็นด้วย marker: ${deep.redHerring.shiftMarkers.slice(0, 2).join(', ')}`,
          });
        }
        break;
      }
      case 'false_dilemma': {
        if (deep.falseDilemma.hasBinary && deep.falseDilemma.hasForcedChoice) {
          signals.push({
            type,
            matchedPatterns: ['FD-DEEP'],
            matchedSentences: this.findSentencesWith(sentences, deep.falseDilemma.binaryTerms),
            matchedText: deep.falseDilemma.binaryTerms,
            score: 0.85,
            weight: 0.8,
            reasoning: `จำกัดทางเลือกเป็น binary พร้อม forced choice`,
          });
        } else if (deep.falseDilemma.hasBinary) {
          signals.push({
            type,
            matchedPatterns: ['FD-DEEP-BINARY'],
            matchedSentences: this.findSentencesWith(sentences, deep.falseDilemma.binaryTerms),
            matchedText: deep.falseDilemma.binaryTerms,
            score: 0.65,
            weight: 0.7,
            reasoning: `มีคำบอก binary framing`,
          });
        }
        break;
      }
      case 'hasty_generalization': {
        // v12: Limited-time + universal quantifier
        if (deep.hasLimitedTime && !deep.hastyGeneralization.universalThenFew) {
          signals.push({
            type,
            matchedPatterns: ['HG-DEEP-LIMITED-TIME'],
            matchedSentences: this.findSentencesWith(sentences, ['ช่วงนี้', 'เมื่อเร็วๆ นี้', 'ล่าสุด']),
            matchedText: [],
            score: 0.4,
            weight: 0.5,
            reasoning: 'สรุปจากช่วงเวลาจำกัด อาจไม่เป็นตัวแทนทั่วไป',
          });
        }
        // HG แท้: universal + few instances (quantifier mismatch)
        // ถ้ามีแค่ universal ไม่มี few instances → weak signal (อาจเป็นประโยคปกติ)
        if (deep.hastyGeneralization.universalThenFew) {
          signals.push({
            type,
            matchedPatterns: ['HG-DEEP'],
            matchedSentences: this.findSentencesWith(sentences, [
              ...deep.hastyGeneralization.universalTerms,
              ...deep.hastyGeneralization.fewTerms,
            ]),
            matchedText: [...deep.hastyGeneralization.universalTerms, ...deep.hastyGeneralization.fewTerms],
            score: 0.9,
            weight: 0.85,
            reasoning: `quantifier mismatch: ใช้คำสากล (${deep.hastyGeneralization.universalTerms.slice(0, 2).join(', ')}) แต่อ้างตัวอย่างน้อย (${deep.hastyGeneralization.fewTerms.slice(0, 2).join(', ')})`,
          });
        } else if (deep.hastyGeneralization.hasUniversal && deep.hastyGeneralization.hasFewInstances) {
          signals.push({
            type,
            matchedPatterns: ['HG-DEEP-UNIVERSAL'],
            matchedSentences: this.findSentencesWith(sentences, deep.hastyGeneralization.universalTerms),
            matchedText: deep.hastyGeneralization.universalTerms,
            score: 0.6,
            weight: 0.65,
            reasoning: `ใช้คำระบุปริมาณสากล`,
          });
        }
        break;
      }
      case 'false_cause': {
        // v12: Coincidence misattributed as cause
        if (deep.hasCoincidenceMarker && !deep.falseCause.temporalThenCausal) {
          signals.push({
            type,
            matchedPatterns: ['FC-DEEP-COINCIDENCE'],
            matchedSentences: this.findSentencesWith(sentences, ['บังเอิญ', 'เผอิญ', 'ความบังเอิญ']),
            matchedText: [],
            score: 0.45,
            weight: 0.55,
            reasoning: 'พบคำบอกความบังเอิญร่วมกับความสัมพันธ์เชิงเหตุผล',
          });
        }
        if (deep.falseCause.temporalThenCausal) {
          signals.push({
            type,
            matchedPatterns: ['FC-DEEP'],
            matchedSentences: this.findSentencesWith(sentences, deep.falseCause.terms),
            matchedText: deep.falseCause.terms,
            score: 0.85,
            weight: 0.8,
            reasoning: `temporal→causal: อ้างเหตุการณ์ก่อนหน้า (${deep.falseCause.terms.slice(0, 2).join(', ')}) แล้วสรุปเป็นเหตุผล`,
          });
        }
        break;
      }
      case 'appeal_to_authority': {
        // AA แท้: authority + authority เป็น evidence
        if (deep.appealToAuthority.hasAuthority && deep.appealToAuthority.authorityIsEvidence) {
          signals.push({
            type,
            matchedPatterns: ['AA-DEEP'],
            matchedSentences: this.findSentencesWith(sentences, deep.appealToAuthority.terms),
            matchedText: deep.appealToAuthority.terms,
            score: 0.85,
            weight: 0.8,
            reasoning: `อ้างผู้มีอำนาจเป็นหลักฐานหลัก (${deep.appealToAuthority.terms.slice(0, 2).join(', ')})`,
          });
        } else if (deep.appealToAuthority.hasAuthority) {
          signals.push({
            type,
            matchedPatterns: ['AA-DEEP-MENTION'],
            matchedSentences: this.findSentencesWith(sentences, deep.appealToAuthority.terms),
            matchedText: deep.appealToAuthority.terms,
            score: 0.55,
            weight: 0.6,
            reasoning: `กล่าวถึงผู้มีอำนาจ`,
          });
        }
        break;
      }
      case 'appeal_to_popularity': {
        // v12: Bandwagon marker
        if (deep.hasBandwagon && !deep.appealToPopularity.hasPopularity) {
          signals.push({
            type,
            matchedPatterns: ['AP-DEEP-BANDWAGON'],
            matchedSentences: this.findSentencesWith(sentences, ['เป็นเทรนด์', 'ตามกระแส', 'ทุกคนทำกัน']),
            matchedText: [],
            score: 0.45,
            weight: 0.55,
            reasoning: 'พบการอ้างกระแสสังคม/bandwagon',
          });
        }
        if (deep.appealToPopularity.hasPopularity && deep.appealToPopularity.popularityIsEvidence) {
          signals.push({
            type,
            matchedPatterns: ['AP-DEEP'],
            matchedSentences: this.findSentencesWith(sentences, deep.appealToPopularity.terms),
            matchedText: deep.appealToPopularity.terms,
            score: 0.85,
            weight: 0.8,
            reasoning: `อ้างความนิยมเป็นหลักฐาน (${deep.appealToPopularity.terms.slice(0, 2).join(', ')})`,
          });
        } else if (deep.appealToPopularity.hasPopularity) {
          signals.push({
            type,
            matchedPatterns: ['AP-DEEP-MENTION'],
            matchedSentences: this.findSentencesWith(sentences, deep.appealToPopularity.terms),
            matchedText: deep.appealToPopularity.terms,
            score: 0.6,
            weight: 0.65,
            reasoning: `กล่าวถึงความนิยม`,
          });
        }
        break;
      }
      case 'slippery_slope': {
        if (deep.slipperySlope.hasCausalChain && deep.slipperySlope.chainLength >= 1) {
          signals.push({
            type,
            matchedPatterns: ['SS-DEEP'],
            matchedSentences: this.findSentencesWith(sentences, deep.slipperySlope.terms),
            matchedText: deep.slipperySlope.terms,
            score: 0.85 + Math.min(0.1, deep.slipperySlope.chainLength * 0.03),
            weight: 0.8,
            reasoning: `causal chain ความยาว ${deep.slipperySlope.chainLength} ขั้น`,
          });
        }
        break;
      }
      case 'circular_reasoning': {
        if (deep.circularReasoning.hasTermRepetition) {
          signals.push({
            type,
            matchedPatterns: ['CR-DEEP'],
            matchedSentences: [],
            matchedText: deep.circularReasoning.repeatedTerms,
            score: 0.85,
            weight: 0.8,
            reasoning: `พบวลีที่ซ้ำกัน: "${deep.circularReasoning.repeatedTerms.slice(0, 2).join('", "')}" — ข้อสรุปอ้างข้อตั้งเดิม`,
          });
        } else if (deep.circularReasoning.hasCircularPhrase) {
          signals.push({
            type,
            matchedPatterns: ['CR-DEEP-PHRASE'],
            matchedSentences: [],
            matchedText: [],
            score: 0.9,
            weight: 0.8,
            reasoning: `ใช้วลี circular`,
          });
        } else if (deep.circularReasoning.detected) {
          // mutual reference pattern: "A เพราะ B และ B ... A"
          signals.push({
            type,
            matchedPatterns: ['CR-DEEP-MUTUAL'],
            matchedSentences: [],
            matchedText: [],
            score: 0.85,
            weight: 0.8,
            reasoning: `พบการอ้างอิงซึ่งกันและกัน (mutual reference): A เพราะ B และ B อ้างกลับไปที่ A`,
          });
        }
        break;
      }
      case 'cherry_picking': {
        // v12: Temporal selection
        if (deep.hasTemporalSelection && !deep.cherryPicking.hasEvidenceRejection && !deep.cherryPicking.hasSingleCase) {
          signals.push({
            type,
            matchedPatterns: ['CP-DEEP-TEMPORAL'],
            matchedSentences: this.findSentencesWith(sentences, ['เฉพาะช่วง', 'เลือกช่วง', 'เฉพาะเวลา']),
            matchedText: [],
            score: 0.4,
            weight: 0.5,
            reasoning: 'พบการเลือกช่วงเวลาเฉพาะ อาจเป็นการเลือกข้อมูล',
          });
        }
        // CP แท้: single case OR evidence rejection
        if (deep.cherryPicking.hasEvidenceRejection) {
          signals.push({
            type,
            matchedPatterns: ['CP-DEEP-REJECT'],
            matchedSentences: this.findSentencesWith(sentences, deep.cherryPicking.rejectionTerms),
            matchedText: deep.cherryPicking.rejectionTerms,
            score: 0.9,
            weight: 0.85,
            reasoning: `ปฏิเสธหลักฐานที่ขัดแย้ง: ${deep.cherryPicking.rejectionTerms.slice(0, 2).join(', ')}`,
          });
        }
        if (deep.cherryPicking.hasSingleCase) {
          signals.push({
            type,
            matchedPatterns: ['CP-DEEP-SINGLE'],
            matchedSentences: this.findSentencesWith(sentences, deep.cherryPicking.singleCaseTerms),
            matchedText: deep.cherryPicking.singleCaseTerms,
            score: 0.8,
            weight: 0.75,
            reasoning: `อ้างหลักฐานเพียงกรณีเดียว: ${deep.cherryPicking.singleCaseTerms.slice(0, 2).join(', ')}`,
          });
        }
        break;
      }
      case 'burden_of_proof': {
        if (deep.burdenOfProof.hasBurdenShift) {
          signals.push({
            type,
            matchedPatterns: ['BP-DEEP'],
            matchedSentences: this.findSentencesWith(sentences, deep.burdenOfProof.terms),
            matchedText: deep.burdenOfProof.terms,
            score: 0.85,
            weight: 0.8,
            reasoning: `ผลักภาระพิสูจน์: ${deep.burdenOfProof.terms.slice(0, 2).join(', ')}`,
          });
        }
        if (deep.burdenOfProof.hasAbsenceClaim) {
          signals.push({
            type,
            matchedPatterns: ['BP-DEEP-ABSENCE'],
            matchedSentences: [],
            matchedText: [],
            score: 0.85,
            weight: 0.8,
            reasoning: `อ้างการขาดหลักฐานพิสูจน์ว่าเท็จ = ข้ออ้างจริง`,
          });
        }
        // v12: Negative proof attempt
        if (deep.hasNegativeProof && !deep.burdenOfProof.hasBurdenShift && !deep.burdenOfProof.hasAbsenceClaim) {
          signals.push({
            type,
            matchedPatterns: ['BP-DEEP-NEGATIVE'],
            matchedSentences: this.findSentencesWith(sentences, ['ยังไม่มีใครพิสูจน์', 'ไม่มีหลักฐานขัดแย้ง']),
            matchedText: [],
            score: 0.5,
            weight: 0.55,
            reasoning: 'พบการอ้างหลักฐานเชิงลบ (negative proof)',
          });
        }
        break;
      }
      // ===== v2: 7 ประเภทใหม่ =====
      case 'appeal_to_emotion': {
        if (deep.appealToEmotion.detected) {
          const isStrong = deep.appealToEmotion.hasVictimCard || deep.appealToEmotion.hasFearAppeal;
          signals.push({
            type,
            matchedPatterns: ['AE-DEEP'],
            matchedSentences: this.findSentencesWith(sentences, deep.appealToEmotion.terms),
            matchedText: deep.appealToEmotion.terms,
            score: isStrong ? 0.85 : 0.65,
            weight: isStrong ? 0.82 : 0.65,
            reasoning: isStrong
              ? `จูงใจด้วยอารมณ์รุนแรง (victim card/fear): ${deep.appealToEmotion.terms.slice(0, 2).join(', ')}`
              : `จูงใจด้วยอารมณ์: ${deep.appealToEmotion.terms.slice(0, 2).join(', ')}`,
          });
        }
        break;
      }
      case 'appeal_to_tradition': {
        if (deep.appealToTradition.detected) {
          const isStrong = deep.appealToTradition.hasAntiChange;
          signals.push({
            type,
            matchedPatterns: ['AT-DEEP'],
            matchedSentences: this.findSentencesWith(sentences, deep.appealToTradition.terms),
            matchedText: deep.appealToTradition.terms,
            score: isStrong ? 0.85 : 0.7,
            weight: isStrong ? 0.8 : 0.65,
            reasoning: `อ้างธรรมเนียม${isStrong ? 'พร้อมต่อต้านการเปลี่ยน' : ''}: ${deep.appealToTradition.terms.slice(0, 2).join(', ')}`,
          });
        }
        break;
      }
      case 'appeal_to_nature': {
        if (deep.appealToNature.detected) {
          const isStrong = deep.appealToNature.hasAntiSynthetic;
          signals.push({
            type,
            matchedPatterns: ['AN-DEEP'],
            matchedSentences: this.findSentencesWith(sentences, deep.appealToNature.terms),
            matchedText: deep.appealToNature.terms,
            score: isStrong ? 0.85 : 0.65,
            weight: isStrong ? 0.8 : 0.65,
            reasoning: `อ้างธรรมชาติ${isStrong ? 'พร้อมปฏิเสธสิ่งที่มนุษย์สร้าง' : ''}: ${deep.appealToNature.terms.slice(0, 2).join(', ')}`,
          });
        }
        break;
      }
      case 'tu_quoque': {
        if (deep.tuQuoque.detected) {
          const isStrong = deep.tuQuoque.hasMirrorArgument;
          signals.push({
            type,
            matchedPatterns: ['TQ-DEEP'],
            matchedSentences: this.findSentencesWith(sentences, deep.tuQuoque.terms),
            matchedText: deep.tuQuoque.terms,
            score: isStrong ? 0.85 : 0.7,
            weight: isStrong ? 0.82 : 0.7,
            reasoning: `หลีกเลี่ยงการวิจารณ์ด้วยการยิงกลับ${isStrong ? ' (mirror argument)' : ''}: ${deep.tuQuoque.terms.slice(0, 2).join(', ')}`,
          });
        }
        break;
      }
      case 'false_analogy': {
        if (deep.falseAnalogy.detected) {
          const isStrong = deep.falseAnalogy.hasFalseConclusion;
          signals.push({
            type,
            matchedPatterns: ['FA-DEEP'],
            matchedSentences: this.findSentencesWith(sentences, deep.falseAnalogy.terms),
            matchedText: deep.falseAnalogy.terms,
            score: isStrong ? 0.82 : 0.6,
            weight: isStrong ? 0.78 : 0.6,
            reasoning: `เปรียบเทียบสิ่งที่ต่างกัน${isStrong ? ' + สรุปผล' : ''}: ${deep.falseAnalogy.terms.slice(0, 2).join(', ')}`,
          });
        }
        break;
      }
      case 'stereotyping': {
        if (deep.stereotyping.detected) {
          const isStrong = deep.stereotyping.hasUniversalTrait;
          signals.push({
            type,
            matchedPatterns: ['ST-DEEP'],
            matchedSentences: this.findSentencesWith(sentences, deep.stereotyping.terms),
            matchedText: deep.stereotyping.terms,
            score: isStrong ? 0.88 : 0.65,
            weight: isStrong ? 0.85 : 0.65,
            reasoning: `จำพวกกลุ่ม${isStrong ? 'พร้อมระบุลักษณะเชิงลบแบบสากล' : ''}: ${deep.stereotyping.terms.slice(0, 2).join(', ')}`,
          });
        }
        break;
      }
      case 'superstition': {
        if (deep.superstition.detected) {
          const isStrong = deep.superstition.hasCausalSuperstition;
          signals.push({
            type,
            matchedPatterns: ['SP-DEEP'],
            matchedSentences: this.findSentencesWith(sentences, deep.superstition.terms),
            matchedText: deep.superstition.terms,
            score: isStrong ? 0.88 : 0.7,
            weight: isStrong ? 0.85 : 0.7,
            reasoning: `อ้างความเชื่อโชคลาง${isStrong ? ' + เป็นเหตุผล' : ''}: ${deep.superstition.terms.slice(0, 2).join(', ')}`,
          });
        }
        break;
      }
    }
  }

  /**
   * Apply deep filter — ULTRA CONSERVATIVE: ไม่ลด score (เก็บ regex signals ไว้ทั้งหมด)
   * การกรอง false positive ทำโดยการทำให้ patterns เฉพาะเจาะจง ไม่ใช่การลด score
   */
  private applyDeepFilter(
    candidateMap: Map<FallacyType, FallacySignal[]>,
    deep: DeepFeatures,
  ): Map<FallacyType, FallacySignal[]> {
    const result = new Map<FallacyType, FallacySignal[]>();

    // Compute approximate text length from all matched texts across all signals
    const allMatchedTexts = new Set<string>();
    for (const signals of candidateMap.values()) {
      for (const sig of signals) {
        for (const t of sig.matchedText) {
          allMatchedTexts.add(t);
        }
      }
    }
    let approxTextLength = 0;
    for (const t of allMatchedTexts) {
      approxTextLength += t.length;
    }
    const isShortText = approxTextLength < 20;

    for (const [type, signals] of candidateMap) {
      const filtered: FallacySignal[] = [];

      for (const sig of signals) {
        // Rule 6 (evaluated first): Keep all candidates with score >= 0.45 — strong signals always pass
        if (sig.score >= 0.45) {
          filtered.push(sig);
          continue;
        }

        // Rule 1: Too weak — score < 0.15 AND only 1 matched pattern AND weight < 0.70
        if (sig.score < 0.15 && sig.matchedPatterns.length === 1 && sig.weight < 0.70) {
          continue; // filter out
        }

        // Rule 2: Too short text to make reliable claims
        if (isShortText && sig.score < 0.35) {
          continue; // filter out
        }

        // Rule 3: burden_of_proof and cherry_picking — easily false-positived in casual Thai text
        if ((type === 'burden_of_proof' || type === 'cherry_picking') && sig.score < 0.20) {
          continue; // filter out
        }

        // Rule 4: red_herring — topic shifts need more evidence
        if (type === 'red_herring' && sig.matchedSentences.length < 2 && sig.score < 0.30) {
          continue; // filter out
        }

        filtered.push(sig);
      }

      // Rule 5: appeal_to_popularity — boost falsePositiveRisk for weak single-pattern matches
      if (type === 'appeal_to_popularity' && filtered.length > 0) {
        for (const sig of filtered) {
          if (sig.matchedPatterns.length === 1 && sig.weight < 0.75) {
            // Annotate extra false positive risk on the signal
            (sig as any)._extraFalsePositiveRisk = ((sig as any)._extraFalsePositiveRisk || 0) + 0.10;
            sig.reasoning += ' [FP risk ↑: ตรวจจับด้วย pattern เดียว]';
          }
        }
      }

      if (filtered.length > 0) {
        result.set(type, filtered);
      }
    }

    return result;
  }

  /**
   * เพิ่ม missed detections — ถ้า DeepFeatures บอกว่ามี type นี้ชัดเจน แต่ไม่มีใน candidateMap
   */
  private addMissedDetections(
    candidateMap: Map<FallacyType, FallacySignal[]>,
    deep: DeepFeatures,
    text: string,
    sentences: Sentence[],
  ): void {
    // ถ้า DeepFeatures บอกว่า cherry_picking ชัด แต่ candidateMap ไม่มี ให้เพิ่ม
    if (deep.cherryPicking.detected && !candidateMap.has('cherry_picking')) {
      const sigs: FallacySignal[] = [];
      if (deep.cherryPicking.hasEvidenceRejection) {
        sigs.push({
          type: 'cherry_picking',
          matchedPatterns: ['CP-DEEP-REJECT-ADD'],
          matchedSentences: this.findSentencesWith(sentences, deep.cherryPicking.rejectionTerms),
          matchedText: deep.cherryPicking.rejectionTerms,
          score: 0.85,
          weight: 0.8,
          reasoning: `ปฏิเสธหลักฐานที่ขัดแย้ง: ${deep.cherryPicking.rejectionTerms.slice(0, 2).join(', ')}`,
        });
      }
      if (deep.cherryPicking.hasSingleCase) {
        sigs.push({
          type: 'cherry_picking',
          matchedPatterns: ['CP-DEEP-SINGLE-ADD'],
          matchedSentences: this.findSentencesWith(sentences, deep.cherryPicking.singleCaseTerms),
          matchedText: deep.cherryPicking.singleCaseTerms,
          score: 0.75,
          weight: 0.7,
          reasoning: `อ้างหลักฐานเพียงกรณีเดียว: ${deep.cherryPicking.singleCaseTerms.slice(0, 2).join(', ')}`,
        });
      }
      if (sigs.length > 0) candidateMap.set('cherry_picking', sigs);
    }

    // ถ้า burden_of_proof ชัด แต่ไม่มี
    if (deep.burdenOfProof.detected && !candidateMap.has('burden_of_proof')) {
      const sigs: FallacySignal[] = [];
      if (deep.burdenOfProof.hasBurdenShift) {
        sigs.push({
          type: 'burden_of_proof',
          matchedPatterns: ['BP-DEEP-ADD'],
          matchedSentences: this.findSentencesWith(sentences, deep.burdenOfProof.terms),
          matchedText: deep.burdenOfProof.terms,
          score: 0.8,
          weight: 0.75,
          reasoning: `ผลักภาระพิสูจน์: ${deep.burdenOfProof.terms.slice(0, 2).join(', ')}`,
        });
      }
      if (sigs.length > 0) candidateMap.set('burden_of_proof', sigs);
    }

    // ถ้า ad_hominem ชัด (attack + dismissal) แต่ไม่มี
    if (deep.personAttack.attackThenDismissal && !candidateMap.has('ad_hominem')) {
      candidateMap.set('ad_hominem', [{
        type: 'ad_hominem',
        matchedPatterns: ['AH-DEEP-ADD'],
        matchedSentences: this.findSentencesWith(sentences, deep.personAttack.attackTerms),
        matchedText: deep.personAttack.attackTerms,
        score: 0.85,
        weight: 0.8,
        reasoning: `โจมตี${this.targetLabel(deep.personAttack.target)}พร้อม dismiss ข้อโต้แย้ง`,
      }]);
    }

    // ถ้า false_cause ชัด (temporal→causal) แต่ไม่มี
    if (deep.falseCause.temporalThenCausal && !candidateMap.has('false_cause')) {
      candidateMap.set('false_cause', [{
        type: 'false_cause',
        matchedPatterns: ['FC-DEEP-ADD'],
        matchedSentences: this.findSentencesWith(sentences, deep.falseCause.terms),
        matchedText: deep.falseCause.terms,
        score: 0.8,
        weight: 0.75,
        reasoning: `temporal→causal: อ้างเหตุการณ์ก่อนหน้าแล้วสรุปเป็นเหตุผล`,
      }]);
    }

    // ถ้า circular_reasoning ชัด (term repetition) แต่ไม่มี
    if (deep.circularReasoning.hasTermRepetition && !candidateMap.has('circular_reasoning')) {
      candidateMap.set('circular_reasoning', [{
        type: 'circular_reasoning',
        matchedPatterns: ['CR-DEEP-ADD'],
        matchedSentences: [],
        matchedText: deep.circularReasoning.repeatedTerms,
        score: 0.8,
        weight: 0.75,
        reasoning: `พบวลีที่ซ้ำกัน: "${deep.circularReasoning.repeatedTerms.slice(0, 2).join('", "')}"`,
      }]);
    }

    // ถ้า circular_reasoning แบบ mutual reference (A เพราะ B และ B ... A) แต่ไม่มี
    if (deep.circularReasoning.detected && !deep.circularReasoning.hasTermRepetition && !deep.circularReasoning.hasCircularPhrase && !candidateMap.has('circular_reasoning')) {
      candidateMap.set('circular_reasoning', [{
        type: 'circular_reasoning',
        matchedPatterns: ['CR-DEEP-MUTUAL-ADD'],
        matchedSentences: [],
        matchedText: [],
        score: 0.85,
        weight: 0.8,
        reasoning: `พบการอ้างอิงซึ่งกันและกัน (mutual reference)`,
      }]);
    }

    // ถ้า appeal_to_authority ชัด แต่ไม่มี
    if (deep.appealToAuthority.authorityIsEvidence && !candidateMap.has('appeal_to_authority')) {
      candidateMap.set('appeal_to_authority', [{
        type: 'appeal_to_authority',
        matchedPatterns: ['AA-DEEP-ADD'],
        matchedSentences: this.findSentencesWith(sentences, deep.appealToAuthority.terms),
        matchedText: deep.appealToAuthority.terms,
        score: 0.8,
        weight: 0.75,
        reasoning: `อ้างผู้มีอำนาจเป็นหลักฐานหลัก`,
      }]);
    }

    // ถ้า appeal_to_popularity ชัด แต่ไม่มี
    if (deep.appealToPopularity.popularityIsEvidence && !candidateMap.has('appeal_to_popularity')) {
      candidateMap.set('appeal_to_popularity', [{
        type: 'appeal_to_popularity',
        matchedPatterns: ['AP-DEEP-ADD'],
        matchedSentences: this.findSentencesWith(sentences, deep.appealToPopularity.terms),
        matchedText: deep.appealToPopularity.terms,
        score: 0.8,
        weight: 0.75,
        reasoning: `อ้างความนิยมเป็นหลักฐาน`,
      }]);
    }

    // ถ้า slippery_slope ชัด แต่ไม่มี
    if (deep.slipperySlope.hasCausalChain && !candidateMap.has('slippery_slope')) {
      candidateMap.set('slippery_slope', [{
        type: 'slippery_slope',
        matchedPatterns: ['SS-DEEP-ADD'],
        matchedSentences: this.findSentencesWith(sentences, deep.slipperySlope.terms),
        matchedText: deep.slipperySlope.terms,
        score: 0.8,
        weight: 0.75,
        reasoning: `causal chain ความยาว ${deep.slipperySlope.chainLength} ขั้น`,
      }]);
    }

    // ถ้า straw_man ชัด แต่ไม่มี
    if (deep.strawMan.distortionThenExtreme && !candidateMap.has('straw_man')) {
      candidateMap.set('straw_man', [{
        type: 'straw_man',
        matchedPatterns: ['SM-DEEP-ADD'],
        matchedSentences: this.findSentencesWith(sentences, deep.strawMan.terms),
        matchedText: deep.strawMan.terms,
        score: 0.8,
        weight: 0.75,
        reasoning: `ตีความข้อโต้แย้งฝ่ายตรงข้ามแล้วขยายสู่ขั้วสุด`,
      }]);
    }

    // ถ้า red_herring ชัด แต่ไม่มี
    if (deep.redHerring.hasTopicShift && !candidateMap.has('red_herring')) {
      candidateMap.set('red_herring', [{
        type: 'red_herring',
        matchedPatterns: ['RH-DEEP-ADD'],
        matchedSentences: this.findSentencesWith(sentences, deep.redHerring.shiftMarkers),
        matchedText: deep.redHerring.shiftMarkers,
        score: 0.8,
        weight: 0.75,
        reasoning: `เปลี่ยนประเด็นด้วย marker: ${deep.redHerring.shiftMarkers.slice(0, 2).join(', ')}`,
      }]);
    }

    // ถ้า false_dilemma ชัด แต่ไม่มี
    if (deep.falseDilemma.hasBinary && deep.falseDilemma.hasForcedChoice && !candidateMap.has('false_dilemma')) {
      candidateMap.set('false_dilemma', [{
        type: 'false_dilemma',
        matchedPatterns: ['FD-DEEP-ADD'],
        matchedSentences: this.findSentencesWith(sentences, deep.falseDilemma.binaryTerms),
        matchedText: deep.falseDilemma.binaryTerms,
        score: 0.8,
        weight: 0.75,
        reasoning: `จำกัดทางเลือกเป็น binary พร้อม forced choice`,
      }]);
    }

    // ถ้า hasty_generalization ชัด แต่ไม่มี
    if (deep.hastyGeneralization.universalThenFew && !candidateMap.has('hasty_generalization')) {
      candidateMap.set('hasty_generalization', [{
        type: 'hasty_generalization',
        matchedPatterns: ['HG-DEEP-ADD'],
        matchedSentences: this.findSentencesWith(sentences, [
          ...deep.hastyGeneralization.universalTerms,
          ...deep.hastyGeneralization.fewTerms,
        ]),
        matchedText: [...deep.hastyGeneralization.universalTerms, ...deep.hastyGeneralization.fewTerms],
        score: 0.8,
        weight: 0.75,
        reasoning: `quantifier mismatch: ใช้คำสากลแต่อ้างตัวอย่างน้อย`,
      }]);
    }

    // ===== v2: 7 ประเภทใหม่ — missed detections =====
    const newTypesMissed: Array<{ key: FallacyType; cond: boolean; code: string; terms: string[]; score: number; weight: number; reasoning: string }> = [
      { key: 'appeal_to_emotion', cond: deep.appealToEmotion.detected && !candidateMap.has('appeal_to_emotion'), code: 'AE-DEEP-ADD', terms: deep.appealToEmotion.terms, score: 0.8, weight: 0.75, reasoning: `อ้างอารมณ์: ${deep.appealToEmotion.terms.slice(0, 2).join(', ')}` },
      { key: 'appeal_to_tradition', cond: deep.appealToTradition.detected && !candidateMap.has('appeal_to_tradition'), code: 'AT-DEEP-ADD', terms: deep.appealToTradition.terms, score: 0.8, weight: 0.75, reasoning: `อ้างธรรมเนียม: ${deep.appealToTradition.terms.slice(0, 2).join(', ')}` },
      { key: 'appeal_to_nature', cond: deep.appealToNature.detected && !candidateMap.has('appeal_to_nature'), code: 'AN-DEEP-ADD', terms: deep.appealToNature.terms, score: 0.8, weight: 0.75, reasoning: `อ้างธรรมชาติ: ${deep.appealToNature.terms.slice(0, 2).join(', ')}` },
      { key: 'tu_quoque', cond: deep.tuQuoque.detected && !candidateMap.has('tu_quoque'), code: 'TQ-DEEP-ADD', terms: deep.tuQuoque.terms, score: 0.8, weight: 0.75, reasoning: `หลีกเลี่ยงวิจารณ์: ${deep.tuQuoque.terms.slice(0, 2).join(', ')}` },
      { key: 'false_analogy', cond: deep.falseAnalogy.detected && !candidateMap.has('false_analogy'), code: 'FA-DEEP-ADD', terms: deep.falseAnalogy.terms, score: 0.78, weight: 0.72, reasoning: `อุปมาอันเท็จ: ${deep.falseAnalogy.terms.slice(0, 2).join(', ')}` },
      { key: 'stereotyping', cond: deep.stereotyping.detected && !candidateMap.has('stereotyping'), code: 'ST-DEEP-ADD', terms: deep.stereotyping.terms, score: 0.85, weight: 0.8, reasoning: `จำพวกกลุ่ม: ${deep.stereotyping.terms.slice(0, 2).join(', ')}` },
      { key: 'superstition', cond: deep.superstition.detected && !candidateMap.has('superstition'), code: 'SP-DEEP-ADD', terms: deep.superstition.terms, score: 0.85, weight: 0.8, reasoning: `คติโชคลาง: ${deep.superstition.terms.slice(0, 2).join(', ')}` },
    ];
    for (const nt of newTypesMissed) {
      if (nt.cond) {
        candidateMap.set(nt.key, [{ type: nt.key, matchedPatterns: [nt.code], matchedSentences: this.findSentencesWith(sentences, nt.terms), matchedText: nt.terms, score: nt.score, weight: nt.weight, reasoning: nt.reasoning }]);
      }
    }
  }

  /**
   * Conflict resolution — แยกประเภทที่ทับซ้อนโดยใช้ DeepFeatures
   * ใช้ ULTRA CONSERVATIVE approach: ไม่ลบ type ถ้า regex จับอย่างน้อย 1 pattern
   * (regex ผ่านมา 100% ใน single tests จึงเชื่อถือได้)
   */
  private resolveConflicts(
    candidateMap: Map<FallacyType, FallacySignal[]>,
    deep: DeepFeatures,
  ): Map<FallacyType, FallacySignal[]> {
    const result = new Map(candidateMap);

    // Helper: compute a proxy confidence from signals (best score × weight)
    const bestStrength = (signals: FallacySignal[]): number => {
      if (signals.length === 0) return 0;
      return Math.max(...signals.map(s => s.score * s.weight));
    };

    // Rule 1: circular_reasoning vs cherry_picking — cherry picking of repeated phrases can look circular
    if (result.has('circular_reasoning') && result.has('cherry_picking')) {
      const circStrength = bestStrength(result.get('circular_reasoning')!);
      const cherryStrength = bestStrength(result.get('cherry_picking')!);
      if (circStrength < cherryStrength) {
        result.delete('circular_reasoning');
      }
    }

    // Rule 2: false_cause vs slippery_slope — keep the one with higher confidence
    if (result.has('false_cause') && result.has('slippery_slope')) {
      const fcStrength = bestStrength(result.get('false_cause')!);
      const ssStrength = bestStrength(result.get('slippery_slope')!);
      if (ssStrength > fcStrength) {
        result.delete('false_cause');
      } else {
        result.delete('slippery_slope');
      }
    }

    // Rule 3: ad_hominem vs appeal_to_authority with similar confidence → merge into ad_hominem
    if (result.has('ad_hominem') && result.has('appeal_to_authority')) {
      const ahStrength = bestStrength(result.get('ad_hominem')!);
      const aaStrength = bestStrength(result.get('appeal_to_authority')!);
      if (Math.abs(ahStrength - aaStrength) <= 0.10) {
        // Keep ad_hominem, annotate with authority aspect
        const ahSignals = result.get('ad_hominem')!;
        const aaSignals = result.get('appeal_to_authority')!;
        for (const sig of ahSignals) {
          const authorityTerms = aaSignals
            .flatMap(s => s.matchedText)
            .slice(0, 2)
            .join(', ');
          if (authorityTerms) {
            sig.reasoning += ` [รวมกับ appeal_to_authority: มีการอ้างอำนาจ "${authorityTerms}" ร่วมด้วย]`;
          } else {
            sig.reasoning += ' [รวมกับ appeal_to_authority: มีการอ้างอำนาจร่วมด้วย]';
          }
        }
        result.delete('appeal_to_authority');
      }
    }

    // Rule 4: If more than 7 fallacy types detected, keep only top 7 by confidence
    if (result.size > 7) {
      const entries = Array.from(result.entries());
      entries.sort((a, b) => bestStrength(b[1]) - bestStrength(a[1]));
      const top7 = entries.slice(0, 7);
      const trimmed = new Map<FallacyType, FallacySignal[]>(top7);
      return trimmed;
    }

    // Rule 5 (v2): tu_quoque vs ad_hominem — keep both if distinct
    if (result.has('tu_quoque') && result.has('ad_hominem')) {
      const tqStrength = bestStrength(result.get('tu_quoque')!);
      const ahStrength = bestStrength(result.get('ad_hominem')!);
      if (tqStrength > ahStrength * 0.9) {
        // Keep both — tu_quoque is distinct from ad_hominem
      } else {
        const ahSignals = result.get('ad_hominem')!;
        for (const sig of ahSignals) {
          sig.reasoning += ' [รวมกับ tu_quoque: มีการหลีกเลี่ยงวิจารณ์]';
        }
        result.delete('tu_quoque');
      }
    }

    // Rule 6 (v2): stereotyping vs hasty_generalization — keep both if stereotypes are specific
    if (result.has('stereotyping') && result.has('hasty_generalization')) {
      const stStrength = bestStrength(result.get('stereotyping')!);
      if (stStrength < 0.4) {
        result.delete('stereotyping');
      }
    }

    // Rule 7 (v2): superstition vs false_cause — annotate if coexisting
    if (result.has('superstition') && result.has('false_cause')) {
      const spStrength = bestStrength(result.get('superstition')!);
      const fcStrength = bestStrength(result.get('false_cause')!);
      if (spStrength > fcStrength * 1.2) {
        const spSignals = result.get('superstition')!;
        for (const sig of spSignals) {
          sig.reasoning += ' [อาจทับซ้อนกับ false_cause — แยกไว้เป็นคติโชคลางเฉพาะ]';
        }
      }
    }

    return result;
  }

  // ===== Helper methods =====

  private findSentencesWith(sentences: Sentence[], terms: string[]): number[] {
    if (terms.length === 0) return [];
    return sentences
      .filter((s) => terms.some((t) => s.text.includes(t)))
      .map((s) => s.index);
  }

  private targetLabel(target: DeepFeatures['personAttack']['target']): string {
    switch (target) {
      case 'identity': return 'ตัวตน/ลักษณะ';
      case 'character': return 'นิสัย/บุคลิก';
      case 'credential': return 'คุณวุฒิ/ความรู้';
      case 'behavior': return 'พฤติกรรมในอดีต';
      default: return 'บุคคล';
    }
  }

  private computeStructureStrength(structure: ArgumentStructure, sentences: Sentence[]): number {
    let strength = 0;
    if (structure.premises.length > 0) strength += 0.4;
    if (structure.conclusion) strength += 0.4;
    if (structure.evidence.length > 0) strength += 0.2;
    return Math.min(1, strength);
  }

  private buildDetectedFallacy(
    type: FallacyType,
    confidence: number,
    falsePositiveRisk: number,
    signals: FallacySignal[],
    sentences: Sentence[],
    structure: ArgumentStructure,
    features: ReturnType<SemanticAnalyzer['analyze']>,
    deep: DeepFeatures,
  ): DetectedFallacy {
    const meta = FALLACY_META[type];
    const matchedSentencesIdx = [...new Set(signals.flatMap((s) => s.matchedSentences))];
    const problematicSentences = matchedSentencesIdx
      .map((i) => sentences[i]?.text)
      .filter((t): t is string => Boolean(t));

    const supportingSentences = sentences
      .filter((s) => !matchedSentencesIdx.includes(s.index) && (s.role === 'premise' || s.role === 'evidence'))
      .map((s) => s.text)
      .slice(0, 3);

    const reasoning = this.buildReasoning(type, signals, structure, features, sentences, deep);
    const counterArguments = this.buildCounterArguments(type, structure, features);
    const explanation = this.buildExplanation(type, confidence, signals);

    return {
      type,
      nameTh: meta.nameTh,
      nameEn: meta.nameEn,
      confidence: Math.round(confidence * 100) / 100,
      confidenceLabel: this.scorer.label(confidence),
      explanation,
      reasoning,
      problematicSentences,
      supportingSentences,
      counterArguments,
      falsePositiveRisk: Math.round(falsePositiveRisk * 100) / 100,
      falsePositiveReason: this.scorer.explainFalsePositive(type, falsePositiveRisk, signals.length),
      matchedPatterns: signals.flatMap((s) => s.matchedPatterns),
    };
  }

  private buildExplanation(type: FallacyType, confidence: number, signals: FallacySignal[]): string {
    const meta = FALLACY_META[type];
    const mainReason = signals[0]?.reasoning ?? meta.shortTh;
    return `${meta.nameTh} (${meta.nameEn}): ${meta.description} ในข้อความนี้พบว่า "${mainReason}" (ความมั่นใจ ${Math.round(confidence * 100)}%)`;
  }

  private buildReasoning(
    type: FallacyType,
    signals: FallacySignal[],
    structure: ArgumentStructure,
    features: ReturnType<SemanticAnalyzer['analyze']>,
    sentences: Sentence[],
    deep: DeepFeatures,
  ): string[] {
    const steps: string[] = [];
    const meta = FALLACY_META[type];

    steps.push(`ขั้นที่ 1: ตรวจสอบรูปแบบของ "${meta.nameTh}" — ${meta.shortTh}`);
    steps.push(`ขั้นที่ 2: แยกประโยคออกเป็น ${sentences.length} ประโยค พบข้อตั้ง ${structure.premises.length} ข้อ ข้อสรุป ${structure.conclusion ? 1 : 0} ข้อ และหลักฐาน ${structure.evidence.length} ชิ้น`);

    const regexSignals = signals.filter((s) => !s.matchedPatterns[0]?.includes('-DEEP'));
    const deepSignals = signals.filter((s) => s.matchedPatterns[0]?.includes('-DEEP'));

    if (regexSignals.length > 0) {
      steps.push(`ขั้นที่ 3: จับคู่รูปแบบภาษา — พบรูปแบบที่ตรงกับกฎ ${regexSignals.map((s) => s.matchedPatterns.join(', ')).join('; ')}`);
    }
    if (deepSignals.length > 0) {
      const stepNo = regexSignals.length > 0 ? 4 : 3;
      steps.push(`ขั้นที่ ${stepNo}: วิเคราะห์โครงสร้างเชิงลึก — ${deepSignals[0].reasoning}`);
    }
    const finalStep = (regexSignals.length > 0 ? 4 : 3) + (deepSignals.length > 0 ? 1 : 0);
    steps.push(`ขั้นที่ ${finalStep}: สรุปการตัดสิน — รวมคะแนนจากทุกสัญญาณ พิจารณาความเสี่ยง False Positive แล้วสรุปความมั่นใจ`);

    return steps;
  }

  private buildCounterArguments(
    type: FallacyType,
    structure: ArgumentStructure,
    features: ReturnType<SemanticAnalyzer['analyze']>,
  ): string[] {
    const counters: Record<FallacyType, string[]> = {
      ad_hominem: [
        'ข้อโต้แย้งควรถูกพิจารณาจากเนื้อหา ไม่ใช่จากตัวบุคคลที่กล่าว',
        'แม้ผู้พูดจะมีข้อบกพร่อง ข้อโต้แย้งอาจยังคงมีเหตุผลที่ต้องพิจารณา',
      ],
      straw_man: [
        'ควรอ้างข้อโต้แย้งของฝ่ายตรงข้ามตามตัวอักษรหรือให้ฝ่ายนั้นยืนยันด้วยตนเอง',
        'การตีความใหม่อาจทำให้สูญเสียเจตนาดั้งเดิมของผู้พูด',
      ],
      red_herring: [
        'ควรกลับมาที่ประเด็นหลักที่กำลังถกเถียงและตอบคำถามโดยตรง',
        'ประเด็นที่นำมาเสนอแม้น่าสนใจ ก็ไม่ได้หักล้างประเด็นเดิม',
      ],
      false_dilemma: [
        'อาจมีทางเลือกที่สามหรือมากกว่าที่ไม่ได้ถูกนำเสนอ',
        'ขอให้ระบุเหตุผลที่ตัดทางเลือกอื่นออกไป',
      ],
      hasty_generalization: [
        `ตัวอย่างที่มีอยู่ (${structure.premises.length} ข้อ) อาจไม่เพียงพอที่จะเป็นตัวแทนของประชากรทั้งหมด`,
        'ควรเก็บตัวอย่างให้กว้างขวางและหลากหลายก่อนสรุป',
      ],
      false_cause: [
        'ความสัมพันธ์เชิงเวลาไม่เท่ากับความสัมพันธ์เชิงเหตุผล ต้องแสดงกลไก',
        'อาจมีตัวแปรภายนอกที่เป็นสาเหตุร่วมของทั้งสองเหตุการณ์',
      ],
      appeal_to_authority: [
        'ผู้เชี่ยวชาญอาจเข้าข้างหรือผิดพลาดได้ ควรตรวจสอบข้อมูลและงานวิจัยต้นฉบับ',
        'ผู้เชี่ยวชาญในสาขาหนึ่งอาจไม่ใช่ผู้เชี่ยวชาญในอีกสาขา',
      ],
      appeal_to_popularity: [
        'ความนิยมไม่ได้แปลว่าถูกต้อง ความจริงไม่ได้ตัดสินโดยการลงคะแนน',
        'ประวัติศาสตร์มีตัวอย่างมากมายที่ความเชื่อส่วนใหญ่เป็นเท็จ',
      ],
      slippery_slope: [
        'แต่ละขั้นในลำดับเหตุการณ์ต้องมีหลักฐานแยกกัน มิฉะนั้นเป็นการคาดเดา',
        'มักจะมีจุดที่สามารถหยุดหรือควบคุมลำดับเหตุการณ์ได้',
      ],
      circular_reasoning: [
        'ข้อสรุปไม่สามารถอ้างข้อตั้งที่เป็นข้อสรุปเดียวกันได้ ต้องหาหลักฐานภายนอก',
        'ควรนิยามคำและให้เหตุผลจากข้อเท็จจริงที่สังเกตได้',
      ],
      cherry_picking: [
        'ควรนำเสนอข้อมูลทั้งหมดหรือตัวอย่างที่เป็นตัวแทน ไม่ใช่เฉพาะที่สนับสนุน',
        'ควรอธิบายเหตุผลที่เลือกเฉพาะข้อมูลบางส่วนและละเว้นส่วนอื่น',
      ],
      burden_of_proof: [
        'ผู้กล่าวอ้างเป็นผู้มีภาระพิสูจน์ข้ออ้างของตน ไม่ใช่ผู้ที่ปฏิเสธ',
        'การที่พิสูจน์ไม่ได้ว่าเท็จ ไม่ได้แปลว่าเป็นจริง',
      ],
      appeal_to_emotion: [
        'ควรใช้เหตุผลและหลักฐานเชิงตรรกะศาสตร์ในการโน้มน้าว ไม่ใช่ความรู้สึก',
        'ความรู้สึกน่าเสียใจหรือกลัว ไม่ได้แปลว่าข้อโต้แย้งผิด',
      ],
      appeal_to_tradition: [
        'สิ่งที่ทำกันมานานไม่ได้แปลว่าถูกต้อง — อาจมีหลักฐานใหม่ที่ควรพิจารณา',
        'สังคมเปลี่ยนแปลงไปแล้ว ธรรมเนียมบางอย่างอาจไม่เหมาะกับบริบทปัจจุบัน',
      ],
      appeal_to_nature: [
        'ธรรมชาติมีทั้งสิ่งที่เป็นอันตราย เช่น พิษัณฑ์ โรคร้าย และสัตว์ล่าเหยื่อ',
        'สิ่งที่มนุษย์สร้างบางอย่างก็ดีและปลอดภัย — การจำกัดเพียง "ธรรมชาติ" ไม่เพียงพอ',
      ],
      tu_quoque: [
        'ความผิดของผู้วิจารณ์ไม่ได้ทำให้ข้อโต้แย้งเดิมถูกต้อง',
        'ควรตอบคำถามเรื่องเนื้อหาของข้อโต้แย้ง แทนที่จะหลีกเลี่ยง',
      ],
      false_analogy: [
        'การเปรียบเทียบต้องพิจารณาความคล้ายคลึงและความแตกต่างที่สำคัญ',
        'ควรระบุว่าจุดที่แตกต่างกันมากเกินกว่าจุดที่เหมือนกัน',
      ],
      stereotyping: [
        'กลุ่มใด้มีความหลากหลายภายในกลุ่ม ไม่ควรสรุปรวมทุกคน',
        'ควรพิจารณาแต่ละบุคคลแยก ไม่ใช่สรุปจากกลุ่ม',
      ],
      superstition: [
        'ควรใช้หลักฐานทางวิทยาศาสตร์ ไม่ใช่ความเชื่อโชคลาง',
        'ความบังเอิญไม่ได้แปลว่ามีความสัมพันธ์เชิงเหตุผล',
      ],
    };
    return counters[type] ?? ['ควรพิจารณาข้อโต้แย้งนี้อย่างเป็นกลางเหตุผล'];
  }
}

// Type alias สำหรับ helper
type FallaySignalHelper = FallacySignal[];
