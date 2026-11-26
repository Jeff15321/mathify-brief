import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { AppNav } from "@/components/shared/AppNav";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mathify Tutor Brief",
  description: "Prepare for a Mathify tutoring session with a question, a whiteboard, and a brief for your tutor.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppNav />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
