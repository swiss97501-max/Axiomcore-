// AxiomCore Engine - Semantic Analyzer
// ตัววิเคราะห์ว่าด้วยความหมาย: วิเคราะห์บทบาทเชิงความหมายและคำสำคัญ

import type { Sentence, ArgumentStructure } from './types';

// คำที่บ่งบอกการโจมตีบุคคล (Ad Hominem)
export const PERSON_ATTACK_TERMS = [
  'โง่', 'เลว', 'หลอกลวง', 'คนโกง', 'ประโยชน์น้อย', 'ไม่น่าเชื่อถือ',
  'คนหน้าด้าน', 'คนเลว', 'บ้า', 'เพี้ยน', 'ไม่มีความรู้', 'ไม่รู้เรื่อง',
  'คนพาล', 'คนโง่', 'ไร้ยางอาย', 'ต่ำต้อย', 'คนชั่ว', 'ทรยศ', 'หน้าซื่อใจคด',
  'เห็นแก่ตัว', 'ไม่มีปัญญา', 'สาดโคลน', 'ใส่ร้าย', 'ป้ายสี',
  'โกหก', 'ขี้โกหก', 'นักโกง', 'คนหลอกลวง', 'ไม่น่าไว้วางใจ', 'ไร้ความเชื่อถือ',
  'ไม่มีคุณธรรม', 'เสียคน', 'คนไม่ดี', 'ทำตัวไม่ดี', 'ไม่น่าเคารพ',
  'ไม่น่าไว้วางใจ', 'ไร้ความรับผิดชอบ', 'ขาดความรับผิดชอบ',
  'เอาแต่ได้', 'เห็นแก่ได้', 'เอาเปรียบ', 'ตื้นตัน', 'บ้านี่',
  'เปลี่ยนปาก', 'พูดสองจงใจ', 'หน้าหนา', 'เจ้าเล่ห์', 'ใจดำ',
  'หมิ่นเหม่ง', 'ดูถูก', 'ย่อหย่อน', 'ปรามาส', 'เหยียดหยาม',
  'หมางเมิน', 'ไม่ใส่ใจ', 'เฉยชา', 'ทำตัวเป็น', 'แสรด',
];

// คำที่บ่งบอกการอ้างผู้มีอำนาจ
export const AUTHORITY_TERMS = [
  'ผู้เชี่ยวชาญ', 'นักวิทยาศาสตร์', 'ศาสตราจารย์', 'แพทย์', 'หมอ',
  'นักวิจัย', 'ผู้บริหาร', 'ผู้นำ', 'นักเศรษฐศาสตร์', 'นักกฎหมาย',
  'ผู้รู้', 'ผู้ทรงคุณวุฒิ', 'นักปรัชญา', 'นักจิตวิทยา', 'นักฟิสิกส์',
  'นักคณิตศาสตร์', 'ผู้เชี่ยวชาญด้าน', 'ผู้มีอำนาจ', 'ผู้ใหญ่',
  'รัฐมนตรี', 'ประธานาธิบดี', 'ผู้ว่าราชการ', 'นักเขียน',
  'ผู้สื่อข่าว', 'นักจัดรายการ', 'ผู้บรรยาย', 'ที่ปรึกษา',
  'นักวิจัยอิสระ', 'ผู้เชี่ยวชาญอิสระ', 'ศูนย์วิจัย', 'สถาบันวิจัย',
  'องค์กรระหว่างประเทศ', 'องค์การสหประชาชาติ', 'WHO',
];

// คำที่บ่งบอกการอ้างความนิยม
export const POPULARITY_TERMS = [
  'คนส่วนใหญ่', 'หลายคน', 'ทุกคน', 'คนเป็นล้าน', 'ส่วนใหญ่',
  'เกือบทั้งหมด', 'คนจำนวนมาก', 'สังคม', 'ประชาชนส่วนใหญ่',
  'คนทั่วไป', 'คนเกือบทั้งหมด', 'คนมากมาย', 'มหาชน', 'เป็นที่นิยม',
  'ทุกคนเชื่อ', 'หลายฝ่าย', 'หลายแหล่ง',
  'คนทั่วไปเชื่อ', 'สังคมเชื่อ', 'ทุกฝ่ายเห็นตรงกัน', 'มีมติเห็นเดียวกัน',
  'เป็นมติส่วนใหญ่', 'โลกยอมรับ', 'นานาชาติยอมรับ',
];

