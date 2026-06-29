// AxiomCore Engine - Core Type Definitions
// ระบบวิเคราะห์ตรรกะวิบัติ - นิยามประเภทหลัก

export type FallacyType =
  | 'ad_hominem'
  | 'straw_man'
  | 'red_herring'
  | 'false_dilemma'
  | 'hasty_generalization'
  | 'false_cause'
  | 'appeal_to_authority'
  | 'appeal_to_popularity'
  | 'slippery_slope'
  | 'circular_reasoning'
  | 'cherry_picking'
  | 'burden_of_proof'
  // v2 — 7 ประเภทใหม่
  | 'appeal_to_emotion'
  | 'appeal_to_tradition'
  | 'appeal_to_nature'
  | 'tu_quoque'
  | 'false_analogy'
  | 'stereotyping'
  | 'superstition';

export const ALL_FALLACY_TYPES: FallacyType[] = [
  'ad_hominem',
  'straw_man',
  'red_herring',
  'false_dilemma',
  'hasty_generalization',
  'false_cause',
  'appeal_to_authority',
  'appeal_to_popularity',
  'slippery_slope',
  'circular_reasoning',
  'cherry_picking',
  'burden_of_proof',
  // v2 — 7 ประเภทใหม่
  'appeal_to_emotion',
  'appeal_to_tradition',
  'appeal_to_nature',
  'tu_quoque',
  'false_analogy',
  'stereotyping',
  'superstition',
];

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface FallacyMeta {
  type: FallacyType;
  nameTh: string;
  nameEn: string;
  shortTh: string;
  description: string;
}

