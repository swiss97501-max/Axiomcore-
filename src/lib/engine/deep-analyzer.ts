// AxiomCore Engine - Deep Structural Analyzer
// วิเคราะห์โครงสร้างเชิงลึก: attack target, evidence selection, topic shift, causal chain,
// quantifier mismatch, authority/popularity mention, circular pattern, burden shift, binary framing
// ใช้ "หลักการแยก" จริง — ไม่ใช่แค่ regex

import type { Sentence, ArgumentStructure } from './types';

// ============================================================
// คำศัพท์สำหรับ Deep Analysis (กลุ่มใหม่)
// ============================================================

// คำโจมตีบุคคล — แยกตามประเภทการโจมตี
const PERSON_ATTACK_IDENTITY = [
  'ผู้หญิงอย่างคุณ', 'คนอย่างเธอ', 'คนอย่างคุณ', 'คนแบบนี้', 'คนพวกนี้',
  'พวกหัวก้าวหน้าเก๊', 'พวกอนุรักษ์นิยม', 'พวกเสื้อ', 'พวกสาย',
  'สาวโสด', 'แก่แล้ว', 'เด็กจบใหม่', 'นักศึกษา', 'เด็กฝึกงาน',
  'คนตกงาน', 'คนหย่าร้าง', 'คนไม่มีลูก', 'คนขี้เมา', 'คนขี้เหนียว',
  'คนอ้วน', 'คนผอม', 'คนจน', 'คนรวย', 'คนต่างจังหวัด',
];

const PERSON_ATTACK_CHARACTER = [
  'ขี้เกียจ', 'โง่', 'เลว', 'บ้า', 'เพี้ยน', 'คนพาล', 'ไร้ยางอาย',
  'เห็นแก่ตัว', 'หน้าด้าน', 'หลอกลวง', 'โกหก', 'ขี้โกหก', 'ทรยศ',
  'หน้าซื่อใจคด', 'คนชั่ว', 'เสียคน', 'คนไม่ดี', 'ไม่น่าเคารพ',
  'ไม่น่าเชื่อถือ', 'ไม่น่าไว้วางใจ', 'ไร้ความเชื่อถือ', 'ไม่มีคุณธรรม',
  'จับผิด', 'ระแวงเกินไป', 'หลงเชื่อ', 'ไม่มีสมอง', 'ไม่มีรสนิยม', 'ไม่ดูแลตัวเอง',
  'ไม่มีความรับผิดชอบ', 'ไม่มีวินัย', 'ไม่เหมาะสม',
];

const PERSON_ATTACK_CREDENTIAL = [
  'ไม่ใช่ผู้เชี่ยวชาญ', 'ไม่มีความรู้', 'ไม่รู้เรื่อง', 'ไม่เข้าใจ',
  'ไม่ได้เรียน', 'ไม่มีวุฒิ', 'ไม่มีปริญญา', 'ไม่เคยทำ', 'ไม่เคยไป',
  'ไม่เคยแต่งงาน', 'ไม่มีลูก', 'ไม่เคยบริหาร', 'ไม่เคยทำธุรกิจ',
  'ไม่ได้เป็นสมาชิก', 'ไม่มีสิทธิ์', 'ไม่คู่ควร', 'จะมา...ได้ยังไง',
  'จะไปรู้...อะไร', 'จะไปเข้าใจ...อะไร', 'จะมาสอน...ได้ยังไง',
  'จะวิจารณ์...ได้ยังไง', 'จะพูด...ได้ยังไง', 'ฟังไม่ขึ้น', 'ไม่มีความหมาย',
];

const PERSON_ATTACK_BEHAVIOR = [
  'เคยโกหก', 'เคยหลอก', 'เคยทำผิด', 'เคยโกง', 'เคยล้มละลาย', 'เคยล้มละวาย',
  'เคยทำธุรกิจเจ๊ง', 'เคยสอบตก', 'เคยเช่าบ้าน', 'ประวัติไม่ดี',
  'เคยถูกฟ้อง', 'เคยแพ้คดี', 'เคยมีข่าวฉาว', 'เคยตกงาน',
  'เคยสาย', 'เคยทำไม่สำเร็จ', 'ใช้รถส่วนตัว', 'บินบ่อย',
  'แอบดื่ม', 'สูบบุหรี่', 'ใช้มือถือรุ่นใหม่', 'ใส่เสื้อผ้ามือสอง',
  'แต่งตัวไม่เรียบร้อย', 'อ้วนจะตาย', 'ยังเป็นหนี้', 'ยังเช่าบ้าน', 'เสพติดอาหารขยะ', 'เสพติด',
  'ทำกับข้าวไม่เป็น', 'ใบขับขี่ถูกยึด', 'ไม่ได้ทำงานบริษัท',
  'เคยส่งของช้า', 'ส่งของช้า', 'เคยทำงานไม่ได้', 'ทำงานไม่ได้เลย',
  'ไม่ได้ทำดี', 'ไม่ได้ทำดีเลย', 'เคยมีเคราะห์', 'ตอนมีเคราะห์',
];

// คำบอก " dismissal" หลังโจมตีบุคคล — สำคัญเพื่อแยก AH จากคำอธิบายทั่วไป
const DISMISSAL_PHRASES = [
  'จึงฟังไม่ขึ้น', 'จึงไม่น่าเชื่อถือ', 'จึงไม่น่าฟัง', 'จึงไร้สาระ',
  'ไม่ต้องฟัง', 'ไม่ต้องไปสนใจ', 'อย่าไปฟัง', 'อย่ารับฟัง',
  'อย่าเชื่อ', 'เชื่อไม่ได้', 'เชื่อถือไม่ได้', 'ฟังไม่ต้อง',
  'ไม่มีความหมาย', 'ไม่มีสิทธิ์', 'จะไปรู้', 'จะมา...ได้ยังไง',
  'ไม่คู่ควร', 'แสดงว่าคุณ', 'ก็แสดงว่า', 'สรุปว่าคุณ',
  'แสดงว่า', 'ก็เท่ากับคุณ', 'ก็เท่ากับว่า',
  // เพิ่ม: การ dismiss ผู้ไม่เห็นด้วยโดยตำหนิความเข้าใจ/ความรู้ของพวกเขา
  // เช่น "ใครไม่เชื่อก็คงไม่เข้าใจการศึกษา" = dismiss ผู้ไม่เห็นด้วยว่าไม่เข้าใจ
  'คงไม่เข้าใจ', 'ไม่เข้าใจการ', 'ก็คงไม่เข้าใจ', 'ก็คงโง่',
  'คงโง่', 'ก็คงไม่มีสมอง', 'ไม่มีสมอง', 'คงไม่รู้เรื่อง',
  'ไม่เข้าใจเรื่อง', 'ไม่รู้เรื่อง', 'ไม่เข้าใจ',
];

// คำบอกการเลือกข้อมูลแบบ single case (Cherry Picking)
// (ลบ "สองคน" standalone ที่กว้างเกินไป — ต้องมี qualifier เช่น "จากการสำรวจสองคน")
const SINGLE_CASE_PHRASES = [
  'เคสคนไข้หนึ่ง', 'เคสหนึ่ง', 'คนไข้หนึ่ง', 'ตัวอย่างหนึ่ง',
  'โรงงานหนึ่ง', 'ร้านหนึ่ง', 'บริษัทหนึ่ง', 'หนึ่งร้าน', 'หนึ่งบริษัท',
  'คนหนึ่ง', 'คนนึง', 'ครั้งเดียว', 'วันเดียว', 'สัปดาห์เดียว', 'เดือนเดียว',
  'ลูกค้าคนหนึ่ง', 'บล็อกเกอร์คนหนึ่ง', 'ดาราดังคนหนึ่ง',
  'นักเรียนคนหนึ่ง', 'พนักงานคนหนึ่ง', 'เด็กคนหนึ่ง',
  'งานวิจัยหนึ่ง', 'งานวิจัยชิ้นเดียว', 'การศึกษาชิ้นเดียว',
  'หุ้นตัวนี้', 'ร้านตัวนี้', 'บริษัทตัวนี้',
  'ลองดูตัวอย่าง', 'ลองดูเคส', 'มาดู', 'ดูตัวอย่าง',
  'ดูสิ', 'ดูออฟฟิศที่', 'ดูร้านที่', 'ดูบริษัทที่',
  'จากการสำรวจพนักงานสองคน', 'จากการสำรวจสองคน',
  'สองร้าน', 'สองบริษัท', 'สองครั้ง', 'สามคน', 'สามร้าน', 'สามครั้ง',
  'ไม่กี่เสียง', 'สองสามอัน', 'ข้อยกเว้น', 'แค่ไม่กี่',
];

