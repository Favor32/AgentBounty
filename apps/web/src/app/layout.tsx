import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "@/providers/Web3Provider";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "AgentBounty — AI-Powered Dev Escrow",
  description: "Autonomous AI agents fund trustless bounties.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body style={{ margin: 0, background: "#080B0F", fontFamily: "monospace" }}>
        <Web3Provider>
          <div style={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar />
            <main style={{ flex: 1, marginLeft: "256px", minHeight: "100vh" }}>
              {children}
            </main>
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}