import type { Metadata } from "next";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Brasília · Seu trabalho em movimento", template: "%s · Brasília" },
  description: "Pessoas, projetos e próximos passos. Um espaço para organizar a sua semana.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