// คำบอกการ "ปฏิเสธข้อมูลที่ขัดแย้ง" (Cherry Picking)
const EVIDENCE_REJECTION_PHRASES = [
  'ไม่ต้องไปดูหลักฐานอื่น', 'ไม่ต้องไปดูข้อมูลอื่น', 'ไม่ต้องเปิดดูข้อมูล',
  'ไม่จำเป็นต้องเปิดดู', 'ไม่ต้องดูหลักฐานที่ค้าน', 'ไม่ต้องไปดู',
  'อย่าถามหางานวิจัย', 'อย่าถามหาหลักฐาน', 'ไม่ต้องไปหาหลักฐานอื่น',
  'ข้ามงานวิจัย', 'ข้ามข้อมูล', 'ข้ามปัจจัย', 'ข้ามว่า',
  'ไม่บอกว่า', 'ไม่ได้บอกว่า', 'ไม่กล่าวถึง', 'ละเว้น',
  'เพิกเฉย', 'ไม่นับ', 'ยกเว้น', 'ปิดบัง', 'ซ่อน',
  'เลือกเฉพาะข้อมูลที่สนับสนุน', 'เลือกเฉพาะที่สนับสนุน',
  'เลือกแค่ชิ้นที่สนับสนุน', 'เลือกเฉพาะส่วนที่',
];

// คำบอกการ "อ้างหลักฐานเดียว" + สรุป (Cherry Picking + Hasty Generalization)
const SINGLE_INSTANCE_VERBS = [
  'ลองดู', 'ดูสิ', 'ดูตัวอย่าง', 'มาดู', 'ลองมาดู',
  'เราเห็น', 'เราก็เห็น', 'พบว่า', 'เห็นได้จาก',
];

// คำบอกการ "เปลี่ยนประเด็น" (Red Herring)
const TOPIC_SHIFT_PHRASES = [
  'ทำไมต้องพูดเรื่อง', 'ทำไมต้องถามเรื่อง', 'ทำไมไม่พูดถึง',
  'ในเมื่อ', 'แล้วทำไม...ไม่พูดถึง', 'แต่ที่สำคัญกว่า',
  'เราจะพูดเรื่อง...ทำไม', 'ปล่อยเรื่องนี้ไปก่อน',
  'เลิกพูดเรื่องนี้', 'อย่าพูดเรื่องนั้น', 'ว่าแต่',
  'เอาไว้ที่', 'กลับมาที่', 'มาคุยเรื่อง...ดีกว่า',
  'มาพูดเรื่อง...ดีกว่า', 'แทนที่จะ...มา', 'ปัญหาจริงๆ',
  'ปัญหาที่แท้จริง', 'ปัญหาอยู่ที่', 'ที่สำคัญกว่า',
  'ยิ่งไปกว่านั้น', 'ส่วนเรื่อง', 'อีกเรื่องหนึ่ง',
  'พูดถึงเรื่อง', 'ที่จริงแล้ว', 'อย่างไรก็ตาม',
  'แต่จริงๆ แล้ว', 'สมัยก่อน', 'เมื่อก่อนยุคปู่ย่า',
  'ในสมัยก่อน', 'ตอน...สมัยก่อน', 'จำตอน',
  'รัฐบาลเก่า', 'ที่ผ่านมา', 'ก่อนหน้านี้',
];

// คำบอก causal chain (Slippery Slope)
const CAUSAL_CHAIN_PHRASES = [
  'ถ้า...ต่อไปจะ', 'ถ้า...แล้วจะ', 'ถ้า...สุดท้ายจะ',
  'ถ้า...ในที่สุดจะ', 'ถ้า...ท้ายที่สุดจะ', 'ถ้า...อีกหน่อย',
  'ถ้า...อีกไม่นาน', 'ถ้า...แล้วก็จะ', 'ถ้า...แล้วจะไม่มี',
  'ต่อไปจะ', 'สุดท้ายจะ', 'ในที่สุดจะ', 'ท้ายที่สุดจะ',
  'อีกหน่อยก็จะ', 'อีกไม่นานก็จะ', 'จะลุกลาม', 'จะบานปลาย',
  'จะนำไปสู่', 'จะตามมาด้วย', 'ก้าวสู่', 'เป็นผลให้',
  'จะไม่มีใคร', 'จะไม่มีการ', 'จะเกิด', 'จะกลายเป็น',
];

// คำบอก binary framing (False Dilemma)
const BINARY_PHRASES = [
  'ต้องเลือกเลย', 'ต้องเลือก', 'จะเลือก...หรือจะเลือก',
  'จะ...หรือจะ...', 'จะเชื่อ...หรือจะเชื่อ', 'จะอยู่ข้าง...หรืออยู่ข้าง',
  'ไม่...ก็', 'ถ้าไม่...ก็ต้อง', 'ถ้าไม่...ก็แสดงว่า',
  'ถ้าไม่...=...', 'ก็เท่ากับ', 'ก็แสดงว่า', 'ก็แปลว่า',
  'ทางเลือกเดียว', 'ทางออกเดียว', 'วิธีเดียว', 'มีเพียงสองทาง',
  'ไม่มีทางอื่น', 'นอกจากนี้ไม่มี', 'มิฉะนั้น', 'ไม่งั้น',
  'ไม่ก็ไป', 'ไม่ก็', 'อย่างเดียว', 'เท่านั้นที่จะ',
  '= ไม่', '= สนับสนุน', '= ยอมรับ', '= ไม่อยาก', '= ไม่ห่วง',
];

// คำบอก burden shift (Burden of Proof)
const BURDEN_SHIFT_PHRASES = [
  'พิสูจน์มาสิ', 'พิสูจน์ให้ฉันดู', 'พิสูจน์ให้ได้สิ', 'พิสูจน์ให้เห็นสิ',
  'พิสูจน์ว่าไม่จริง', 'พิสูจน์ว่าไม่ใช่', 'พิสูจน์ว่าไม่',
  'ถ้าพิสูจน์ไม่ได้', 'ถ้าไม่พิสูจน์', 'พิสูจน์ไม่ได้ก็แสดงว่า',
  'ยังไม่มีใครพิสูจน์ว่าไม่', 'ยังไม่มีหลักฐานพิสูจน์ว่าไม่',
  'ไม่มีหลักฐานว่าไม่', 'ไม่เห็นมีใครพิสูจน์',
  'คุณต้องพิสูจน์', 'คุณต่างหากที่ต้องพิสูจน์',
  'เป็นหน้าที่ของคุณ', 'ทำไมไม่พิสูจน์',
  'พวกคุณต้องเป็นคนพิสูจน์', 'พวกคุณเองก็ยังไม่เคยพิสูจน์',
  'แสดงบัญชีมาสิ', 'แสดงหลักฐานมา', 'แสดงว่าไม่จริง',
  'พิสูจน์ไม่ได้ว่า',
];

