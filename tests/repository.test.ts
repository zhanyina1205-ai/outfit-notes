import { describe, expect, it } from "vitest";
import { createSeed } from "../src/data/seed";
import {
  createLocalRepository,
  garmentUsage,
  removeEntity,
  STORAGE_KEY,
  validateState,
  type StorageAdapter,
} from "../src/services/repository";
import { stateSchema } from "../src/types";
class MemoryStorage implements StorageAdapter {
  value: string | null = null;
  getItem() {
    return this.value;
  }
  setItem(_key: string, value: string) {
    this.value = value;
  }
}
describe("本地数据与创作关联", () => {
  it("示例数据通过完整格式与关联校验，并能无损备份恢复", () => {
    const state = createSeed();
    const storage = new MemoryStorage();
    const repository = createLocalRepository(storage);
    expect(repository.load()).toBeNull();
    repository.save(state);
    expect(repository.load()).toEqual(state);
  });
  it("遇到损坏的 JSON 时保留原始存储，不静默覆盖", () => {
    const storage = new MemoryStorage();
    storage.value = "{broken";
    expect(() => createLocalRepository(storage).load()).toThrow();
    expect(storage.value).toBe("{broken");
  });
  it("拒绝不支持的版本、重复 ID 和悬空的引用", () => {
    expect(() => validateState({ ...createSeed(), version: 2 })).toThrow();
    const duplicates = createSeed();
    duplicates.inspirations.push(duplicates.inspirations[0]);
    expect(() => validateState(duplicates)).toThrow("重复");
    const missing = createSeed();
    missing.outfits[0].garmentIds.push("missing");
    expect(() => validateState(missing)).toThrow("无效关联");
  });
  it("删除灵感和选题时只解除关联，保留拍摄与内容", () => {
    let state = removeEntity(createSeed(), "inspirations", "i1");
    expect(
      state.topics.find((t) => t.id === "t1")?.inspirationId,
    ).toBeUndefined();
    state = removeEntity(state, "topics", "t3");
    expect(state.shoots).toHaveLength(3);
    expect(state.contents).toHaveLength(4);
    expect(state.contents.find((c) => c.id === "c1")?.topicId).toBeUndefined();
    expect(() => validateState(state)).not.toThrow();
  });
  it("删除搭配时清理拍摄 Look 和发布关联，并更新空拍摄状态", () => {
    const state = removeEntity(createSeed(), "outfits", "o1");
    expect(state.shoots.find((s) => s.id === "s3")?.status).toBe("准备中");
    expect(state.contents.find((c) => c.id === "c1")?.outfitIds).toEqual([]);
    expect(() => validateState(state)).not.toThrow();
  });
  it("衣橱使用次数来自关联，而不是固定的演示数字", () => {
    const state = createSeed();
    expect(garmentUsage(state, "g1")).toMatchObject({ outfits: 1, shoots: 1 });
    expect(garmentUsage(state, "g1").contents).toHaveLength(2);
    const next = removeEntity(state, "contents", "c1");
    expect(garmentUsage(next, "g1").contents).toHaveLength(1);
  });
  it("未完成拍摄清单不能归档完成，裤子与裙子不能同时选择", () => {
    const unfinished = createSeed();
    unfinished.shoots[0].status = "完成";
    expect(() => validateState(unfinished)).toThrow("清单");
    const both = createSeed();
    both.outfits[0].garmentIds.push("g6");
    expect(() => validateState(both)).toThrow("请选择其一");
  });
  it("拒绝非法日期、负指标、过量进度与可执行图片 URL", () => {
    const state = createSeed();
    state.contents[0].date = "2026-02-30";
    expect(stateSchema.safeParse(state).success).toBe(false);
    state.contents[0].date = "2026-02-28";
    state.contents[0].views = -1;
    expect(stateSchema.safeParse(state).success).toBe(false);
    const progress = createSeed();
    Object.values(progress.plans)[0][0].done = 100;
    expect(stateSchema.safeParse(progress).success).toBe(false);
    const image = createSeed();
    image.inspirations[0].image = "javascript:alert(1)";
    expect(stateSchema.safeParse(image).success).toBe(false);
  });
  it("存储空间不足时失败向上传递，已有备份保持不变", () => {
    const original = JSON.stringify(createSeed());
    const storage: StorageAdapter = {
      getItem: () => original,
      setItem: () => {
        throw new DOMException("Full", "QuotaExceededError");
      },
    };
    const repository = createLocalRepository(storage);
    expect(() => repository.save(createSeed())).toThrow("Full");
    expect(storage.getItem(STORAGE_KEY)).toBe(original);
  });
});
