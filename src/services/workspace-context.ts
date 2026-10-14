import { createContext, useContext } from "react";
import type { WorkspaceState } from "../types";
export type WorkspaceContextValue = {
  state: WorkspaceState;
  storageIssue: string;
  update: (change: (state: WorkspaceState) => WorkspaceState) => boolean;
  restore: (state: unknown) => boolean;
  notify: (message: string, error?: boolean) => void;
  toast: { message: string; error: boolean; key: number } | null;
  rawBackup: () => string;
};
export const Context = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const context = useContext(Context);
  if (!context) throw new Error("缺少工作台 Provider");
  return context;
}