// คำบอก authority mention (Appeal to Authority)
// (ลบ "ครูใหญ่" standalone ที่กว้างเกินไป — ประโยคปกติ "ครูใหญ่บอกว่า..." ไม่ใช่ AA)
const AUTHORITY_PHRASES = [
  'ผู้เชี่ยวชาญ', 'นักวิทยาศาสตร์', 'ศาสตราจารย์', 'แพทย์', 'หมอ',
  'นักวิจัย', 'ผู้บริหาร', 'ผู้นำ', 'นักเศรษฐศาสตร์', 'นักกฎหมาย',
  'ผู้รู้', 'ผู้ทรงคุณวุฒิ', 'นักปรัชญา', 'นักจิตวิทยา', 'นักฟิสิกส์',
  'นักคณิตศาสตร์', 'ผู้เชี่ยวชาญด้าน', 'ผู้มีอำนาจ', 'ผู้ใหญ่',
  'ด็อกเตอร์', 'ดาราดัง', 'นักแสดง', 'นักกีฬา', 'กูรู',
  'CEO', 'ผู้ว่า', 'รัฐมนตรี', 'นายก', 'นักวิชาการ',
  'ครูบาอาจารย์', 'หัวหน้าเก่า', 'นักโภชนาการ',
  'นักลงทุน', 'บล็อกเกอร์', 'อินฟลูเอนเซอร์', 'กูรูอสังหาริมทรัพย์',
  'นักจิตวิทยาชื่อดัง', 'ฝ่ายไอที', 'ผู้กำกับ',
];

// คำบอก popularity mention (Appeal to Popularity)
const POPULARITY_PHRASES = [
  'คนส่วนใหญ่', 'หลายคน', 'ทุกคน', 'คนเป็นล้าน', 'ส่วนใหญ่',
  'เกือบทั้งหมด', 'คนจำนวนมาก', 'สังคม', 'ประชาชนส่วนใหญ่',
  'คนทั่วไป', 'คนเกือบทั้งหมด', 'คนมากมาย', 'มหาชน', 'เป็นที่นิยม',
  'ทุกคนเชื่อ', 'หลายฝ่าย', 'หลายแหล่ง', 'ใคร ๆ ก็',
  'ใคร ๆ ก็เชื่อ', 'ใคร ๆ ก็ใช้', 'ใคร ๆ ก็เห็นด้วย',
  'คนทั้งโครงการ', 'คนทั้งหมู่บ้าน', 'คนทั้งแผนก', 'คนทั้งบริษัท',
  'สมาชิกส่วนใหญ่', 'ประเทศที่พัฒนาแล้ว', 'หลายประเทศ',
  'ทำเงินสูงสุด', 'ขายดีที่สุด', 'เป็นที่หนึ่ง', 'ดังระดับโลก',
  'พ่อแม่ทุกคน', 'คนส่วนใหญ่ในโพล', 'คนส่วนใหญ่ในกลุ่ม',
];

// คำบอก quantifier (Hasty Generalization)
const UNIVERSAL_QUANTIFIERS = [
  'ทุกคน', 'ทุกครั้ง', 'ทั้งหมด', /(?<!ำ)เสมอ/, 'ไม่เคย', 'ตลอดกาล',
  'ทั้งโลก', 'ทุกที่', 'ทั้งชาติ', 'ไม่มีสัก', 'ทุกคนเลย',
  'ไม่มีข้อยกเว้น', 'ไม่มีใคร', 'ทั้งวงการ', 'สรุปว่า',
  'แสดงถึง', 'แสดงว่าไม่มี', 'นิสัย', 'สรุปได้ว่า',
];

const FEW_INSTANCES_PHRASES = [
  'สองคน', 'สองครั้ง', 'สองร้าน', 'สองวัน', 'สองบริษัท',
  'สามคน', 'สามครั้ง', 'สามร้าน', 'สามวัน', 'สามบริษัท',
  'ครั้งเดียว', 'วันเดียว', 'สัปดาห์เดียว', 'เดือนเดียว',
  'ไม่กี่คน', 'ไม่กี่ครั้ง', 'เพื่อนบ้านสองบ้าน', 'เพื่อนสามคน',
  'นักศึกษาสามคน', 'ผู้จัดการสองคน', 'เพื่อนต่างชาติสองคน',
  'ครั้งเดียวที่', 'วันเดียวที่', 'สัปดาห์เดียวที่',
];

// คำบอก temporal→causal (False Cause)
const TEMPORAL_CAUSAL_PHRASES = [
  'ตั้งแต่', 'วันที่', 'หลังจาก', 'หลังจากที่', 'ตั้งแต่ที่',
  'ตั้งแต่บริษัท', 'ตั้งแต่โรงเรียน', 'ตั้งแต่รัฐบาล',
  'วันที่ไม่ได้', 'วันที่กิน', 'วันที่สวม',
  'หลังจากเปลี่ยน', 'หลังจากเมือง', 'หลังจากบริษัท',
  'ตั้งแต่ดื่ม', 'ตั้งแต่ฟัง', 'ตั้งแต่ติด',
  'พร้อมกัน', 'พร้อม', 'ตรงที่',
];

// คำบอก circular reasoning (เฉพาะที่ชัดเจน — ไม่รวม "เพราะ" standalone ที่กว้างเกินไป)
const CIRCULAR_PHRASES = [
  // Self-reference: "X เพราะมัน X" or "X เพราะ X"
  'ถูกต้องเพราะมันถูกต้อง', 'จริงเพราะมันจริง', 'ดีเพราะมันดี',
  'ถูกเพราะมันถูก', 'ผิดเพราะมันผิด', 'เก่งเพราะมันเก่ง',
  // Definition = self-reference: "X คือ X ที่ Y"
  'ความรักแท้คือความรัก', 'ความจริงคือความจริง', 'ความดีคือความดี', 'ถูกต้องเพราะเป็นกฎหมาย', 'ถูกต้องเพราะเป็น',
  'เพราะมันเป็นความจริง', 'เพราะมันเป็น',
  'เป็นสามัญสำนึก', 'เป็นเรื่องปกติ',
  'เป็นที่ยอมรับ', 'เป็นความจริงที่ทุกคนรู้',
];

// คำบอก straw man distortion
const STRAW_MAN_PHRASES = [
  'คุณคงคิดว่า', 'คุณก็แค่', 'คุณอยาก', 'คุณต้องการที่จะ',
  'คุณสนับสนูนให้', 'คุณเห็นด้วยกับการ', 'คุณจะให้',
  'หรือว่าคุณ', 'แสดงว่าคุณ', 'ก็แสดงว่าคุณ',
  'ก็แปลว่าคุณ', 'แปลว่าคุณ', 'สรุปว่าคุณ',
  'หมายถึงว่าคุณ', 'เข้าใจว่าคุณ', 'คุณกำลังบอกว่า',
  'พวกเขาต้องการ', 'พวกเขาอยาก', 'พวกเขาจะให้',
  'แท้จริงแล้วต้องการ', 'แท้จริงแล้วพวกเขา',
  'คุณไม่คิดถึง', 'คุณไม่ห่วง', 'คุณไม่สน',
  'คุณเสนอให้', 'เธอบอกว่าให้', 'เธอเสนอ',
  'เธอเสนอลด', 'คุณเสนองบ', 'คุณเสนอให้ลด',
  'แค่แนะนำให้ลด', 'แค่แนะนำ',
];

// คำเชื่อมโยงระหว่าง claim กับ straw man
const STRAW_MAN_EXTREME = [
  'ไม่สนใจ', 'ไม่ห่วง', 'ไม่คิดถึง', 'ไม่ต้องการให้เรียน',
  'ไม่ต้องการให้มี', 'อยากให้เลิก', 'อยากให้ไม่มี',
  'อยากให้บริษัทไม่มีกฎ', 'ไม่อยากให้เด็กเรียน',
  'สนับสนูนให้คนเป็นมะเร็ง', 'ต้องการให้เกิดความวุ่นวาย',
  'ต้องการให้เกิดอนาธิปไตย', 'อยากให้ล้มรัฐบาล',
  'ไม่อยากให้เด็กเรียนรู้', 'อยากให้เด็กไม่เรียน',
  'คิดว่ายิ่งใช้เงินยิ่งดี', 'ไม่คิดถึงคน',
  'คิดว่ายิ่งใช้ยิ่งดี', 'ไม่สนใจสวัสดิการ',
  'ไม่เห็นความสำคัญ', 'ไม่เห็น',
];

// ===== NEW: Additional deep patterns (v12 enhancement) =====

// Ad Hominem: Group/identity-based attacks
const GROUP_ATTACK_TERMS = [
  'คนกรุง', 'คนบ้านนอก', 'คนต่างจังหวัด', 'คนเมือง',
  'แรงงานต่างด้าว', 'ผู้อพยพ', 'ชนกลุ่มน้อย',
  'คนรุ่นใหม่', 'คนรุ่นเก่า', 'Gen Z', 'เมื่อยวัย',
];