// คำบอกปริมาณ (สำหรับ Hasty Generalization)
// ใช้ RegExp สำหรับคำที่ต้องการ word-boundary เพื่อหลีกเลี่ยง false positive
// เช่น "เสมอ" ต้องไม่ match "สม่ำเสมอ" (ที่แปลว่า สม่ำเสมอ/เป็นประจำ)
export const QUANTIFIER_TERMS: (string | RegExp)[] = [
  'ทุก', 'ทั้งหมด', /(?<!ำ)เสมอ/, 'ไม่เคย', 'ทั้ง', 'เด็ดขาด',
  'ไม่มีสัก', 'ทุกครั้ง', 'ตลอดกาล', 'ทั้งชาติ', 'ทั้งโลก', 'ทุกที่',
  'ไม่มีข้อยกเว้น', 'ทั้งหมดไม่มี', 'ส่วนใหญ่เสมอ',
  /ผิดทุก/, 'ไม่เคยผิด', 'ทุกคนต้อง', 'ทุกครั้งได้',
  'ทั้งโลก', 'ทุกชาติ', 'ตลอดไป', 'ตลอดกาล',
];

// คำบอกทางเลือก (False Dilemma)
export const CHOICE_TERMS = [
  'ทางเลือกเดียว', 'ไม่...ก็', 'หรือไม่ก็', 'ทำหรือไม่ทำ', 'อย่างเดียว',
  'มีเพียงสองทาง', 'ทางเลือกสองทาง', 'เลือกอย่างเดียว', 'ไม่มีทางอื่น',
  'นอกจากนี้ไม่มี', 'มิฉะนั้น', 'ไม่งั้น', 'ถ้าไม่...ก็ต้อง',
  'ต้องเลือกข้าง', 'อยู่ตรงข้ามหรือ', 'เลือกระหว่าง',
  'รับหรือปฏิเสธ', 'ตกลงหรือเลิก', 'ยอมหรือตาย',
];

// คำบอกสาเหตุ (False Cause)
export const CAUSAL_TERMS = [
  'เพราะ', 'จึง', 'ทำให้', 'ส่งผลให้', 'นำไปสู่', 'ก่อให้เกิด',
  'เป็นเหตุให้', 'อันเนื่องมาจาก', 'อาเซเหตุจาก', 'เนื่องจาก',
  'หลังจาก', 'ตามมาด้วย', 'สัมพันธ์กับ', 'เกิดขึ้นพร้อม',
  'ทำให้เกิด', 'เป็นสาเหตุให้', 'เป็นผลจาก',
  'ส่งผลต่อ', 'มีผลทำให้', 'นำมาซึ่ง',
];

// คำบอกลำดับเหตุการณ์ (Slippery Slope)
export const SLOPE_TERMS = [
  'จะนำไปสู่', 'สุดท้ายจะ', 'แล้วจะ', 'แล้วก็จะ', 'ต่อไปจะ',
  'ในที่สุดจะ', 'ท้ายที่สุดจะ', 'จะบานปลาย', 'จะลุกลาม',
  'จะตามมาด้วย', 'ก้าวสู่', 'เป็นผลให้',
  'ในที่สุดจะทำให้', 'ไปสู่สิ่งที่', 'นำไปสู่ภาวะ',
  'บานปลายเป็น', 'เริ่มจากแค่', 'จบลงที่',
];

// คำบอกการเบี่ยงเบน (Red Herring)
export const DIVERSION_TERMS = [
  'แต่จริงๆ แล้ว', 'อย่างไรก็ตาม', 'ที่สำคัญกว่า', 'ยิ่งไปกว่านั้น',
  'ทว่าประเด็นจริง', 'ปละเรื่องนี้ไปก่อน', 'กลับมาที่', 'ที่จริงแล้ว',
  'อีกเรื่องหนึ่ง', 'พูดถึงเรื่อง', 'ว่าแต่', 'เอาไว้ที่',
  'แต่ที่สำคัญกว่านั้น', 'พูดถึงเรื่องอื่นก่อน', 'กลับมาที่เรื่องหลัก',
  'น่าจะพูดถึง', 'อีกเรื่องที่น่าสนใจ', 'ขอเบี่ยงไปก่อน',
];

