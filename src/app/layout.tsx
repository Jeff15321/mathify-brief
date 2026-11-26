import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { AppNav } from "@/components/shared/AppNav";
import "./globals.css";

const poppins = Poppins({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
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
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col md:flex-row">
        <AppNav />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