// Straw Man: "Even you said" pattern
const CONCESSION_TWIST = [
  'แม้แต่คุณเองก็', 'คุณเองก็บอกว่า', 'ตามที่คุณเองเคยพูด',
  'คุณเองก็เคยทำ', 'คุณเองก็ยอมรับว่า',
];

// False Cause: Coincidence markers
const COINCIDENCE_MARKERS = [
  'บังเอิญ', 'โดยบังเอิญ', 'เผอิญ', 'ความบังเอิญ',
  'ลื่นหลับ', 'คาดไม่ถึง', 'ไม่ได้ตั้งใจ',
];

// Appeal to Popularity: Bandwagon markers
const BANDWAGON_PHRASES = [
  'ไม่อยากตกหล่น', 'อยากเป็นเหมือนคนอื่น', 'ทุกคนทำกัน',
  'ใครๆก็ทำ', 'เป็นเทรนด์', 'ตามกระแส',
  'ไม่อยากพลาด', 'ขาดตอน', 'ไม่อยากเสียเปรียบ',
];

// Hasty Generalization: Temporal limited experience
const LIMITED_TIME_PHRASES = [
  'ช่วงนี้', 'เมื่อเร็วๆ นี้', 'ล่าสุด', 'เดี๋ยวนี้',
  'ไม่กี่วันนี้', 'สัปดาห์ที่แล้ว', 'ปีนี้',
];

// Burden of Proof: Negative proof attempt
const NEGATIVE_PROOF_PHRASES = [
  'ยังไม่มีใครพิสูจน์ว่าผิด', 'ไม่มีใครพิสูจน์ว่าไม่จริง',
  'ยังไม่ถูกหักล้าง', 'ยังไม่มีหลักฐานขัดแย้ง',
  'ไม่เคยถูกพิสูจน์ว่าผิด', 'ยังเป็นไปได้',
];

// Cherry Picking: Temporal selection
const TEMPORAL_SELECTION = [
  'เฉพาะช่วง', 'เฉพาะช่วงเวลา', 'เฉพาะเมื่อ',
  'ตอนนั้น', 'ช่วงนั้น', 'เวลานั้น',
  'เลือกช่วง', 'เลือกเวลา',
];

// Red Herring: Appeal to emotion instead of reason
const EMOTION_REDIRECT = [
  'รู้สึก', 'ใจหาย', 'น่าเสียใจ', 'น่าสงสาร',
  'โกรธ', 'เสียใจ', 'เจ็บใจ', 'น้อยใจ',
];

// คำบอก appeal to emotion (ยิ่งเฉพาะเจาะจง)
const EMOTION_APPEAL_PHRASES = [
  'คิดดูสิถ้า', 'จะให้คนตาย', 'น่าสงสาร', 'น่าเสียใจ',
  'ลูกคุณบอกไหม', 'แม่คุณรู้ไหม', 'ถ้าเป็นลูกคุณ', 'ถ้าเป็นครอบครัวคุณ',
  'ใจหาย', 'น้ำตาไหล', 'ร้องไห้', 'ทุกข์ทรมาน',
  'น่ากลัว', 'น่าหวาดเหียน', 'อย่าให้เกิด', 'ใครจะกล้า',
  'ไม่มีหัวใจ', 'โหดร้าย', 'เห็นแก่ตัว', 'ไม่สนใจความรู้สึก',
  'คิดถึงครอบครัว', 'อย่าทำให้เสียใจ', 'เห็นใจหน่อย',
  'สมปรารถนา', 'อิจฉา', 'ริษยา', 'เบื่อหน่าย',
  'ช่วยเหลือด้วย', 'เขาก็น่าสงสาร', 'ใจดีหน่อย',
  'น่าเวทนา', 'สะเทือนใจ', 'น่ารังเกียจ',
  'กลัวว่าจะ', 'ไม่อยากให้เกิด', 'หากคุณลองนึกภาพ',
];

// คำบอก appeal to tradition
const TRADITION_PHRASES = [
  'ทำกันมาตลอด', 'ปู่ย่าทำกันมา', 'สมัยก่อนดีกว่า',
  'ที่เป็นอยู่แบบนี้มา', 'มาตั้งแต่สมัย', 'ไม่เคยมีใครเปลี่ยน',
  'เป็นธรรมเนียมที่ถูกต้อง', 'คนรุ่นก่อนทำกันมา',
  'สืบทอดกันมาหลายชั่วคน', 'บรรพบุรุษเคยทำ',
  'ที่ถูกต้องเพราะมานาน', 'มีมาตั้งแต่เดิม',
  'อย่าเปลี่ยนสิ่งที่ดี', 'เปลี่ยนแล้วจะเลว',
  'ตามแบบฉบับ', 'ตามที่เป็นมา', 'อย่าลืมว่าเราทำกันมา',
  'เป็นเรื่องของความเชื่อ', 'เคยทำกันในสมัยก่อน',
  'ไม่ใช่เรื่องใหม่', 'คนเก่าทำกันมาแล้ว',
  'ดั้งเดิมดีกว่า', 'แบบเดิมปลอดภัยกว่า',
];

// คำบอก appeal to nature
const NATURE_PHRASES = [
  'ธรรมชาติสร้างมาดีกว่า', 'ออร์แกนิกปลอดภัยกว่า',
  'ไม่มีสารเคมีจึงดี', 'สิ่งที่เป็นธรรมชาติไม่เป็นอันตราย',
  'ธรรมชาติคือดีที่สุด', 'จากธรรมชาติจึงปลอดภัย',
  'สมุนไพรดีกว่ายา', 'ธรรมชาติบำบัดดีกว่า',
  'ไม่ผ่านกระบวนการจึงปลอดภัย', 'ของธรรมชาติไม่มีผลข้างเคียง',
  'ธรรมชาติรู้ดี', 'ร่างกายต้องการสิ่งที่เป็นธรรมชาติ',
  'สิ่งที่มนุษย์ทำมักมีพิษ', 'ธรรมชาติจัดการให้',
  'ผลิตภัณฑ์ธรรมชาติ', 'อาหารจากธรรมชาติ',
  'อย่างธรรมชาติดีกว่า', 'วิธีธรรมชาติ',
  'สารสกัดจากธรรมชาติ', 'ธรรมชาติไม่ผิด',
];

// คำบอก tu quoque
const TU_QUOQUE_PHRASES = [
  'คุณก็ทำเหมือนกัน', 'ก่อนจะว่าใครดูตัวเองก่อน',
  'คุณเองก็ไม่ได้ดีกว่า', 'แล้วคุณล่ะทำอะไรบ้าง',
  'คุณเองก็ทำผิด', 'ใครจะว่าใคร', 'คุณไม่เคยทำเหมือนกันหรือ',
  'ดูตัวเองก่อนสิ', 'คนที่อยู่ในกระจก', 'ก่อนจะมาสอนเรา',
  'คุณล่ะทำอะไรบ้าง', 'แล้วตัวคุณเองล่ะ',
  'ก่อนจะว่าผม', 'ก่อนจะว่าเรา', 'คุณก็เคยทำแบบนี้',
  'ใครบอกว่าคุณบริสุทธิ์', 'ลูกกระจก',
  'คุณไม่เคยโกหกเหรอ', 'คุณเองก็หลงก่อน',
  'มองกระจกดูตัวเอง', 'ปากทางไหนก็ว่าคนอื่น',
];

// คำบอก false analogy
const FALSE_ANALOGY_CONNECTORS = [
  'เหมือนกันดังนั้น', 'คล้ายกับดังนั้น', 'เปรียบเหมือนดังนั้น',
  'เช่นเดียวกับจึง', 'ดังเช่นดังนั้น', 'ดังที่เห็นดังนั้น',
  'เหมือน...ดังนั้น', 'คล้าย...จึง', 'เปรียบเทียบ...ดังนั้น',
];