// คำบอกการบิดเบือน (Straw Man)
export const DISTORTION_TERMS = [
  'กล่าวหาว่า', 'แปลความว่า', 'หมายความว่า', 'สรุปแล้วคุณ',
  'ก็แสดงว่าคุณ', 'อ้างว่า', 'บอกว่าคุณ', 'แปลว่าคุณ',
  'สรุปว่าคุณ', 'หมายถึงว่าคุณ', 'เข้าใจว่าคุณ', 'คุณกำลังบอกว่า',
  'คุณพยายามจะบอกว่า', 'คุณหมายความว่า', 'เข้าใจผิดว่าคุณ',
  'ตีความเกินจริง', 'บิดเบือนความหมาย', 'เอาเรื่องไปบอก',
];

// คำบอกภาระพิสูจน์ (Burden of Proof)
export const BURDEN_TERMS = [
  'พิสูจน์สิ', 'จงพิสูจน์ว่า', 'พิสูจน์ให้ได้', 'ถ้าพิสูจน์ไม่ได้',
  'แสดงว่าไม่จริง', 'ไปพิสูจน์เอาเอง', 'จงแสดงให้เห็นว่า',
  'ถ้าไม่พิสูจน์', 'เป็นหน้าที่ของคุณที่จะพิสูจน์', 'ทำไมไม่พิสูจน์',
  'พิสูจน์ไม่ได้ก็แสดงว่า',
  'พิสูจน์ให้เห็นด้วย', 'แสดงหลักฐานด้วย', 'ถ้าไม่มีหลักฐาน',
  'หลักฐานอยู่ที่ไหน', 'ขาดหลักฐานแล้ว', 'ไม่มีหลักฐานสนับสนุน',
];

// คำบอกการเลือกข้อมูล (Cherry Picking)
export const SELECTIVE_TERMS = [
  'แม้ว่า...แต่', 'มีกรณีที่', 'บางกรณี', 'ในบางครั้ง', 'บางคราว',
  'เฉพาะที่', 'เลือกเฉพาะ', 'เพิกเฉย', 'ไม่นับ', 'ยกเว้น',
  'มีข้อมูลที่', 'มีรายงานว่า',
  'มีบางกรณีที่', 'ในบางสถานการณ์', 'เลือกมาเฉพาะ',
  'เพกเกี่ยว', 'ไม่สนใจข้อมูลอื่น', 'มองข้าม',
  'ละเว้น', 'ไม่นำมาพิจารณา',
];

// คำบอกอารมณ์ความรู้สึก (Appeal to Emotion)
export const EMOTION_TERMS = [
  'น่าสงสาร', 'กลัว', 'น่าเสียใจ', 'คิดดูสิ', 'ลูกคุณ', 'แม่คุณ', 'เด็กๆ',
  'คนชรา', 'ผู้ยากไร้', 'น้ำตา', 'ใจหาย', 'โหดร้าย', 'ไม่มีหัวใจ',
  'รู้สึกสงสาร', 'จะให้ตาย', 'น่ากลัว', 'น่าเบื่อ', 'ขำๆ', 'เหนื่อย',
  'เศร้า', 'โกรธ', 'เกลียด', 'ชิงชัง', 'สมปรารถนา', 'เห็นใจ',
  'เจ็บปวด', 'ทุกข์ทรมาน', 'เดือดร้อน', 'หดหู่', 'สะเทือนใจ',
  'ไม่น่าเชื่อ', 'น่าขนพอง',
];

