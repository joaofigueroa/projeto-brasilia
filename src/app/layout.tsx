import type { Metadata } from "next";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";
import "./design-system.css";

export const metadata: Metadata = {
  title: { default: "Brasília · Gestão de tarefas", template: "%s · Brasília" },
  description: "Gestão de tarefas semanais, projetos, responsáveis e acessos.",
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
