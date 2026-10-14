import { useRef, useState, type ReactNode } from "react";
import { Context, type WorkspaceContextValue } from "./workspace-context";
import type { WorkspaceState } from "../types";
import { ZodError } from "zod";
import { createSeed } from "../data/seed";
import {
  createLocalRepository,
  validateState,
  STORAGE_KEY,
} from "./repository";
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    try {
      return {
        state: createLocalRepository(localStorage).load() || createSeed(),
        issue: "",
      };
    } catch {
      return {
        state: createSeed(),
        issue:
          "本地数据暂时无法读取。原始数据已保留，请先导出备份，再恢复有效数据。",
      };
    }
  });
  const [state, setState] = useState(initial.state);
  const stateRef = useRef(state);
  const [storageIssue, setStorageIssue] = useState(initial.issue);
  const [toast, setToast] = useState<WorkspaceContextValue["toast"]>(null);
  const notify = (message: string, error = false) =>
    setToast({ message, error, key: Date.now() });
  const errorMessage = (error: unknown) => {
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message || "";
      return /[\u4e00-\u9fff]/.test(message)
        ? message
        : "请检查必填项、日期、图片链接与数量范围";
    }
    return error instanceof Error ? error.message : "保存失败，请重试";
  };
  const save = (next: WorkspaceState) => {
    try {
      createLocalRepository(localStorage).save(next);
      stateRef.current = next;
      setState(next);
      setStorageIssue("");
      return true;
    } catch (error) {
      notify(
        error instanceof DOMException
          ? "保存失败：浏览器存储不可用或已满。请导出备份，并减少图片数量。"
          : errorMessage(error),
        true,
      );
      return false;
    }
  };
  const update = (change: (state: WorkspaceState) => WorkspaceState) => {
    if (storageIssue) {
      notify("请先备份并恢复本地数据，避免覆盖已有记录。", true);
      return false;
    }
    try {
      return save(change(structuredClone(stateRef.current)));
    } catch (error) {
      notify(errorMessage(error), true);
      return false;
    }
  };
  const restore = (input: unknown) => {
    try {
      return save(validateState(input));
    } catch {
      notify("备份格式或关联无效，未修改当前数据。", true);
      return false;
    }
  };
  return (
    <Context.Provider
      value={{
        state,
        storageIssue,
        update,
        restore,
        notify,
        toast,
        rawBackup: () => {
          try {
            return storageIssue
              ? localStorage.getItem(STORAGE_KEY) || JSON.stringify(state)
              : JSON.stringify(state, null, 2);
          } catch {
            return JSON.stringify(state, null, 2);
          }
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
