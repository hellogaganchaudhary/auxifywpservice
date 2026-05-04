import "../styles/fonts.css";
import "../styles/globals.css";
import type { Metadata } from "next";
import { AnalyticsProvider } from "./providers";

export const metadata: Metadata = {
  title: "WhatsAppAI",
  description: "Enterprise WhatsApp Business API platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </body>
    </html>
  );
}
