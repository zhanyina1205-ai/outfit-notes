import { useState } from "react";
import { Plus, Search, Shirt, Camera } from "lucide-react";
import { garmentCategories, type Garment } from "../types";
import { useWorkspace } from "../services/workspace-context";
import { garmentUsage } from "../services/repository";
import { ai } from "../services/ai";
import {
  Actions,
  AIBox,
  Button,
  Empty,
  LoadingLabel,
  Modal,
  Photo,
  Tag,
} from "../components/ui";
import { Filters, matches, type PageProps } from "./shared";
export function Closet({ edit, remove }: PageProps) {
  const { state, notify } = useWorkspace();
  const [filter, setFilter] = useState("全部");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Garment | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const rows = state.garments.filter(
    (g) =>
      (filter === "全部" || g.category === filter) &&
      matches(query, g.name, g.brand, g.style, g.color),
  );
  const usage = detail ? garmentUsage(state, detail.id) : null;
  async function suggest(g: Garment) {
    setBusy(true);
    try {
      setSuggestions(
        await ai.suggestGarment(g, garmentUsage(state, g.id).shoots),
      );
    } catch {
      notify("建议生成失败，请重试", true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-toolbar">
        <Filters
          options={garmentCategories}
          value={filter}
          onChange={setFilter}
          count={rows.length}
        />
        <label className="inline-search">
          <Search size={16} />
          <input
            placeholder="搜索单品、品牌、颜色…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="closet-grid">
        {rows.map((g) => {
          const count = garmentUsage(state, g.id);
          return (
            <article className="garment-card" key={g.id}>
              <div className="garment-photo">
                <button
                  className="image-button"
                  aria-label={`查看${g.name}详情`}
                  onClick={() => {
                    setDetail(g);
                    setSuggestions([]);
                  }}
                >
                  <Photo src={g.image} alt={g.name} />
                </button>
                <Tag>{g.category}</Tag>
                <Actions
                  edit={() => edit({ collection: "garments", entity: g })}
                  remove={() => remove("garments", g)}
                />
              </div>
              <div className="garment-body">
                <p className="brand">{g.brand || "我的衣橱"}</p>
                <button
                  className="card-title-button"
                  onClick={() => {
                    setDetail(g);
                    setSuggestions([]);
                  }}
                >
                  <h3>{g.name}</h3>
                </button>
                <p>
                  {g.color || "未标记颜色"} · {g.style || "日常"}
                </p>
                <div className="garment-counts">
                  <span>
                    <Shirt size={14} />
                    {count.outfits} 次搭配
                  </span>
                  <span>
                    <Camera size={14} />
                    {count.contents.length} 篇内容
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!rows.length && (
        <Empty
          title="给衣橱留一份创作档案"
          description="收录你喜欢的单品，让每一件衣服有更多可能。"
          action={
            <Button onClick={() => edit({ collection: "garments" })}>
              <Plus size={15} />
              添加单品
            </Button>
          }
        />
      )}
      <AIBox title="熟悉的衣服，也能有新故事">
        <p>选择一件单品，查看搭配与发布记录，再获取新的内容方向。</p>
      </AIBox>
      {detail && usage && (
        <Modal
          title={detail.name}
          description={`${detail.brand || "我的衣橱"} · ${detail.color} · ${detail.style}`}
          onClose={() => setDetail(null)}
          wide
        >
          <div className="closet-detail">
            <Photo src={detail.image} alt={detail.name} />
            <div>
              <Tag tone="pink">{detail.category}</Tag>
              <dl className="detail-list">
                <dt>购买时间</dt>
                <dd>{detail.purchasedAt}</dd>
                <dt>已加入搭配</dt>
                <dd>{usage.outfits} 套</dd>
                <dt>已完成拍摄</dt>
                <dd>{usage.shoots} 次 Look</dd>
                <dt>已发布内容</dt>
                <dd>{usage.contents.length} 篇</dd>
              </dl>
              <h3>这件单品的内容档案</h3>
              {usage.contents.map((c) => (
                <p className="published-line" key={c.id}>
                  {c.title}
                  <small>{c.date}</small>
                </p>
              ))}
              {!usage.contents.length && (
                <p className="muted">记录发布数据时，关联对应的搭配即可。</p>
              )}
            </div>
          </div>
          <AIBox
            title="再穿一次的灵感"
            action={
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => suggest(detail)}
              >
                <LoadingLabel busy={busy}>生成建议</LoadingLabel>
              </Button>
            }
          >
            {suggestions.length ? (
              <ul>
                {suggestions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : (
              <p>根据单品颜色、风格和拍摄次数，整理新的内容方向。</p>
            )}
          </AIBox>
        </Modal>
      )}
    </>
  );
}
