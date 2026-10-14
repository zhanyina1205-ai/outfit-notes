import { useEffect, useState } from "react";
import { Eye, Heart, Bookmark, MessageCircle, Trophy } from "lucide-react";
import { useWorkspace } from "../services/workspace-context";
import { ai } from "../services/ai";
import { compact } from "../lib/date";
import {
  Actions,
  AIBox,
  Button,
  Empty,
  LoadingLabel,
  Photo,
  Tag,
} from "../components/ui";
import type { Content } from "../types";
import type { PageProps } from "./shared";
import { AnimatedNumber } from "../components/motion";
const metrics = [
  { key: "views", title: "总播放量", Icon: Eye },
  { key: "likes", title: "总点赞", Icon: Heart },
  { key: "saves", title: "总收藏", Icon: Bookmark },
  { key: "comments", title: "总评论", Icon: MessageCircle },
] as const;
export function Analytics({ edit, remove }: PageProps) {
  const { state, notify } = useWorkspace();
  const [sort, setSort] = useState<"views" | "saves" | "likes" | "comments">(
    "saves",
  );
  const [analysis, setAnalysis] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => setAnalysis([]), [state.contents]);
  const rows = [...state.contents].sort((a, b) => b[sort] - a[sort]);
  const total = (
    key: keyof Pick<Content, "views" | "likes" | "saves" | "comments">,
  ) => state.contents.reduce((sum, c) => sum + c[key], 0);
  async function analyze() {
    setBusy(true);
    try {
      setAnalysis(await ai.analyzeContent(state.contents));
    } catch {
      notify("复盘生成失败，请重试", true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="metric-grid">
        {metrics.map(({ key, title, Icon }) => (
          <article className="metric-card" key={key}>
            <div>
              <span>{title}</span>
              <Icon size={18} />
            </div>
            <strong>
              <AnimatedNumber value={total(key)} format={compact} />
            </strong>
            <p>已记录 {state.contents.length} 篇内容</p>
          </article>
        ))}
      </div>
      <div className="analytics-main">
        <section className="ranking">
          <div className="section-title">
            <div>
              <h2>
                <Trophy size={19} />
                值得再研究的内容
              </h2>
              <p>以你手动录入的数据，找到下一次创作的线索。</p>
            </div>
            <select
              aria-label="热门内容排序"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              {metrics.map((m) => (
                <option value={m.key} key={m.key}>
                  按{m.title.slice(1)}排序
                </option>
              ))}
            </select>
          </div>
          {rows.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>内容</th>
                    <th>播放</th>
                    <th>点赞</th>
                    <th>收藏</th>
                    <th>评论</th>
                    <th aria-label="操作" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((content, index) => {
                    const outfit = state.outfits.find((o) =>
                      content.outfitIds.includes(o.id),
                    );
                    const garment = state.garments.find((g) =>
                      outfit?.garmentIds.includes(g.id),
                    );
                    return (
                      <tr key={content.id}>
                        <td>
                          <div className="rank-content">
                            <span
                              className={`rank ${index < 3 ? "rank-top" : ""}`}
                            >
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <Photo
                              src={garment?.image || ""}
                              alt={content.title}
                            />
                            <div>
                              <strong>{content.title}</strong>
                              <small>
                                {content.date} 发布 · 收藏率{" "}
                                {content.views
                                  ? (
                                      (content.saves / content.views) *
                                      100
                                    ).toFixed(1) + "%"
                                  : "—"}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>{compact(content.views)}</td>
                        <td>{compact(content.likes)}</td>
                        <td className="save-number">
                          {compact(content.saves)}
                        </td>
                        <td>{compact(content.comments)}</td>
                        <td>
                          <Actions
                            edit={() =>
                              edit({ collection: "contents", entity: content })
                            }
                            remove={() => remove("contents", content)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="每一次发布，都值得留下记录"
              description="记录播放、点赞和收藏，为下一次创作多一点依据。"
              action={
                <Button onClick={() => edit({ collection: "contents" })}>
                  记录第一篇内容
                </Button>
              }
            />
          )}
        </section>
      </div>
      <AIBox
        title="你的内容，正在告诉你什么"
        action={
          <Button
            variant="secondary"
            disabled={busy || !rows.length}
            onClick={analyze}
          >
            <LoadingLabel busy={busy}>生成内容复盘</LoadingLabel>
          </Button>
        }
      >
        {analysis.length ? (
          <ol className="analysis-list">
            {analysis.map((line, i) => (
              <li key={line}>
                <span>0{i + 1}</span>
                <p>{line}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p>
            比较收藏表现，整理可测试的选题方向。这里使用模拟分析，不连接平台数据。
          </p>
        )}
      </AIBox>
      <div className="analytics-footnote">
        <Tag>{rows.length} 篇作品</Tag>
        <span>收藏率 = 收藏量 / 播放量；所有指标均来自手动录入。</span>
      </div>
    </>
  );
}
