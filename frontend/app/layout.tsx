import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Engram — the support agent that remembers your laptop",
  description: "Tell Engram about your laptop once. It remembers every symptom and every fix.",
};

// Runs before first paint so there is no light/dark flash. Saved choice wins, else the OS setting.
const themeScript = `try{var t=localStorage.getItem("engram_theme");if(t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
