"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface ShortcutConfig {
  onShowHelp?: () => void;
  onSync?: () => void;
}

/**
 * Keyboard shortcuts hook for CashPilot.
 *
 * Supports two-key sequences (e.g., "g d" for Go to Dashboard)
 * and single-key shortcuts (e.g., "?" for help).
 */
export function useKeyboardShortcuts(config?: ShortcutConfig) {
  const router = useRouter();
  const pendingKey = useRef<string | null>(null);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    pendingKey.current = null;
    if (pendingTimer.current) {
      clearTimeout(pendingTimer.current);
      pendingTimer.current = null;
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      // Ignore if modifier keys are held (except shift for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // Handle pending "g" key sequences
      if (pendingKey.current === "g") {
        clearPending();
        e.preventDefault();
        switch (key) {
          case "d":
            router.push("/");
            break;
          case "i":
            router.push("/invoices");
            break;
          case "p":
            router.push("/pipeline");
            break;
          case "c":
            router.push("/customers");
            break;
          case "a":
            router.push("/aging");
            break;
          default:
            break;
        }
        return;
      }

      // Start "g" sequence
      if (key === "g") {
        e.preventDefault();
        pendingKey.current = "g";
        pendingTimer.current = setTimeout(clearPending, 1000);
        return;
      }

      // Single key shortcuts
      if (e.key === "?") {
        e.preventDefault();
        config?.onShowHelp?.();
        return;
      }

      if (key === "s" && !e.shiftKey) {
        e.preventDefault();
        config?.onSync?.();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearPending();
    };
  }, [router, config, clearPending]);
}