// คำบอก stereotyping
const STEREOTYPE_GROUP_LABELS = [
  'คนอ้วนทุกคน', 'คนจนทุกคน', 'วัยรุ่นทุกคน', 'ผู้ชายทุกคน',
  'ผู้หญิงทุกคน', 'คนเมืองทุกคน', 'นักการเมืองทุกคน',
  'ข้าราชการทุกคน', 'คนรุ่นใหม่ทุกคน', 'แม่บ้านทุกคน',
  'คนต่างชาติทุกคน', 'พนักงานรัฐทุกคน', 'หมอทุกคน',
  'วิศวะทุกคน', 'ทนายทุกคน', 'คนรวยทุกคน',
  'คนบ้านนอกทุกคน', 'เด็กจบใหม่ทุกคน',
  'คนเหนือทุกคน', 'คนใต้ทุกคน', 'คนอีสานทุกคน',
  'คนต่างศาสนาทุกคน', 'ผู้สูงอายุทุกคน',
  'คนอ้วนล้วน', 'คนจนล้วน', 'วัยรุ่นล้วน', 'ผู้ชายล้วน',
  'ผู้หญิงล้วน', 'นักการเมืองพวกนี้', 'ข้าราชการพวกนี้',
  'คนรุ่นใหม่พวกนี้', 'พวกคนรวย', 'พวกคนจน',
];

// คำบอก superstition
const SUPERSTITION_PHRASES = [
  'กินอะไรจะรวย', 'ใส่อะไรจะโชคดี', 'ห้ามอะไรไม่งั้นจะ',
  'ดวงตก', 'ดวงดับ', 'ฝันร้ายเป็นลาง', 'ของขลังช่วย',
  'ดาวไม่ดี', 'ราศีไม่ดี', 'ดูดวงแล้วบอก', 'โหราศาสตร์บอก',
  'ปีชง', 'ของร้าง', 'กรงหลวง', 'ผ้ายันต์',
  'เสริมดวง', 'ของเสริมดวง', 'สีมงคล', 'ทาสีเขียว',
  'ของดีมาก', 'ของขลังแรง', 'คาถาป้องกัน',
  'ปลุกเสกแล้ว', 'น้ำมนต์พระ', 'พิธีกรรมแล้วจะ',
  'ลางร้าย', 'ลางดี', 'ฝันว่า', 'ฝันเห็น',
  'วันศุกร์ที่ 13', 'จักร', 'สิ่งศักดิ์สิทธิ์',
  'ดวงโชค', 'โชคร้าย', 'โชคดี', 'บุญ',
  'กรรม', 'เวรกรรม', 'นำโชคมา', 'ชะตากรรม',
];

// ============================================================
// DeepFeatures Interface
// ============================================================

export interface DeepFeatures {
  // Ad Hominem detection
  personAttack: {
    detected: boolean;
    target: 'identity' | 'character' | 'credential' | 'behavior' | 'none';
    attackTerms: string[];
    hasDismissal: boolean;       // มีการ dismiss argument หลังโจมตี
    attackThenDismissal: boolean; // โจมตี + dismiss = AH แท้
  };
  // Straw Man detection
  strawMan: {
    detected: boolean;
    hasDistortion: boolean;      // มีการตีความข้อโต้แย้งฝ่ายตรงข้าม
    hasExtreme: boolean;         // มีการขยายสู่ขั้วสุด
    distortionThenExtreme: boolean;
    terms: string[];
  };
  // Red Herring detection
  redHerring: {
    detected: boolean;
    hasTopicShift: boolean;
    shiftMarkers: string[];
    topicCount: number;          // จำนวนประเด็นที่เปลี่ยน
  };
  // False Dilemma detection
  falseDilemma: {
    detected: boolean;
    hasBinary: boolean;
    hasForcedChoice: boolean;
    binaryTerms: string[];
  };
  // Hasty Generalization detection
  hastyGeneralization: {
    detected: boolean;
    hasUniversal: boolean;
    hasFewInstances: boolean;
    universalThenFew: boolean;   // สรุปสากล + อ้างตัวอย่างน้อย
    universalTerms: string[];
    fewTerms: string[];
  };
  // False Cause detection
  falseCause: {
    detected: boolean;
    hasTemporal: boolean;
    hasCausalClaim: boolean;
    temporalThenCausal: boolean;
    terms: string[];
  };
  // Appeal to Authority detection
  appealToAuthority: {
    detected: boolean;
    hasAuthority: boolean;
    authorityIsEvidence: boolean; // authority เป็นหลักฐานหลัก
    terms: string[];
  };
  // Appeal to Popularity detection
  appealToPopularity: {
    detected: boolean;
    hasPopularity: boolean;
    popularityIsEvidence: boolean;
    terms: string[];
  };
  // Slippery Slope detection
  slipperySlope: {
    detected: boolean;
    chainLength: number;
    hasCausalChain: boolean;
    terms: string[];
  };
  // Circular Reasoning detection
  circularReasoning: {
    detected: boolean;
    hasCircularPhrase: boolean;
    hasTermRepetition: boolean;
    repeatedTerms: string[];
  };
  // Cherry Picking detection
  cherryPicking: {
    detected: boolean;
    hasSingleCase: boolean;
    hasEvidenceRejection: boolean;
    singleCaseTerms: string[];
    rejectionTerms: string[];
  };
  // Burden of Proof detection
  burdenOfProof: {
    detected: boolean;
    hasBurdenShift: boolean;
    hasAbsenceClaim: boolean;    // "no one can disprove" = true
    terms: string[];
  };
  // v12 enhancement fields
  hasGroupAttack: boolean;
  hasConcessionTwist: boolean;
  hasCoincidenceMarker: boolean;
  hasBandwagon: boolean;
  hasLimitedTime: boolean;
  hasNegativeProof: boolean;
  hasTemporalSelection: boolean;
  hasEmotionRedirect: boolean;
  // v2 — 7 ประเภทใหม่
  appealToEmotion: {
    detected: boolean;
    hasEmotionAppeal: boolean;
    hasVictimCard: boolean;
    hasFearAppeal: boolean;
    terms: string[];
  };
  appealToTradition: {
    detected: boolean;
    hasTraditionAppeal: boolean;
    hasAntiChange: boolean;
    terms: string[];
  };
  appealToNature: {
    detected: boolean;
    hasNatureAppeal: boolean;
    hasAntiSynthetic: boolean;
    terms: string[];
  };
  tuQuoque: {
    detected: boolean;
    hasHypocrisyCallout: boolean;
    hasMirrorArgument: boolean;
    terms: string[];
  };
  falseAnalogy: {
    detected: boolean;
    hasComparison: boolean;
    hasFalseConclusion: boolean;
    terms: string[];
  };
  stereotyping: {
    detected: boolean;
    hasGroupLabel: boolean;
    hasUniversalTrait: boolean;
    terms: string[];
  };
  superstition: {
    detected: boolean;
    hasSuperstitionClaim: boolean;
    hasCausalSuperstition: boolean;
    terms: string[];
  };
}

// ============================================================
// DeepAnalyzer class
// ============================================================

export class DeepAnalyzer {
  analyze(text: string, sentences: Sentence[], structure: ArgumentStructure): DeepFeatures {
    const lower = text;
    return {
      personAttack: this.detectPersonAttack(lower, sentences),
      strawMan: this.detectStrawMan(lower, sentences),
      redHerring: this.detectRedHerring(lower, sentences, structure),
      falseDilemma: this.detectFalseDilemma(lower, sentences),
      hastyGeneralization: this.detectHastyGeneralization(lower, sentences),
      falseCause: this.detectFalseCause(lower, sentences),
      appealToAuthority: this.detectAppealToAuthority(lower, sentences),
      appealToPopularity: this.detectAppealToPopularity(lower, sentences),
      slipperySlope: this.detectSlipperySlope(lower, sentences),
      circularReasoning: this.detectCircularReasoning(lower, sentences),
      cherryPicking: this.detectCherryPicking(lower, sentences),
      burdenOfProof: this.detectBurdenOfProof(lower, sentences),
      // v12 enhancement detections
      hasGroupAttack: this.detectGroupAttack(lower).detected,
      hasConcessionTwist: this.detectConcessionTwist(lower).detected,
      hasCoincidenceMarker: this.detectCoincidenceVsCause(lower).detected,
      hasBandwagon: this.detectBandwagon(lower).detected,
      hasLimitedTime: this.detectLimitedTimeGeneralization(lower).detected,
      hasNegativeProof: this.detectNegativeProof(lower).detected,
      hasTemporalSelection: this.detectTemporalSelection(lower).detected,
      hasEmotionRedirect: this.detectEmotionRedirect(lower).detected,
      // v2 — 7 ประเภทใหม่
      appealToEmotion: this.detectAppealToEmotion(lower),
      appealToTradition: this.detectAppealToTradition(lower),
      appealToNature: this.detectAppealToNature(lower),
      tuQuoque: this.detectTuQuoque(lower),
      falseAnalogy: this.detectFalseAnalogy(lower),
      stereotyping: this.detectStereotyping(lower),
      superstition: this.detectSuperstition(lower),
    };
  }

