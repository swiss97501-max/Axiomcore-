'use client';

// AxiomCore — Pixel Mascot (Sticker Edition)
// มาสคอตพิกเซลอาร์ตที่กระโดดด้วย squash-and-stretch animation
// ควบคุมด้วย props: size, animated, border, className

interface PixelMascotProps {
  size?: number;       // ขนาด 1 พิกเซล (default 4)
  animated?: boolean;  // เปิดแอนิเมชัน (default true)
  border?: boolean;    // ขอบสติกเกอร์สีขาว (default true)
  className?: string;
}

// ตารางลำตัว: 9 แถว × 15 คอลัมน์  p=ตัว, e=ตา, _=โปร่งใส
const BODY_ROWS = [
  '_______________', // row 0: padding
  '___ppppppppp___', // row 1: หัว
  '___ppppppppp___', // row 2
  '___pepppppep___', // row 3: ตาที่ col 4 และ 10
  '_ppppppppppppp_', // row 4: แขน+ลำตัว
  '_ppppppppppppp_', // row 5
  '___ppppppppp___', // row 6: ลำตัวล่าง
  '___ppppppppp___', // row 7
  '___ppppppppp___', // row 8
];

// ขา 4 ขา: ซ้าย cols 3,5 / ขวา cols 9,11
const LEG_COLS: Record<number, 'left' | 'right'> = {
  3: 'left', 5: 'left', 9: 'right', 11: 'right',
};

export function PixelMascot({ size = 4, animated = true, border = true, className }: PixelMascotProps) {
  return (
    <div
      className={`pixel-sticker ${border ? 'pixel-sticker--bordered' : ''} ${className ?? ''}`.trim()}
      style={{ ['--base-unit' as string]: `${size}px` }}
      role="img"
      aria-label="AxiomCore pixel mascot"
    >
      <div className="pixel-shadow-wrap">
        {/* เงาพื้น — หดตอนลอย ขยายตอนแตะพื้น */}
        <div className={`pixel-ground-shadow ${animated ? 'pixel-ground-shadow--animated' : ''}`.trim()} />

        {/* ตัวที่กระโดด (squash-and-stretch) */}
        <div className={`pixel-jump-wrap ${animated ? 'pixel-jump-wrap--animated' : ''}`.trim()}>
          {/* ลำตัว: หัว + ตัว + แขน (9 แถว) */}
          <div className="pixel-character-body">
            {BODY_ROWS.flatMap((row, y) =>
              row.split('').map((ch, x) => {
                const key = `b-${x}-${y}`;
                if (ch === 'p') return <div key={key} className="pixel-cell pixel-cell--p" />;
                if (ch === 'e') return (
                  <div key={key}
                    className={`pixel-cell pixel-cell--e ${animated ? 'pixel-cell--e-animated' : ''}`.trim()}
                  />
                );
                return <div key={key} className="pixel-cell pixel-cell--_" />;
              })
            )}
          </div>

          {/* แถวขา: ซ้าย-ขวา แยก element ขยับอิสระ */}
          <div className="pixel-legs-row">
            {Array.from({ length: 15 }, (_, x) => {
              const side = LEG_COLS[x];
              if (!side) return <div key={`l-${x}`} className="pixel-cell pixel-cell--_" />;
              return (
                <div key={`l-${x}`}
                  className={`pixel-leg-cell pixel-leg-${side} ${animated ? `pixel-leg-${side}--animated` : ''}`.trim()}
                >
                  <div className="pixel-cell pixel-cell--p" />
                  <div className="pixel-cell pixel-cell--p" />
                  <div className="pixel-cell pixel-cell--p" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
