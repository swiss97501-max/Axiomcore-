import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/axiom/theme';

export const metadata: Metadata = {
  title: "AxiomCore — ระบบวิเคราะห์ตรรกะวิบัติ",
  description:
    "AxiomCore ระบบวิเคราะห์ตรรกะวิบัติ (Logical Fallacy Analysis) ทำงานภายในเว็บทั้งหมด ไม่ใช้ AI ภายนอก รองรับ 12 ประเภทตรรกะวิบัติ",
  keywords: ["AxiomCore", "ตรรกะวิบัติ", "Logical Fallacy", "วิเคราะห์การโต้แย้ง", "Thai"],
  authors: [{ name: "AxiomCore" }],
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        {/* Inline script เพื่อ set theme ก่อน paint ป้องกัน flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('axiomcore-theme');if(t!=='light'){document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body className="antialiased bg-background text-foreground font-sans">
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