  // ----- Ad Hominem: โจมตีบุคคล + dismissal -----
  private detectPersonAttack(text: string, sentences: Sentence[]) {
    const allAttackTerms = [
      ...PERSON_ATTACK_IDENTITY,
      ...PERSON_ATTACK_CHARACTER,
      ...PERSON_ATTACK_CREDENTIAL,
      ...PERSON_ATTACK_BEHAVIOR,
    ];
    const attackTerms = allAttackTerms.filter((t) => text.includes(t));
    const hasAttack = attackTerms.length > 0;

    // ระบุ target type
    let target: DeepFeatures['personAttack']['target'] = 'none';
    if (PERSON_ATTACK_IDENTITY.some((t) => text.includes(t))) target = 'identity';
    else if (PERSON_ATTACK_CHARACTER.some((t) => text.includes(t))) target = 'character';
    else if (PERSON_ATTACK_CREDENTIAL.some((t) => text.includes(t))) target = 'credential';
    else if (PERSON_ATTACK_BEHAVIOR.some((t) => text.includes(t))) target = 'behavior';

    // ตรวจ dismissal
    const hasDismissal = DISMISSAL_PHRASES.some((p) => text.includes(p));

    // AH แท้ = โจมตี + dismiss ข้อโต้แย้ง
    const attackThenDismissal = hasAttack && hasDismissal;

    return {
      detected: hasAttack,
      target,
      attackTerms,
      hasDismissal,
      attackThenDismissal,
    };
  }

  // ----- Straw Man: distortion + extreme -----
  private detectStrawMan(text: string, sentences: Sentence[]) {
    const distortionTerms = STRAW_MAN_PHRASES.filter((p) => text.includes(p));
    const extremeTerms = STRAW_MAN_EXTREME.filter((p) => text.includes(p));
    const hasDistortion = distortionTerms.length > 0;
    const hasExtreme = extremeTerms.length > 0;
    // SM แท้ = ตีความข้อโต้แย้ง + ขยายสู่ขั้วสุด
    const distortionThenExtreme = hasDistortion && hasExtreme;
    return {
      detected: hasDistortion || hasExtreme,
      hasDistortion,
      hasExtreme,
      distortionThenExtreme,
      terms: [...distortionTerms, ...extremeTerms],
    };
  }

  // ----- Red Herring: topic shift -----
  private detectRedHerring(text: string, sentences: Sentence[], structure: ArgumentStructure) {
    const shiftMarkers = TOPIC_SHIFT_PHRASES.filter((p) => text.includes(p));
    const hasTopicShift = shiftMarkers.length > 0;
    // นับจำนวนประเด็นที่เปลี่ยน (heuristic: นับ markers + topic keywords ที่ต่างกัน)
    const topicCount = structure.topicKeywords.length;
    return {
      detected: hasTopicShift,
      hasTopicShift,
      shiftMarkers,
      topicCount,
    };
  }

  // ----- False Dilemma: binary framing + forced choice -----
  private detectFalseDilemma(text: string, sentences: Sentence[]) {
    const binaryTerms = BINARY_PHRASES.filter((p) => text.includes(p));
    const hasBinary = binaryTerms.length > 0;
    const hasForcedChoice = /ต้องเลือก|จะเลือก|จะเชื่อ|จะอยู่ข้าง/.test(text);
    return {
      detected: hasBinary || hasForcedChoice,
      hasBinary,
      hasForcedChoice,
      binaryTerms,
    };
  }

  // ----- Hasty Generalization: universal + few instances -----
  private detectHastyGeneralization(text: string, sentences: Sentence[]) {
    const universalTerms = UNIVERSAL_QUANTIFIERS.filter((t) =>
      typeof t === 'string' ? text.includes(t) : t.test(text),
    );
    const fewTerms = FEW_INSTANCES_PHRASES.filter((p) => text.includes(p));
    const hasUniversal = universalTerms.length > 0;
    const hasFewInstances = fewTerms.length > 0;
    // HG แท้ = อ้างคำสากล + อ้างตัวอย่างน้อย (quantifier mismatch)
    const universalThenFew = hasUniversal && hasFewInstances;
    return {
      detected: hasUniversal,
      hasUniversal,
      hasFewInstances,
      universalThenFew,
      universalTerms: universalTerms.map((t) => (typeof t === 'string' ? t : t.source)),
      fewTerms,
    };
  }

  // ----- False Cause: temporal → causal -----
  private detectFalseCause(text: string, sentences: Sentence[]) {
    const temporalTerms = TEMPORAL_CAUSAL_PHRASES.filter((p) => text.includes(p));
    const hasTemporal = temporalTerms.length > 0;
    // causal claim: หลัง temporal มี "ทำให้", "ส่งผลให้", "เป็นเหตุ", "เพราะ", "จึง"
    // + "ป้องกัน", "ลด", "รักษา", "นำโชค", "ทำให้แข็งแรง", "ช่วย"
    const causalClaimPattern = /(ทำให้|ส่งผลให้|เป็นเหตุให้|จึง|เพราะ|นำไปสู่|ก่อให้เกิด|แสดงว่า|สรุปว่า|ป้องกัน|ลดน้ำหนัก|รักษาได้|นำโชค|ทำให้แข็งแรง|ช่วยให้|ช่วย|ป้องกันโรค|ลดได้|รักษา|นำโชคมา|ทำให้งานดี|ทำให้.{0,10}ขึ้น)/;
    const hasCausalClaim = causalClaimPattern.test(text);
    // FC แท้ = temporal + causal claim (เหตุการณ์หนึ่งก่อน→อีกเหตุการณ์หลัง = เหตุ)
    const temporalThenCausal = hasTemporal && hasCausalClaim;
    return {
      detected: temporalThenCausal,
      hasTemporal,
      hasCausalClaim,
      temporalThenCausal,
      terms: temporalTerms,
    };
  }

  // ----- Appeal to Authority -----
  private detectAppealToAuthority(text: string, sentences: Sentence[]) {
    const terms = AUTHORITY_PHRASES.filter((p) => text.includes(p));
    const hasAuthority = terms.length > 0;
    // authority เป็นหลักฐานหลัก: มี "บอกว่า", "แนะนำ", "เชื่อ", "รับรอง", "ยืนยัน" หลัง authority
    const authorityIsEvidence = hasAuthority && /(บอกว่า|แนะนำ|เชื่อ|รับรอง|ยืนยัน|สอน|พูด|บอก|แนะนำให้)/.test(text);
    return {
      detected: hasAuthority,
      hasAuthority,
      authorityIsEvidence,
      terms,
    };
  }

  // ----- Appeal to Popularity -----
  private detectAppealToPopularity(text: string, sentences: Sentence[]) {
    const terms = POPULARITY_PHRASES.filter((p) => text.includes(p));
    const hasPopularity = terms.length > 0;
    // popularity เป็นหลักฐาน: "จึงต้อง", "ต้องดี", "ต้องถูก", "แน่", "จริง"
    const popularityIsEvidence = hasPopularity && /(ต้อง|จึง|แน่|จริง|ก็|แสดงว่า|สรุป)/.test(text);
    return {
      detected: hasPopularity,
      hasPopularity,
      popularityIsEvidence,
      terms,
    };
  }