// คำบอกการอ้างธรรมเนียม (Appeal to Tradition)
export const TRADITION_TERMS = [
  'ทำกันมา', 'ปู่ย่าตายาย', 'สมัยก่อน', 'ธรรมเนียม', 'แบบดั้งเดิม',
  'มาตั้งแต่', 'ไม่เคยเปลี่ยน', 'เชื่อกันมา', 'ความเชื่อเก่า', 'สืบทอดกันมา',
  'คนรุ่นก่อน', 'บรรพบุรุษ', 'ที่ถูกต้อง', 'มีมานาน', 'ไม่ควรเปลี่ยน',
  'เป็นของเดิม', 'เคยทำกัน', 'ตามธรรมเนียม', 'อย่าลืมว่าเราเคย',
  'แบบเดิมๆ', 'ดั้งเดิม', 'ตามประเพณี', 'ทางบ้าน', 'ทางภาคใต้',
  'ทางภาคเหนือ', 'เรื่องเก่า', 'เรื่องเก่าๆ', 'วิธีเก่า', 'ความเชื่อที่ดี',
  'สิ่งที่สืบทอด',
];

// คำบอกการอ้างธรรมชาติ (Appeal to Nature)
export const NATURE_TERMS = [
  'ธรรมชาติ', 'ออร์แกนิก', 'เกิดขึ้นเอง', 'ไม่มีสารเคมี',
  'สร้างมาจากธรรมชาติ', 'ไม่ผ่านกระบวนการ', 'จากธรรมชาติ',
  'อย่างธรรมชาติ', 'ไม่มีสารกันบูด', 'สมุนไพร', 'สารสกัดธรรมชาติ',
  'ธรรมชาติบำบัด', 'ไม่ใส่สี', 'ไม่ใส่กลิ่น', 'ปลอดภัยตามธรรมชาติ',
  'วิตามินจากธรรมชาติ', 'ผักสด', 'ผลไม้สด', 'ธรรมชาติไม่ผิด',
  'สิ่งที่ธรรมชาติทำ', 'ของแท้จากธรรมชาติ', 'ไม่ผ่านการแปรรูป',
  'สิ่งมีชีวิต', 'ระบบนิเวศ', 'สภาพแวดล้อมทางธรรมชาติ',
];

// คำบอกการโต้ตอบ "คุณก็ทำ" (Tu Quoque)
export const TU_QUOQUE_TERMS = [
  'คุณก็ทำ', 'คุณเองก็', 'แล้วคุณล่ะ', 'ก่อนจะว่าคนอื่น',
  'ใครบอกว่าคุณไม่ทำ', 'คุณดีกว่าไหม', 'คุณเคยเองด้วย', 'มองตัวเองก่อน',
  'กระจกสะท้อน', 'ลูกกระจก', 'ก่อนจะมาสอน', 'คุณเองก็ทำผิด',
  'ใครจะว่าใคร', 'คุณไม่เคยทำเหมือนกันหรือ', 'ดูตัวเองก่อนสิ',
  'คนที่อยู่ในกระจก', 'คุณล่ะทำอะไรบ้าง', 'แล้วตัวคุณเองล่ะ',
  'ก่อนจะว่าผม', 'ก่อนจะว่าเรา', 'คุณก็เคยทำแบบนี้',
];

// คำบอกการเปรียบเทียบ (False Analogy)
export const ANALOGY_TERMS = [
  'เหมือนกัน', 'คล้ายกับ', 'เปรียบเหมือน', 'เช่นเดียวกับ', 'ดังเช่น',
  'เปรียบได้กับ', 'ดังที่', 'เหมือน', 'เปรียบเทียบ', 'เหมือนกับ',
  'เสมือน', 'ดัง', 'เช่น', 'คล้าย', 'คล้ายคลึง', 'วิธีเดียวกัน',
  'รูปแบบเดียวกัน', 'ทำนองเดียวกัน', 'อย่างเดียวกัน', 'ลักษณะเดียวกัน',
  'เหมือนเช่น', 'เปรียบดัง', 'เปรียบเทียบได้',
];

// คำบอกการฉายภาพลักษณ์กลุ่ม (Stereotyping)
export const STEREOTYPE_TERMS = [
  'คนอ้วน', 'คนจน', 'คนรวย', 'วัยรุ่น', 'แม่บ้าน', 'ผู้ชาย', 'ผู้หญิง',
  'คนเมือง', 'คนบ้านนอก', 'คนรุ่นใหม่', 'คนรุ่นเก่า', 'พนักงานรัฐ',
  'นักการเมือง', 'ข้าราชการ', 'คนต่างชาติ', 'คนเหนือ', 'คนใต้', 'คนอีสาน',
  'หมอ', 'ทนาย', 'วิศวะ', 'ชาวนา', 'แม่ค้า', 'พ่อค้า', 'นักเรียน',
  'นักศึกษา', 'เด็กจบใหม่', 'ผู้สูงอายุ', 'คนต่างศาสนา', 'ผู้มีพิการ',
  'คนทำงานบริษัท', 'พนักงานออฟฟิศ',
];

