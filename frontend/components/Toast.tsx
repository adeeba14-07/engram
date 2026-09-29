"use client";
import { useCallback, useRef, useState } from "react";

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const toast = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 3500);
  }, []);
  const node = msg ? (
    <div role="status" className="fixed bottom-6 left-1/2 z-50 max-w-[90%] -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-sm text-surface shadow-card">
      {msg}
    </div>
  ) : null;
  return { toast, node };
}