  // ----- Slippery Slope: causal chain -----
  private detectSlipperySlope(text: string, sentences: Sentence[]) {
    const terms = CAUSAL_CHAIN_PHRASES.filter((p) => text.includes(p));
    // นับจำนวน "ถ้า...จะ" patterns ใน text
    const ifCount = (text.match(/ถ้า/g) || []).length;
    const willCount = (text.match(/จะ/g) || []).length;
    // chain length: จำนวน if-then pairs (heuristic)
    const chainLength = Math.min(ifCount, willCount);
    const hasCausalChain = terms.length > 0 || (ifCount >= 1 && willCount >= 2);
    return {
      detected: hasCausalChain,
      chainLength,
      hasCausalChain,
      terms,
    };
  }

  // ----- Circular Reasoning: phrase + term repetition -----
  private detectCircularReasoning(text: string, sentences: Sentence[]) {
    const hasCircularPhrase = CIRCULAR_PHRASES.some((p) => text.includes(p));
    // term repetition: strict มาก — ต้องมี phrase ที่ยาว >= 8 ตัวอักษรที่ซ้ำกัน
    // และเป็น phrase ที่ "meaningful" (มีแก่นความหมาย)
    const repeatedTerms = this.findRepeatedPhrases(text);
    const hasTermRepetition = repeatedTerms.length > 0;
    // ต้องมี BOTH: circular phrase AND term repetition เพื่อลด false positive
    // หรือมี term repetition ที่ยาวมาก (>= 15 ตัว) — เพิ่มจาก 10 → 15 เพื่อลด false positive อย่างมาก
    // (phrase 12 ตัวเช่น "ครูคนนี้เก่ง" ซ้ำกันไม่ใช่ circular แท้ — เป็นแค่ repetition ของ conclusion)
    // circular แท้ต้องเป็น phrase ยาวที่เป็น self-reference เช่น "เป็นความจริงเพราะเป็นความจริง"
    const strongCircular = hasTermRepetition && repeatedTerms.some((p) => p.length >= 15);
    // เพิ่ม: ตรวจ circular แบบ "A เพราะ B และ B ... A" (mutual reference)
    // เช่น "กฎนี้ยุติธรรมเพราะคณะกรรมการอนุมัติ และคณะกรรมการอนุมัติสิ่งที่ยุติธรรม"
    // รูปแบบ: เพราะ X และ X (ย้อนกลับมาที่ concept เดิม)
    const hasMutualReference = /เพราะ.{3,25}และ.{0,10}\S{3,15}.{0,5}(ยุติธรรม|น่าเชื่อถือ|ถูกต้อง|ดี|จริง)/.test(text);
    return {
      detected: hasCircularPhrase || strongCircular || hasMutualReference,
      hasCircularPhrase,
      hasTermRepetition: strongCircular,
      repeatedTerms,
    };
  }

  // ----- Cherry Picking: single case + evidence rejection -----
  private detectCherryPicking(text: string, sentences: Sentence[]) {
    const singleCaseTerms = SINGLE_CASE_PHRASES.filter((p) => text.includes(p));
    const rejectionTerms = EVIDENCE_REJECTION_PHRASES.filter((p) => text.includes(p));
    const hasSingleCase = singleCaseTerms.length > 0;
    const hasEvidenceRejection = rejectionTerms.length > 0;
    // CP แท้ = single case OR evidence rejection
    const detected = hasSingleCase || hasEvidenceRejection;
    return {
      detected,
      hasSingleCase,
      hasEvidenceRejection,
      singleCaseTerms,
      rejectionTerms,
    };
  }

  // ----- Burden of Proof: burden shift + absence claim -----
  private detectBurdenOfProof(text: string, sentences: Sentence[]) {
    const terms = BURDEN_SHIFT_PHRASES.filter((p) => text.includes(p));
    const hasBurdenShift = terms.length > 0;
    // absence claim: "ยังไม่มีใครพิสูจน์", "ไม่มีหลักฐาน"
    const hasAbsenceClaim = /(ยังไม่มีใครพิสูจน์|ยังไม่มีหลักฐาน|ไม่มีหลักฐานว่า|ไม่เห็นมีใคร|ไม่มีใครพิสูจน์)/.test(text);
    return {
      detected: hasBurdenShift || hasAbsenceClaim,
      hasBurdenShift,
      hasAbsenceClaim,
      terms,
    };
  }

  // ----- v12 Enhancement: Group Attack -----
  detectGroupAttack(text: string): { detected: boolean; details: string } {
    const found = GROUP_ATTACK_TERMS.filter(t => text.includes(t));
    if (found.length > 0) {
      return { detected: true, details: `พบการโจมตีกลุ่ม: ${found.join(', ')}` };
    }
    return { detected: false, details: '' };
  }

  // ----- v12 Enhancement: Concession Twist -----
  detectConcessionTwist(text: string): { detected: boolean; details: string } {
    const found = CONCESSION_TWIST.filter(t => text.includes(t));
    if (found.length > 0) {
      return { detected: true, details: `พบการบิดเบือนการยอมรับ: ${found.join(', ')}` };
    }
    return { detected: false, details: '' };
  }

  // ----- v12 Enhancement: Coincidence vs Cause -----
  detectCoincidenceVsCause(text: string): { detected: boolean; details: string } {
    const hasCausal = CAUSAL_CHAIN_PHRASES.some(p => text.includes(p));
    const hasCoincidence = COINCIDENCE_MARKERS.some(p => text.includes(p));
    if (hasCausal && hasCoincidence) {
      return { detected: true, details: 'พบการสันนิษฐานเหตุผลจากความบังเอิญ' };
    }
    return { detected: false, details: '' };
  }

  // ----- v12 Enhancement: Bandwagon -----
  detectBandwagon(text: string): { detected: boolean; details: string } {
    const found = BANDWAGON_PHRASES.filter(t => text.includes(t));
    if (found.length > 0) {
      return { detected: true, details: `พบการอ้างกระแสสังคม: ${found.join(', ')}` };
    }
    return { detected: false, details: '' };
  }

  // ----- v12 Enhancement: Limited Time Generalization -----
  detectLimitedTimeGeneralization(text: string): { detected: boolean; details: string } {
    const hasLimitedTime = LIMITED_TIME_PHRASES.some(t => text.includes(t));
    const hasUniversal = UNIVERSAL_QUANTIFIERS.some(t => typeof t === 'string' ? text.includes(t) : t.test(text));
    if (hasLimitedTime && hasUniversal) {
      return { detected: true, details: 'พบการสรุปจากช่วงเวลาจำกัด' };
    }
    return { detected: false, details: '' };
  }

  // ----- v12 Enhancement: Negative Proof -----
  detectNegativeProof(text: string): { detected: boolean; details: string } {
    const found = NEGATIVE_PROOF_PHRASES.filter(t => text.includes(t));
    if (found.length > 0) {
      return { detected: true, details: `พบการอ้างหลักฐานเชิงลบ: ${found.join(', ')}` };
    }
    return { detected: false, details: '' };
  }

  // ----- v12 Enhancement: Temporal Selection -----
  detectTemporalSelection(text: string): { detected: boolean; details: string } {
    const hasTempSelection = TEMPORAL_SELECTION.filter(t => text.includes(t)).length >= 2;
    const hasSelective = EVIDENCE_REJECTION_PHRASES.some(t => text.includes(t));
    if (hasTempSelection || (hasTempSelection && hasSelective)) {
      return { detected: true, details: 'พบการเลือกช่วงเวลา' };
    }
    return { detected: false, details: '' };
  }

  // ----- v12 Enhancement: Emotion Redirect -----
  detectEmotionRedirect(text: string): { detected: boolean; details: string } {
    const hasEmotion = EMOTION_REDIRECT.filter(t => text.includes(t)).length >= 2;
    const hasDiversion = TOPIC_SHIFT_PHRASES.some(t => text.includes(t));
    if (hasEmotion && hasDiversion) {
      return { detected: true, details: 'พบการเบี่ยงเบนไปยังอารมณ์' };
    }
    return { detected: false, details: '' };
  }

