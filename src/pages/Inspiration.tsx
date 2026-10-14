import { useState } from "react";
import { Plus, ArrowUpRight, Search } from "lucide-react";
import { inspirationTags, type Inspiration as InspirationType } from "../types";
import { useWorkspace } from "../services/workspace-context";
import { ai } from "../services/ai";
import {
  Actions,
  Button,
  Empty,
  LoadingLabel,
  Photo,
  Tag,
} from "../components/ui";
import { Filters, matches, type PageProps } from "./shared";
export function Inspiration({ edit, remove }: PageProps) {
  const { state, update, notify } = useWorkspace();
  const [filter, setFilter] = useState("全部");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const rows = state.inspirations.filter(
    (i) =>
      (filter === "全部" ||
        i.tags.includes(filter as (typeof inspirationTags)[number])) &&
      matches(query, i.title, i.source, i.notes, ...i.tags),
  );
  async function analyze(item: InspirationType) {
    setBusy(item.id);
    try {
      const result = await ai.analyzeInspiration(item);
      update((s) => ({
        ...s,
        inspirations: s.inspirations.map((i) =>
          i.id === item.id ? { ...i, analysis: result } : i,
        ),
      }));
    } catch {
      notify("分析失败，请稍后重试", true);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <div className="page-toolbar">
        <Filters
          options={inspirationTags}
          value={filter}
          onChange={setFilter}
          count={rows.length}
        />
        <label className="inline-search">
          <Search size={16} />
          <input
            placeholder="搜索灵感、标签…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="masonry-grid">
        {rows.map((item) => (
          <article className="inspiration-card" key={item.id}>
            <div className="inspiration-photo">
              <Photo src={item.image} alt={item.title} />
              <Actions
                edit={() => edit({ collection: "inspirations", entity: item })}
                remove={() => remove("inspirations", item)}
              />
            </div>
            <div className="inspiration-body">
              <div className="tag-list">
                {item.tags.map((tag) => (
                  <Tag key={tag} tone="pink">
                    {tag}
                  </Tag>
                ))}
              </div>
              <h3>{item.title}</h3>
              <p className="source">{item.source || "我的灵感手记"}</p>
              {item.notes && <p className="card-notes">{item.notes}</p>}
              <div className="inspiration-buttons">
                <button
                  className="ai-link"
                  disabled={!!busy}
                  onClick={() => analyze(item)}
                >
                  <LoadingLabel busy={busy === item.id}>
                    {item.analysis ? "重新分析" : "AI 灵感分析"}
                  </LoadingLabel>
                </button>
                <button
                  className="text-link"
                  onClick={() =>
                    edit({
                      collection: "topics",
                      initial: {
                        title: item.title,
                        inspirationId: item.id,
                        notes: [item.notes, item.analysis?.direction]
                          .filter(Boolean)
                          .join("\n")
                          .slice(0, 2000),
                        status: "灵感",
                      },
                    })
                  }
                >
                  转为选题
                  <ArrowUpRight size={14} />
                </button>
              </div>
              {item.analysis && (
                <div className="analysis-note">
                  <Tag tone="pink">模拟 AI</Tag>
                  <dl>
                    <dt>内容类型</dt>
                    <dd>{item.analysis.type}</dd>
                    <dt>潜在爆点</dt>
                    <dd>{item.analysis.hook}</dd>
                    <dt>可改方向</dt>
                    <dd>{item.analysis.direction}</dd>
                  </dl>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      {!rows.length && (
        <Empty
          title={
            query || filter !== "全部" ? "还没找到相关灵感" : "让灵感从这里开始"
          }
          description="收集一张喜欢的穿搭图片，写下让你心动的细节。"
          action={
            <Button onClick={() => edit({ collection: "inspirations" })}>
              <Plus size={15} />
              添加灵感
            </Button>
          }
        />
      )}
    </>
  );
}