// คำบอกความเชื่อโชคลาง (Superstition)
export const SUPERSTITION_TERMS = [
  'ของขลัง', 'ดาว', 'โชค', 'ลาง', 'ฝัน', 'ไหว้', 'ปลุกเสก', 'คาถา',
  'สาป', 'น้ำมนต์', 'พิธีกรรม', 'วันศุกร์ที่ 13', 'สัตว์นำโชค', 'กุญแจ',
  'ผี', 'สิ่งศักดิ์สิทธิ์', 'ดวง', 'ราศี', 'ดูดวง', 'โหราศาสตร์',
  'ของดี', 'ของเสริมดวง', 'เสริมดวง', 'ปีชง', 'ดวงตก', 'ดวงดับ',
  'โชคร้าย', 'โชคดี', 'มงคล', 'อัปมงคล', 'ของร้าง', 'กรงหลวง',
  'ทาสีเขียว', 'ผ้ายันต์', 'จักร', 'สีมงคล', 'ดูฝัน',
];

export interface SemanticFeatures {
  hasPersonAttack: boolean;
  hasAuthority: boolean;
  hasPopularity: boolean;
  hasQuantifier: boolean;
  hasChoice: boolean;
  hasCausal: boolean;
  hasSlope: boolean;
  hasDiversion: boolean;
  hasDistortion: boolean;
  hasBurden: boolean;
  hasSelective: boolean;
  hasEmotion: boolean;
  hasTradition: boolean;
  hasNature: boolean;
  hasTuQuoque: boolean;
  hasAnalogy: boolean;
  hasStereotype: boolean;
  hasSuperstition: boolean;
  personAttackTerms: string[];
  authorityTerms: string[];
  popularityTerms: string[];
  quantifierTerms: string[];
  choiceTerms: string[];
  causalTerms: string[];
  slopeTerms: string[];
  diversionTerms: string[];
  distortionTerms: string[];
  burdenTerms: string[];
  selectiveTerms: string[];
  emotionTerms: string[];
  traditionTerms: string[];
  natureTerms: string[];
  tuQuoqueTerms: string[];
  analogyTerms: string[];
  stereotypeTerms: string[];
  superstitionTerms: string[];
}

export class SemanticAnalyzer {
  analyze(text: string): SemanticFeatures {
    return {
      hasPersonAttack: this.containsAny(text, PERSON_ATTACK_TERMS),
      hasAuthority: this.containsAny(text, AUTHORITY_TERMS),
      hasPopularity: this.containsAny(text, POPULARITY_TERMS),
      hasQuantifier: this.containsAny(text, QUANTIFIER_TERMS),
      hasChoice: this.containsAny(text, CHOICE_TERMS),
      hasCausal: this.containsAny(text, CAUSAL_TERMS),
      hasSlope: this.containsAny(text, SLOPE_TERMS),
      hasDiversion: this.containsAny(text, DIVERSION_TERMS),
      hasDistortion: this.containsAny(text, DISTORTION_TERMS),
      hasBurden: this.containsAny(text, BURDEN_TERMS),
      hasSelective: this.containsAny(text, SELECTIVE_TERMS),
      hasEmotion: this.containsAny(text, EMOTION_TERMS),
      hasTradition: this.containsAny(text, TRADITION_TERMS),
      hasNature: this.containsAny(text, NATURE_TERMS),
      hasTuQuoque: this.containsAny(text, TU_QUOQUE_TERMS),
      hasAnalogy: this.containsAny(text, ANALOGY_TERMS),
      hasStereotype: this.containsAny(text, STEREOTYPE_TERMS),
      hasSuperstition: this.containsAny(text, SUPERSTITION_TERMS),
      personAttackTerms: this.findTerms(text, PERSON_ATTACK_TERMS),
      authorityTerms: this.findTerms(text, AUTHORITY_TERMS),
      popularityTerms: this.findTerms(text, POPULARITY_TERMS),
      quantifierTerms: this.findTerms(text, QUANTIFIER_TERMS),
      choiceTerms: this.findTerms(text, CHOICE_TERMS),
      causalTerms: this.findTerms(text, CAUSAL_TERMS),
      slopeTerms: this.findTerms(text, SLOPE_TERMS),
      diversionTerms: this.findTerms(text, DIVERSION_TERMS),
      distortionTerms: this.findTerms(text, DISTORTION_TERMS),
      burdenTerms: this.findTerms(text, BURDEN_TERMS),
      selectiveTerms: this.findTerms(text, SELECTIVE_TERMS),
      emotionTerms: this.findTerms(text, EMOTION_TERMS),
      traditionTerms: this.findTerms(text, TRADITION_TERMS),
      natureTerms: this.findTerms(text, NATURE_TERMS),
      tuQuoqueTerms: this.findTerms(text, TU_QUOQUE_TERMS),
      analogyTerms: this.findTerms(text, ANALOGY_TERMS),
      stereotypeTerms: this.findTerms(text, STEREOTYPE_TERMS),
      superstitionTerms: this.findTerms(text, SUPERSTITION_TERMS),
    };
  }