  // ===== v2: Appeal to Emotion =====
  private detectAppealToEmotion(text: string) {
    const terms = EMOTION_APPEAL_PHRASES.filter(p => text.includes(p));
    const hasEmotionAppeal = terms.length > 0;
    const hasVictimCard = /ถ้าเป็น(ลูก|ครอบครัว|แม่|พ่อ|ญาติ|ตัวเอง)/.test(text);
    const hasFearAppeal = /(กลัว|น่ากลัว|อันตราย|เสียชีวิต|ตาย|เจ็บปวด|ทุกข์|เดือดร้อน)/.test(text);
    return {
      detected: hasEmotionAppeal || (hasVictimCard && hasFearAppeal),
      hasEmotionAppeal,
      hasVictimCard,
      hasFearAppeal,
      terms,
    };
  }

  // ===== v2: Appeal to Tradition =====
  private detectAppealToTradition(text: string) {
    const terms = TRADITION_PHRASES.filter(p => text.includes(p));
    const hasTraditionAppeal = terms.length > 0;
    const hasAntiChange = /(ไม่ควรเปลี่ยน|อย่าเปลี่ยน|เปลี่ยนแล้วเลว|แบบเดิมดีกว่า|ดั้งเดิมดีกว่า|ไม่ใช่เรื่องใหม่)/.test(text);
    return {
      detected: hasTraditionAppeal,
      hasTraditionAppeal,
      hasAntiChange,
      terms,
    };
  }

  // ===== v2: Appeal to Nature =====
  private detectAppealToNature(text: string) {
    const terms = NATURE_PHRASES.filter(p => text.includes(p));
    const hasNatureAppeal = terms.length > 0;
    const hasAntiSynthetic = /(ไม่มีสารเคมี|ไม่ผ่านกระบวนการ|ธรรมชาติไม่ผิด|ธรรมชาติดีกว่า|สิ่งที่มนุษย์ทำมีพิษ|ธรรมชาติรู้ดี|ไม่มีผลข้างเคียง)/.test(text);
    return {
      detected: hasNatureAppeal,
      hasNatureAppeal,
      hasAntiSynthetic,
      terms,
    };
  }

  // ===== v2: Tu Quoque =====
  private detectTuQuoque(text: string) {
    const terms = TU_QUOQUE_PHRASES.filter(p => text.includes(p));
    const hasHypocrisyCallout = terms.length > 0;
    const hasMirrorArgument = /(คุณก็|คุณเองก็|คุณล่ะ|คุณไม่เคย|คุณเองก็ทำ)/.test(text);
    return {
      detected: hasHypocrisyCallout || hasMirrorArgument,
      hasHypocrisyCallout,
      hasMirrorArgument,
      terms,
    };
  }

  // ===== v2: False Analogy =====
  private detectFalseAnalogy(text: string) {
    const terms = FALSE_ANALOGY_CONNECTORS.filter(p => text.includes(p));
    const hasComparison = /(เหมือน|คล้าย|เปรียบ|ดัง|เช่นเดียวกับ)/.test(text) && /(ดังนั้น|จึง|ก็|แสดงว่า|สรุป)/.test(text);
    const hasFalseConclusion = terms.length > 0;
    return {
      detected: hasComparison || hasFalseConclusion,
      hasComparison,
      hasFalseConclusion,
      terms,
    };
  }

  // ===== v2: Stereotyping =====
  private detectStereotyping(text: string) {
    const terms = STEREOTYPE_GROUP_LABELS.filter(p => text.includes(p));
    const hasGroupLabel = terms.length > 0;
    const hasUniversalTrait = /ทุกคน|ทุกครั้ง|ล้วน|ทั้งหมด|เสมอ|ทุกคนใน/.test(text) && /(ขี้เกียจ|โง่|ไม่รับผิดชอบ|หลอก|เกลียด|ไม่ดี|ไม่ซื่อ|โกหก|ขี้โกหก|ใจร้าย|เห็นแก่ตัว|ชอบบ่น|ชอบบ่น|ไม่มีปัญญา|ไม่รู้เรื่อง)/.test(text);
    return {
      detected: hasGroupLabel || hasUniversalTrait,
      hasGroupLabel,
      hasUniversalTrait,
      terms,
    };
  }

  // ===== v2: Superstition =====
  private detectSuperstition(text: string) {
    const terms = SUPERSTITION_PHRASES.filter(p => text.includes(p));
    const hasSuperstitionClaim = terms.length > 0;
    const hasCausalSuperstition = /(ทำให้|ช่วย|ป้องกัน|นำโชค|เป็นลาง|บอกล่วงหน้า|ทำนาย)/.test(text) && /(ดวง|โชค|ของขลัง|คาถา|ฝัน|ลาง|ดาว|ราศี|กรรม|บุญ|ผ้ายันต์|พิธี)/.test(text);
    return {
      detected: hasSuperstitionClaim || hasCausalSuperstition,
      hasSuperstitionClaim,
      hasCausalSuperstition,
      terms,
    };
  }

  // ค้นหา phrase ที่ซ้ำกัน (สำหรับ Circular Reasoning) — strict มาก
  // ต้องเป็น phrase ที่ยาว >= 5 ตัวอักษร และไม่ใช่คำสันธาน/บุพบท/คำทั่วไป
  private findRepeatedPhrases(text: string): string[] {
    // คำที่ไม่นับเป็น "circular" (common words, conjunctions, pronouns)
    const STOP_WORDS = new Set([
      'ที่', 'และ', 'หรือ', 'ไม่', 'เป็น', 'มี', 'จะ', 'ก็', 'ให้', 'ได้',
      'คุณ', 'เขา', 'เธอ', 'พวก', 'เรา', 'ฉัน', 'ผม', 'มัน', 'กัน',
      'เพราะ', 'จึง', 'แล้ว', 'กับ', 'ของ', 'ใน', 'บน', 'ไป', 'มา',
      'นี้', 'นั้น', 'นู้น', 'ไหน', 'อะไร', 'ยังไง', 'อย่าง', 'แบบ',
      'เพื่อ', 'ว่า', 'ใหม่', 'ทุก', 'บาง', 'ก่อน', 'หลัง', 'ต่อ',
      'อีก', 'เดียว', 'เท่า', 'มาก', 'น้อย', 'ดี', 'เลว', 'ต้อง',
      'คน', 'เรื่อง', 'การ', 'ทาง', 'อย่างเดียว', 'แค่', 'ก็แค่',
      'ส่วน', 'ถ้า', 'ก็เพราะ', 'นอกจาก', 'แต่', 'อย่างไรก็ตาม',
      'โดย', 'ผ่าน', 'พร้อม', 'ตาม', 'อัน', 'ครั้ง', 'วัน', 'ปี',
      'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'ไม่กี่',
    ]);

    const phrases: string[] = [];
    const minLen = 5;
    const maxLen = 14;
    const clean = text.replace(/[\s.,!?;:()"'']/g, '');
    const seen = new Map<string, number>();
    for (let len = minLen; len <= maxLen; len++) {
      for (let i = 0; i <= clean.length - len; i++) {
        const phrase = clean.substring(i, i + len);
        const count = (seen.get(phrase) ?? 0) + 1;
        seen.set(phrase, count);
        if (count === 2 && phrase.length >= 5) {
          // ตรวจว่า phrase มีแค่ stop words หรือไม่ (อย่างน้อยต้องมีคำที่ไม่ใช่ stop word)
          // สำหรับภาษาไทย เราแบ่งคำไม่ได้ง่าย — ใช้ heuristic: phrase ต้องไม่อยู่ใน STOP_WORDS
          if (!STOP_WORDS.has(phrase) && phrase.length >= 5) {
            phrases.push(phrase);
          }
        }
      }
    }
    const unique = [...new Set(phrases)];
    unique.sort((a, b) => b.length - a.length);
    const result: string[] = [];
    for (const p of unique) {
      if (!result.some((r) => r.includes(p) || p.includes(r))) {
        result.push(p);
      }
    }
    return result.slice(0, 3);
  }
}
