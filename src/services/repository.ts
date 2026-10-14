import { stateSchema, type WorkspaceState, type Collection } from "../types";
export const STORAGE_KEY = "outfit-notes.workspace.v1";
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface WorkspaceRepository {
  load(): WorkspaceState | null;
  save(state: WorkspaceState): void;
}
export function validateState(input: unknown): WorkspaceState {
  const state = stateSchema.parse(input);
  const collections = [
    "inspirations",
    "topics",
    "garments",
    "outfits",
    "shoots",
    "contents",
  ] as const;
  for (const key of collections)
    if (new Set(state[key].map((item) => item.id)).size !== state[key].length)
      throw new Error("备份中存在重复记录 ID");
  const has = (key: Collection, id?: string) =>
    !id || state[key].some((item) => item.id === id);
  if (
    state.topics.some((t) => !has("inspirations", t.inspirationId)) ||
    state.outfits.some((o) =>
      o.garmentIds.some((id) => !has("garments", id)),
    ) ||
    state.shoots.some(
      (s) =>
        !has("topics", s.topicId) ||
        s.looks.some((l) => !has("outfits", l.outfitId)),
    ) ||
    state.contents.some(
      (c) =>
        !has("topics", c.topicId) ||
        c.outfitIds.some((id) => !has("outfits", id)),
    )
  )
    throw new Error("数据中存在无效关联，请检查备份");
  for (const outfit of state.outfits) {
    const categories = outfit.garmentIds.map(
      (id) => state.garments.find((g) => g.id === id)!.category,
    );
    if (
      new Set(categories).size !== categories.length ||
      (categories.includes("裤子") && categories.includes("裙子"))
    )
      throw new Error("一套搭配中每个类别只能选一件，裤子和裙子请选择其一");
  }
  for (const content of state.contents)
    if (new Set(content.outfitIds).size !== content.outfitIds.length)
      throw new Error("内容关联搭配重复");
  for (const shoot of state.shoots) {
    if (shoot.looks.some((l) => new Set(l.checks).size !== l.checks.length))
      throw new Error("拍摄清单重复");
    if (new Set(shoot.looks.map((l) => l.outfitId)).size !== shoot.looks.length)
      throw new Error("拍摄搭配重复");
    if (
      shoot.status === "完成" &&
      (!shoot.looks.length ||
        shoot.looks.some((l) => new Set(l.checks).size !== 5))
    )
      throw new Error("请先完成所有 Look 的拍摄清单");
  }
  return state;
}
export function createLocalRepository(
  storage: StorageAdapter,
): WorkspaceRepository {
  return {
    load: () => {
      const value = storage.getItem(STORAGE_KEY);
      return value === null ? null : validateState(JSON.parse(value));
    },
    save: (state) =>
      storage.setItem(STORAGE_KEY, JSON.stringify(validateState(state))),
  };
}
export function removeEntity(
  state: WorkspaceState,
  collection: Collection,
  id: string,
): WorkspaceState {
  const next = structuredClone(state);
  switch (collection) {
    case "inspirations":
      next.inspirations = next.inspirations.filter((i) => i.id !== id);
      next.topics.forEach((t) => {
        if (t.inspirationId === id) delete t.inspirationId;
      });
      break;
    case "topics":
      next.topics = next.topics.filter((t) => t.id !== id);
      next.shoots.forEach((s) => {
        if (s.topicId === id) delete s.topicId;
      });
      next.contents.forEach((c) => {
        if (c.topicId === id) delete c.topicId;
      });
      break;
    case "garments":
      next.garments = next.garments.filter((g) => g.id !== id);
      next.outfits.forEach((o) => {
        o.garmentIds = o.garmentIds.filter((g) => g !== id);
      });
      break;
    case "outfits":
      next.outfits = next.outfits.filter((o) => o.id !== id);
      next.shoots.forEach((s) => {
        s.looks = s.looks.filter((l) => l.outfitId !== id);
        if (!s.looks.length && s.status === "完成") s.status = "准备中";
      });
      next.contents.forEach((c) => {
        c.outfitIds = c.outfitIds.filter((o) => o !== id);
      });
      break;
    case "shoots":
      next.shoots = next.shoots.filter((s) => s.id !== id);
      break;
    case "contents":
      next.contents = next.contents.filter((c) => c.id !== id);
      break;
  }
  return next;
}
export function garmentUsage(state: WorkspaceState, garmentId: string) {
  const outfits = state.outfits.filter((o) => o.garmentIds.includes(garmentId));
  const ids = outfits.map((o) => o.id);
  return {
    outfits: outfits.length,
    shoots: state.shoots
      .filter((s) => s.status === "完成")
      .reduce(
        (sum, s) =>
          sum + s.looks.filter((l) => ids.includes(l.outfitId)).length,
        0,
      ),
    contents: state.contents.filter((c) =>
      c.outfitIds.some((o) => ids.includes(o)),
    ),
  };
}