  analyzeSentence(sentence: Sentence): SemanticFeatures {
    return this.analyze(sentence.text);
  }

  /**
   * ตรวจหาการเปลี่ยนประเด็น (topic shift) - สำคัญสำหรับ Red Herring
   */
  detectTopicShift(sentences: Sentence[], structure: ArgumentStructure): {
    shifted: boolean;
    shiftIndex: number;
    reason: string;
  } {
    if (sentences.length < 2 || structure.topicKeywords.length === 0) {
      return { shifted: false, shiftIndex: -1, reason: 'ข้อมูลไม่เพียงพอ' };
    }
    const mainTopic = structure.topicKeywords[0];
    for (let i = 1; i < sentences.length; i++) {
      const prev = sentences[i - 1].text;
      const curr = sentences[i].text;
      const prevHasTopic = prev.includes(mainTopic);
      const currHasTopic = curr.includes(mainTopic);
      const hasDiversion = this.containsAny(curr, DIVERSION_TERMS);
      // ประโยคก่อนมีประเด็นหลัก ประโยคถัดมาไม่มีและมีคำเบี่ยงเบน
      if (prevHasTopic && !currHasTopic && hasDiversion) {
        return {
          shifted: true,
          shiftIndex: i,
          reason: `ประโยคที่ ${i + 1} เบี่ยงเบนจากประเด็นหลัก "${mainTopic}" ไปยังประเด็นอื่น`,
        };
      }
    }
    return { shifted: false, shiftIndex: -1, reason: 'ไม่พบการเปลี่ยนประเด็น' };
  }

  /**
   * ตรวจหาความซ้ำซ้อนของข้อความ (สำคัญสำหรับ Circular Reasoning)
   */
  detectRepetition(text: string): {
    repeated: boolean;
    phrases: string[];
  } {
    const phrases: string[] = [];
    // ตรวจหาวลีที่ซ้ำกัน (ความยาว >= 6 ตัวอักษร)
    const seen = new Map<string, number>();
    const words = text.split(/\s+/);
    for (let len = 4; len <= Math.min(8, words.length); len++) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ').replace(/[.,!?;:]/g, '');
        if (phrase.length < 6) continue;
        const count = (seen.get(phrase) ?? 0) + 1;
        seen.set(phrase, count);
        if (count === 2) phrases.push(phrase);
      }
    }
    return { repeated: phrases.length > 0, phrases: [...new Set(phrases)] };
  }

  private containsAny(text: string, terms: (string | RegExp)[]): boolean {
    return terms.some((t) =>
      typeof t === 'string' ? text.includes(t) : t.test(text),
    );
  }

  private findTerms(text: string, terms: (string | RegExp)[]): string[] {
    return terms
      .map((t) => {
        if (typeof t === 'string') {
          return text.includes(t) ? [t] : [];
        }
        const m = text.match(t);
        return m ? [m[0]] : [];
      })
      .flat();
  }
}