export const FALLACY_META: Record<FallacyType, FallacyMeta> = {
  ad_hominem: {
    type: 'ad_hominem',
    nameTh: 'การโจมตีบุคคล',
    nameEn: 'Ad Hominem',
    shortTh: 'โจมตีตัวบุคคลแทนการโต้ข้อโต้แย้ง',
    description:
      'การโจมตีลักษณะ ความเชื่อถือ หรือตัวตนของผู้พูด แทนที่จะหักล้างข้อโต้แย้งของผู้พูดโดยตรง',
  },
  straw_man: {
    type: 'straw_man',
    nameTh: 'หุ่นฟาง',
    nameEn: 'Straw Man',
    shortTh: 'บิดเบือนข้อโต้แย้งของฝ่ายตรงข้ามให้อ่อนแอแล้วโจมตี',
    description:
      'การนำเสนอหรือตีความข้อโต้แย้งของฝ่ายตรงข้ามในรูปแบบที่ผิดเพี้ยนหรือเกินจริง แล้วจึงโจมตีรูปแบบที่บิดเบือนนั้น',
  },
  red_herring: {
    type: 'red_herring',
    nameTh: 'ปลาแดง',
    nameEn: 'Red Herring',
    shortTh: 'นำเสนอประเด็นนอกเรื่องเพื่อเบี่ยงเบนความสนใจ',
    description:
      'การนำเสนอข้อมูลหรือประเด็นที่ไม่เกี่ยวข้องเพื่อเบี่ยงเบนความสนใจจากประเด็นหลักที่กำลังถกเถียง',
  },
  false_dilemma: {
    type: 'false_dilemma',
    nameTh: 'ปัญหาเท็จ',
    nameEn: 'False Dilemma',
    shortTh: 'จำกัดตัวเลือกเพียงสองทางทั้งที่มีทางอื่น',
    description:
      'การนำเสนอสถานการณ์ราวก้าวมีเพียงสองทางเลือกที่เป็นไปได้ ทั้งที่ความจริงมีทางเลือกอื่นที่สมเหตุสมผล',
  },
  hasty_generalization: {
    type: 'hasty_generalization',
    nameTh: 'การสรุปเร่งรัด',
    nameEn: 'Hasty Generalization',
    shortTh: 'สรุปทั่วไปจากตัวอย่างที่น้อยเกินไป',
    description:
      'การสรุปความรู้สึกหรือข้อเท็จจริงทั่วไปจากตัวอย่างหรือหลักฐานที่น้อยเกินไปหรือไม่เป็นตัวแทน',
  },
  false_cause: {
    type: 'false_cause',
    nameTh: 'เหตุเท็จ',
    nameEn: 'False Cause',
    shortTh: 'สันนิษฐานว่าสิ่งที่เกิดตามมาคือสาเหตุ',
    description:
      'การสันนิษฐานว่าเหตุการณ์ที่เกิดขึ้นก่อนหรือพร้อมกันเป็นสาเหตุของเหตุการณ์ที่เกิดขึ้นภายหลัง โดยไม่มีหลักฐานเชิงเหตุผล',
  },
  appeal_to_authority: {
    type: 'appeal_to_authority',
    nameTh: 'การอ้างผู้มีอำนาจ',
    nameEn: 'Appeal to Authority',
    shortTh: 'อ้างผู้เชี่ยวชาญแทนการให้เหตุผล',
    description:
      'การอ้างถึงผู้มีอำนาจหรือผู้เชี่ยวชาญเพื่อสนับสนุนข้อโต้แย้ง โดยไม่มีหลักฐานหรือเหตุผลที่แท้จริง',
  },
  appeal_to_popularity: {
    type: 'appeal_to_popularity',
    nameTh: 'การอ้างความนิยม',
    nameEn: 'Appeal to Popularity',
    shortTh: 'อ้างว่าเป็นที่นิยมจึงถูกต้อง',
    description:
      'การอ้างว่าข้อโต้แย้งหรือความเชื่อนั้นถูกต้องเพราะมีคนจำนวนมากเชื่อหรือยอมรับ',
  },
  slippery_slope: {
    type: 'slippery_slope',
    nameTh: 'ทางลื่น',
    nameEn: 'Slippery Slope',
    shortTh: 'อ้างลำดับเหตุการณ์ที่ไม่น่าจะเกิด',
    description:
      'การอ้างว่าการกระทำหนึ่งจะนำไปสู่ลำดับเหตุการณ์ที่เลวร้ายโดยไม่ได้แสดงหลักฐานของความเชื่อมโยงแต่ละขั้น',
  },
  circular_reasoning: {
    type: 'circular_reasoning',
    nameTh: 'ตรรกะวน',
    nameEn: 'Circular Reasoning',
    shortTh: 'ข้อสรุปอ้างข้อตั้งเดิม',
    description:
      'การให้เหตุผลที่ข้อสรุปและข้อตั้งอ้างถึงกันและกัน โดยไม่ได้ให้หลักฐานภายนอกมาสนับสนุน',
  },
  cherry_picking: {
    type: 'cherry_picking',
    nameTh: 'การเลือกเชอร์รี่',
    nameEn: 'Cherry Picking',
    shortTh: 'เลือกเฉพาะข้อมูลที่สนับสนุน',
    description:
      'การเลือกนำเสนอเฉพาะข้อมูลหรือหลักฐานที่สนับสนุนข้อโต้แย้งของตน โดยละเว้นข้อมูลที่ขัดแย้ง',
  },
  burden_of_proof: {
    type: 'burden_of_proof',
    nameTh: 'ภาระการพิสูจน์',
    nameEn: 'Burden of Proof',
    shortTh: 'ผลักภาระการพิสูจน์ให้อีกฝ่าย',
    description:
      'การอ้างว่าข้อโต้แย้งของตนเป็นจริงหากอีกฝ่ายพิสูจน์ไม่ได้ว่าเป็นเท็จ ทั้งที่ภาระพิสูจน์ควรอยู่ที่ผู้กล่าวอ้าง',
  },
  // ===== v2 — 7 ประเภทใหม่ =====
  appeal_to_emotion: {
    type: 'appeal_to_emotion',
    nameTh: 'การอ้างอารมณ์',
    nameEn: 'Appeal to Emotion',
    shortTh: 'ใช้อารมณ์ความรู้สึกแทนเหตุผล',
    description:
      'การใช้ความรู้สึกทางอารมณ์ (ความกลัว ความสงสาร ความโกรธ ความเห็นใจ) เพื่อโน้มน้าวให้เชื่อข้อโต้แย้ง แทนที่จะใช้เหตุผลหรือหลักฐาน',
  },
  appeal_to_tradition: {
    type: 'appeal_to_tradition',
    nameTh: 'การอ้างธรรมเนียม',
    nameEn: 'Appeal to Tradition',
    shortTh: 'อ้างว่าทำกันมานานจึงถูกต้อง',
    description:
      'การอ้างว่าสิ่งที่ทำกันมาเป็นเวลานานหรือเป็นธรรมเนียมประเพณีจึงเป็นสิ่งที่ถูกต้องหรือดีกว่า โดยไม่มีหลักฐานเชิงเหตุผลสนับสนุน',
  },
  appeal_to_nature: {
    type: 'appeal_to_nature',
    nameTh: 'การอ้างธรรมชาติ',
    nameEn: 'Appeal to Nature',
    shortTh: 'อ้างว่าธรรมชาติคือดีที่สุด',
    description:
      'การอ้างว่าสิ่งที่เป็นธรรมชาติหรือเกิดขึ้นเองตามธรรมชาตินั้นดีกว่าหรือปลอดภัยกว่าสิ่งที่มนุษย์สร้าง เพียงเพราะเป็น "ธรรมชาติ"',
  },
  tu_quoque: {
    type: 'tu_quoque',
    nameTh: 'คุณก็ทำเช่นกัน',
    nameEn: 'Tu Quoque',
    shortTh: 'หลีกเลี่ยงการวิจารณ์ด้วยการยิงกลับ',
    description:
      'การหลีกเลี่ยงการวิจารณ์โดยอ้างว่าผู้วิจารณ์ก็ทำผิดหรือมีพฤติกรรมเดียวกัน แทนที่จะตอบข้อโต้แย้งจริง',
  },
  false_analogy: {
    type: 'false_analogy',
    nameTh: 'อุปมาอันเท็จ',
    nameEn: 'False Analogy',
    shortTh: 'เปรียบเทียบสิ่งที่แตกต่างกันมากเกินไป',
    description:
      'การเปรียบเทียบสองสิ่งที่มีความแตกต่างสำคัญกันมากเกินไป จนเปรียบเทียบกันไม่ได้ แต่นำมาใช้สนับสนุนข้อโต้แย้ง',
  },
  stereotyping: {
    type: 'stereotyping',
    nameTh: 'การจำพวก',
    nameEn: 'Stereotyping',
    shortTh: 'สรุปคุณลักษณะจากกลุ่มโดยไม่พิจารณาบุคคล',
    description:
      'การสมมติว่าบุคคลทุกคนในกลุ่มหนึ่งมีคุณลักษณะเหมือนกันทั้งหมด โดยไม่พิจารณาความแตกต่างของแต่ละบุคคล',
  },
  superstition: {
    type: 'superstition',
    nameTh: 'คติโชคลาง',
    nameEn: 'Superstition',
    shortTh: 'อ้างความเชื่อโชคลาง/งมงายแทนเหตุผล',
    description:
      'การอ้างความเชื่อเรื่องโชคลาง ลางสังหรณ์ ของขลัง หรือสิ่งเหนือธรรมชาติ โดยไม่มีหลักฐานทางวิทยาศาสตร์ เพื่อสนับสนุนข้อโต้แย้ง',
  },
};

