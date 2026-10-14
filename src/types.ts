import { z } from "zod";
export const inspirationTags = [
  "穿搭参考",
  "爆款拆解",
  "拍摄姿势",
  "文案参考",
] as const;
export const topicCategories = [
  "教程",
  "测评",
  "日常",
  "避坑",
  "一衣多穿",
] as const;
export const topicStatuses = ["灵感", "准备拍摄", "拍摄中", "已发布"] as const;
export const garmentCategories = ["上衣", "裤子", "裙子", "鞋", "包"] as const;
export const shootStatuses = ["准备中", "拍摄中", "完成"] as const;
export const shotTypes = [
  "全身照",
  "细节照",
  "动态视频",
  "口播",
  "前后对比",
] as const;
export const taskNames = [
  "找选题",
  "完成搭配",
  "拍摄",
  "发布",
  "数据复盘",
] as const;
const text = z.string().max(2000);
const title = z.string().trim().min(1).max(120);
const key = z.string().min(1).max(100);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v,
    "日期无效",
  );
export const imageSchema = z
  .string()
  .max(650000)
  .refine(
    (v) =>
      !v ||
      /^https?:\/\//i.test(v) ||
      /^\/images\/[a-zA-Z0-9._-]+$/.test(v) ||
      /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(v),
    "请输入 http(s) 图片链接或上传图片",
  );
const analysisSchema = z.object({ type: text, hook: text, direction: text });
export const inspirationSchema = z.object({
  id: key,
  title,
  image: imageSchema,
  source: text,
  tags: z.array(z.enum(inspirationTags)).max(4),
  notes: text,
  createdAt: date,
  analysis: analysisSchema.optional(),
});
export const topicSchema = z.object({
  id: key,
  title,
  category: z.enum(topicCategories),
  status: z.enum(topicStatuses),
  notes: text,
  inspirationId: key.optional(),
  createdAt: date,
});
export const garmentSchema = z.object({
  id: key,
  name: title,
  image: imageSchema,
  category: z.enum(garmentCategories),
  brand: text,
  color: text,
  style: text,
  purchasedAt: date,
});
export const outfitSchema = z.object({
  id: key,
  name: title,
  style: text,
  scene: text,
  garmentIds: z.array(key).max(5),
  shots: text,
  createdAt: date,
});
export const shootSchema = z.object({
  id: key,
  title,
  date,
  status: z.enum(shootStatuses),
  topicId: key.optional(),
  notes: text,
  looks: z
    .array(
      z.object({ outfitId: key, checks: z.array(z.enum(shotTypes)).max(5) }),
    )
    .max(50),
});
export const contentSchema = z.object({
  id: key,
  title,
  date,
  views: z.number().int().nonnegative().max(1e12),
  likes: z.number().int().nonnegative().max(1e12),
  saves: z.number().int().nonnegative().max(1e12),
  comments: z.number().int().nonnegative().max(1e12),
  topicId: key.optional(),
  outfitIds: z.array(key).max(50),
});
export const dayPlanSchema = z
  .array(
    z
      .object({
        name: z.enum(taskNames),
        done: z.number().int().nonnegative().max(100),
        total: z.number().int().min(1).max(100),
      })
      .refine((t) => t.done <= t.total, "完成数量不能大于计划数量"),
  )
  .length(5)
  .refine((p) => new Set(p.map((t) => t.name)).size === 5, "任务名称重复");
export const stateSchema = z.object({
  version: z.literal(1),
  inspirations: z.array(inspirationSchema).max(2000),
  topics: z.array(topicSchema).max(2000),
  garments: z.array(garmentSchema).max(2000),
  outfits: z.array(outfitSchema).max(2000),
  shoots: z.array(shootSchema).max(2000),
  contents: z.array(contentSchema).max(2000),
  plans: z.record(date, dayPlanSchema),
});
export type Inspiration = z.infer<typeof inspirationSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type Garment = z.infer<typeof garmentSchema>;
export type Outfit = z.infer<typeof outfitSchema>;
export type Shoot = z.infer<typeof shootSchema>;
export type Content = z.infer<typeof contentSchema>;
export type WorkspaceState = z.infer<typeof stateSchema>;
export type Collection =
  "inspirations" | "topics" | "garments" | "outfits" | "shoots" | "contents";
export type Page =
  | "dashboard"
  | "inspiration"
  | "topics"
  | "closet"
  | "outfits"
  | "shooting"
  | "analytics";
export type Entity = Inspiration | Topic | Garment | Outfit | Shoot | Content;
export const collectionPage: Record<Collection, Page> = {
  inspirations: "inspiration",
  topics: "topics",
  garments: "closet",
  outfits: "outfits",
  shoots: "shooting",
  contents: "analytics",
};
