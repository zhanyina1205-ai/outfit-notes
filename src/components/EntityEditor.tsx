import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import {
  type Collection,
  type Entity,
  inspirationTags,
  topicCategories,
  topicStatuses,
  garmentCategories,
  shootStatuses,
  inspirationSchema,
  topicSchema,
  garmentSchema,
  outfitSchema,
  shootSchema,
  contentSchema,
} from "../types";
import { useWorkspace } from "../services/workspace-context";
import { today, id } from "../lib/date";
import { Button, Modal } from "./ui";
import { ImageField } from "./ImageField";
export type EditorRequest = {
  collection: Collection;
  entity?: Entity;
  initial?: Record<string, unknown>;
};
export const collectionNames: Record<Collection, string> = {
  inspirations: "灵感",
  topics: "选题",
  garments: "衣橱单品",
  outfits: "搭配",
  shoots: "拍摄任务",
  contents: "内容数据",
};
export function EntityEditor({
  request,
  onClose,
}: {
  request: EditorRequest;
  onClose: () => void;
}) {
  const { state, update, notify } = useWorkspace();
  const { collection, entity } = request;
  const draft: Record<string, unknown> = { ...entity, ...request.initial };
  const [uploading, setUploading] = useState(false);
  const [image, setImage] = useState(String(draft.image || ""));
  const [tags, setTags] = useState<string[]>(
    Array.isArray(draft.tags) ? draft.tags : [],
  );
  const [garmentIds, setGarmentIds] = useState<string[]>(
    Array.isArray(draft.garmentIds) ? draft.garmentIds : [],
  );
  const [outfitIds, setOutfitIds] = useState<string[]>(
    Array.isArray(draft.outfitIds)
      ? draft.outfitIds
      : Array.isArray(draft.looks)
        ? draft.looks.map((l) => l.outfitId)
        : [],
  );
  const [error, setError] = useState("");
  const field = (
    name: string,
    label: string,
    options?: readonly string[],
    type = "text",
    required = false,
    placeholder = "",
  ) => (
    <label className="field" key={name}>
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      {options ? (
        <select name={name} defaultValue={String(draft[name] || options[0])}>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={String(
            draft[name] ??
              (type === "number" ? 0 : type === "date" ? today() : ""),
          )}
          required={required}
          min={type === "number" ? 0 : undefined}
          max={type === "number" ? 1e12 : undefined}
          step={type === "number" ? 1 : undefined}
          maxLength={type === "text" ? 120 : undefined}
          placeholder={placeholder}
          data-autofocus={
            name === "title" || name === "name" ? true : undefined
          }
        />
      )}
    </label>
  );
  const toggle = (current: string[], key: string, set: (v: string[]) => void) =>
    set(
      current.includes(key)
        ? current.filter((i) => i !== key)
        : [...current, key],
    );
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const value = (name: string) => String(form.get(name) || "").trim();
    const base = {
      id: entity?.id || id(),
      createdAt: draft.createdAt || today(),
    };
    let record: Entity;
    try {
      switch (collection) {
        case "inspirations":
          record = inspirationSchema.parse({
            ...draft,
            ...base,
            title: value("title"),
            image,
            source: value("source"),
            tags,
            notes: value("notes"),
          });
          break;
        case "topics":
          record = topicSchema.parse({
            ...draft,
            ...base,
            title: value("title"),
            category: value("category"),
            status: value("status"),
            notes: value("notes"),
          });
          break;
        case "garments":
          record = garmentSchema.parse({
            ...base,
            name: value("name"),
            image,
            category: value("category"),
            brand: value("brand"),
            color: value("color"),
            style: value("style"),
            purchasedAt: value("purchasedAt"),
          });
          break;
        case "outfits":
          if (!garmentIds.length) throw new Error("请至少选择一件衣橱单品");
          record = outfitSchema.parse({
            ...base,
            name: value("name"),
            style: value("style"),
            scene: value("scene"),
            garmentIds,
            shots: value("shots"),
          });
          break;
        case "shoots":
          if (!outfitIds.length) throw new Error("请至少选择一套搭配");
          record = shootSchema.parse({
            ...base,
            title: value("title"),
            date: value("date"),
            status: value("status"),
            topicId: value("topicId") || undefined,
            notes: value("notes"),
            looks: outfitIds.map((outfitId) => ({
              outfitId,
              checks: Array.isArray(draft.looks)
                ? draft.looks.find((l) => l.outfitId === outfitId)?.checks || []
                : [],
            })),
          });
          break;
        case "contents":
          record = contentSchema.parse({
            ...base,
            title: value("title"),
            date: value("date"),
            topicId: value("topicId") || undefined,
            outfitIds,
            views: Number(value("views")),
            likes: Number(value("likes")),
            saves: Number(value("saves")),
            comments: Number(value("comments")),
          });
          break;
      }
      const publishedTopicId =
        collection === "contents" && "topicId" in record
          ? record.topicId
          : undefined;
      if (
        update((s) => {
          const rows: Entity[] = s[collection];
          const next = {
            ...s,
            [collection]: entity
              ? rows.map((r) => (r.id === record.id ? record : r))
              : [record, ...rows],
          };
          if (publishedTopicId)
            next.topics = next.topics.map((t) =>
              t.id === publishedTopicId ? { ...t, status: "已发布" } : t,
            );
          return next;
        })
      ) {
        notify(`${collectionNames[collection]}已${entity ? "更新" : "保存"}`);
        onClose();
      }
    } catch (err) {
      setError(
        err instanceof Error && "issues" in err
          ? "请检查必填项、日期与图片链接格式"
          : err instanceof Error
            ? err.message
            : "保存失败",
      );
    }
  }
  const topicSelect = (
    <label className="field">
      <span>关联选题</span>
      <select
        name="topicId"
        aria-label="关联选题"
        defaultValue={String(draft.topicId || "")}
      >
        <option value="">不关联</option>
        {state.topics.map((t) => (
          <option value={t.id} key={t.id}>
            {t.title}
          </option>
        ))}
      </select>
    </label>
  );
  const outfitsSelect = (
    <div className="field col-span-2">
      <span>关联搭配{collection === "shoots" ? " *" : ""}</span>
      <div className="select-cards">
        {state.outfits.map((o) => (
          <label
            key={o.id}
            className={`choice ${outfitIds.includes(o.id) ? "selected" : ""}`}
          >
            <input
              type="checkbox"
              checked={outfitIds.includes(o.id)}
              onChange={() => toggle(outfitIds, o.id, setOutfitIds)}
            />
            {o.name}
          </label>
        ))}
        {!state.outfits.length && (
          <p className="muted">先在搭配实验室创建一套 Look。</p>
        )}
      </div>
    </div>
  );
  return (
    <Modal
      title={`${entity ? "编辑" : "新建"}${collectionNames[collection]}`}
      description="把想法记下来，留给下一次创作。"
      onClose={onClose}
      wide
    >
      <form onSubmit={save}>
        {(collection === "inspirations" || collection === "garments") && (
          <ImageField
            value={image}
            onChange={setImage}
            onBusyChange={setUploading}
          />
        )}
        <div className="form-grid">
          {field(
            collection === "garments" || collection === "outfits"
              ? "name"
              : "title",
            collection === "garments"
              ? "单品名称"
              : collection === "outfits"
                ? "搭配名称"
                : "标题",
            undefined,
            "text",
            true,
            "给它一个好记的名字",
          )}
          {collection === "inspirations" && (
            <>
              {field(
                "source",
                "灵感来源",
                undefined,
                "text",
                false,
                "小红书 / Pinterest / 街头观察",
              )}
              <div className="field col-span-2">
                <span>标签</span>
                <div className="select-cards">
                  {inspirationTags.map((t) => (
                    <button
                      className={`choice ${tags.includes(t) ? "selected" : ""}`}
                      type="button"
                      key={t}
                      aria-pressed={tags.includes(t)}
                      onClick={() => toggle(tags, t, setTags)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {collection === "topics" && (
            <>
              {field("category", "选题分类", topicCategories)}
              {field("status", "创作状态", topicStatuses)}
            </>
          )}
          {collection === "garments" && (
            <>
              {field("category", "单品类别", garmentCategories)}
              {field("brand", "品牌")}
              {field("color", "颜色")}
              {field("style", "风格")}
              {field("purchasedAt", "购买时间", undefined, "date", true)}
            </>
          )}
          {collection === "outfits" && (
            <>
              {field("style", "搭配风格", undefined, "text", true)}
              {field("scene", "适合场景", undefined, "text", true)}
              <div className="field col-span-2">
                <span>选择衣橱单品 *</span>
                <div className="garment-select-grid">
                  {garmentCategories.map((category) => (
                    <label className="field" key={category}>
                      <span>{category}</span>
                      <select
                        value={
                          garmentIds.find(
                            (g) =>
                              state.garments.find((i) => i.id === g)
                                ?.category === category,
                          ) || ""
                        }
                        onChange={(e) => {
                          const filtered = garmentIds.filter((g) => {
                            const cat = state.garments.find(
                              (i) => i.id === g,
                            )?.category;
                            return (
                              cat !== category &&
                              !(
                                e.target.value &&
                                ((category === "裤子" && cat === "裙子") ||
                                  (category === "裙子" && cat === "裤子"))
                              )
                            );
                          });
                          setGarmentIds(
                            e.target.value
                              ? [...filtered, e.target.value]
                              : filtered,
                          );
                        }}
                      >
                        <option value="">暂不选择</option>
                        {state.garments
                          .filter((g) => g.category === category)
                          .map((g) => (
                            <option value={g.id} key={g.id}>
                              {g.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  ))}
                </div>
                <p className="form-hint">
                  裤子与裙子二选一；单品为空的类别可以跳过。
                </p>
              </div>
            </>
          )}
          {collection === "shoots" && (
            <>
              {field("date", "拍摄日期", undefined, "date", true)}
              {field("status", "拍摄状态", shootStatuses)}
              {topicSelect}
              {outfitsSelect}
            </>
          )}
          {collection === "contents" && (
            <>
              {field("date", "发布时间", undefined, "date", true)}
              {topicSelect}
              {field("views", "播放量", undefined, "number", true)}
              {field("likes", "点赞", undefined, "number", true)}
              {field("saves", "收藏", undefined, "number", true)}
              {field("comments", "评论", undefined, "number", true)}
              {outfitsSelect}
            </>
          )}
          {collection !== "contents" && (
            <label className="field col-span-2">
              <span>{collection === "outfits" ? "拍摄建议" : "备注"}</span>
              <textarea
                name={collection === "outfits" ? "shots" : "notes"}
                rows={3}
                maxLength={2000}
                defaultValue={String(
                  draft[collection === "outfits" ? "shots" : "notes"] || "",
                )}
                placeholder="场景、镜头、想表达的细节…"
              />
            </label>
          )}
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={uploading}>
            <Save size={16} />
            保存{collectionNames[collection]}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