// ===== Sentence / Token Analysis =====

export interface Token {
  text: string;
  index: number;
  type: 'word' | 'punct' | 'marker' | 'number';
}

export interface Sentence {
  text: string;
  index: number;
  start: number;
  end: number;
  tokens: Token[];
  role?: 'premise' | 'conclusion' | 'evidence' | 'claim' | 'unknown';
  indicators: string[];
}

// ===== Argument Structure =====

export interface Premise {
  text: string;
  sentenceIndex: number;
  indicator?: string;
  type: 'explicit' | 'implicit';
}

export interface Conclusion {
  text: string;
  sentenceIndex: number;
  indicator?: string;
}

export interface Evidence {
  text: string;
  sentenceIndex: number;
  type: 'statistic' | 'example' | 'quote' | 'authority' | 'analogy';
}

export interface ArgumentStructure {
  premises: Premise[];
  conclusion: Conclusion | null;
  evidence: Evidence[];
  claims: string[];
  topicKeywords: string[];
}

// ===== Fallacy Detection =====

export interface FallacySignal {
  type: FallacyType;
  matchedPatterns: string[];
  matchedSentences: number[];
  matchedText: string[];
  score: number; // 0-1 raw pattern strength
  weight: number; // rule weight
  reasoning: string;
}

export interface DetectedFallacy {
  type: FallacyType;
  nameTh: string;
  nameEn: string;
  confidence: number; // 0-1
  confidenceLabel: 'ต่ำ' | 'ปานกลาง' | 'สูง' | 'สูงมาก';
  explanation: string;
  reasoning: string[]; // เหตุผลทีละขั้น
  problematicSentences: string[]; // ประโยคที่เป็นปัญหา
  supportingSentences: string[]; // ประโยคที่สนับสนุนการตรวจพบ
  counterArguments: string[]; // ข้อโต้แย้งที่เป็นไปได้
  falsePositiveRisk: number; // 0-1 ความเป็นไปได้ของตรรกะวิบัติปลอม
  falsePositiveReason: string;
  matchedPatterns: string[];
}

export interface AnalysisResult {
  input: string;
  overallConfidence: number;
  summary: string;
  detectedFallacies: DetectedFallacy[];
  argumentStructure: ArgumentStructure;
  sentences: Sentence[];
  stepByStep: string[];
  stats: {
    sentenceCount: number;
    premiseCount: number;
    conclusionCount: number;
    evidenceCount: number;
    detectionCount: number;
    processingMs: number;
  };
}

// ===== Detection Rule =====

export interface DetectionRuleDef {
  code: string;
  fallacyType: FallacyType;
  pattern: RegExp;
  description: string;
  weight: number; // 0-1
  requiresStructure?: boolean; // needs argument structure to fire
}
