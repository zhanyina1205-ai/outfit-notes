import { useState, type FormEvent } from "react";
import { Camera, Plus, Sparkles, ArrowUpRight } from "lucide-react";
import { topicStatuses, topicCategories, type Topic } from "../types";
import { ai } from "../services/ai";
import { useWorkspace } from "../services/workspace-context";
import { id, today } from "../lib/date";
import {
  Actions,
  Button,
  Empty,
  LoadingLabel,
  Modal,
  Tag,
} from "../components/ui";
import { Filters, type PageProps } from "./shared";
export function Topics({ edit, remove }: PageProps) {
  const { state, update, notify } = useWorkspace();
  const [filter, setFilter] = useState("全部");
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ideas, setIdeas] = useState<Pick<Topic, "title" | "category">[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [item, setItem] = useState("黑色西装");
  const [style, setStyle] = useState("高级通勤");
  const rows = state.topics.filter(
    (t) => filter === "全部" || t.category === filter,
  );
  async function generate(e: FormEvent) {
    e.preventDefault();
    if (!item.trim() || !style.trim()) return;
    setBusy(true);
    try {
      const results = await ai.generateTopics(item.trim(), style.trim());
      setIdeas(results);
      setSelected(results.map((_, i) => i));
    } catch {
      notify("生成失败，请稍后重试", true);
    } finally {
      setBusy(false);
    }
  }
  function save() {
    if (
      update((s) => ({
        ...s,
        topics: [
          ...ideas
            .filter((_, i) => selected.includes(i))
            .map((idea) => ({
              ...idea,
              id: id(),
              status: "灵感" as const,
              notes: "来自模拟 AI 选题生成",
              createdAt: today(),
            })),
          ...s.topics,
        ],
      }))
    ) {
      notify(`已保存 ${selected.length} 个选题`);
      setGenerating(false);
      setIdeas([]);
    }
  }
  return (
    <>
      <div className="page-toolbar">
        <Filters
          options={topicCategories}
          value={filter}
          onChange={setFilter}
          count={rows.length}
        />
        <Button variant="secondary" onClick={() => setGenerating(true)}>
          <Sparkles size={16} />
          AI 生成选题
        </Button>
      </div>
      <div className="kanban topic-kanban">
        {topicStatuses.map((status, column) => (
          <section className="kanban-column" key={status}>
            <div className="column-heading">
              <span className={`status-dot dot-${column}`} />
              <h2>{status}</h2>
              <span>{rows.filter((t) => t.status === status).length}</span>
              <button
                aria-label={`添加${status}选题`}
                className="icon-btn"
                onClick={() =>
                  edit({ collection: "topics", initial: { status } })
                }
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="column-content">
              {rows
                .filter((t) => t.status === status)
                .map((topic) => (
                  <article className="topic-card" key={topic.id}>
                    <div className="flex justify-between items-center">
                      <Tag tone="pink">{topic.category}</Tag>
                      <Actions
                        edit={() =>
                          edit({ collection: "topics", entity: topic })
                        }
                        remove={() => remove("topics", topic)}
                      />
                    </div>
                    <h3>{topic.title}</h3>
                    {topic.notes && <p>{topic.notes}</p>}
                    {topic.inspirationId && (
                      <span className="source-link">↳ 来自灵感库</span>
                    )}
                    <div className="topic-bottom">
                      <select
                        aria-label={`${topic.title}状态`}
                        value={topic.status}
                        onChange={(e) =>
                          update((s) => ({
                            ...s,
                            topics: s.topics.map((t) =>
                              t.id === topic.id
                                ? {
                                    ...t,
                                    status: e.target.value as Topic["status"],
                                  }
                                : t,
                            ),
                          }))
                        }
                      >
                        {topicStatuses.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      {topic.status === "已发布" ? (
                        <button
                          className="text-link"
                          onClick={() =>
                            edit({
                              collection: "contents",
                              initial: {
                                title: topic.title,
                                topicId: topic.id,
                              },
                            })
                          }
                        >
                          记数据
                          <ArrowUpRight size={14} />
                        </button>
                      ) : (
                        <button
                          className="icon-btn"
                          title="安排拍摄"
                          aria-label={`为${topic.title}安排拍摄`}
                          onClick={() =>
                            edit({
                              collection: "shoots",
                              initial: {
                                title: topic.title,
                                topicId: topic.id,
                              },
                            })
                          }
                        >
                          <Camera size={16} />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              <button
                className="add-in-column"
                onClick={() =>
                  edit({ collection: "topics", initial: { status } })
                }
              >
                <Plus size={14} />
                添加选题
              </button>
            </div>
          </section>
        ))}
      </div>
      {generating && (
        <Modal
          title="下一篇内容，从这里开始"
          description="输入单品和风格，模拟 AI 为你整理 10 个选题方向。"
          onClose={() => setGenerating(false)}
          wide
        >
          <form onSubmit={generate}>
            <div className="form-grid">
              <label className="field">
                <span>单品 *</span>
                <input
                  data-autofocus
                  required
                  maxLength={30}
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  placeholder="例如：黑色西装"
                />
              </label>
              <label className="field">
                <span>风格 *</span>
                <input
                  required
                  maxLength={30}
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="例如：高级通勤"
                />
              </label>
            </div>
            <Button type="submit" disabled={busy}>
              <LoadingLabel busy={busy}>
                {ideas.length ? "重新生成" : "生成 10 个选题"}
              </LoadingLabel>
            </Button>
          </form>
          {ideas.length > 0 && (
            <div className="generated-ideas">
              <div className="flex justify-between items-center">
                <p>选择要加入选题中心的想法</p>
                <button
                  className="text-link"
                  onClick={() =>
                    setSelected(
                      selected.length === ideas.length
                        ? []
                        : ideas.map((_, i) => i),
                    )
                  }
                >
                  {selected.length === ideas.length ? "取消全选" : "全选"}
                </button>
              </div>
              {ideas.map((idea, i) => (
                <label className="idea-row" key={i}>
                  <input
                    type="checkbox"
                    checked={selected.includes(i)}
                    onChange={() =>
                      setSelected(
                        selected.includes(i)
                          ? selected.filter((n) => n !== i)
                          : [...selected, i],
                      )
                    }
                  />
                  <span>{idea.title}</span>
                  <Tag>{idea.category}</Tag>
                </label>
              ))}
              <div className="modal-footer">
                <Tag tone="pink">模拟 AI</Tag>
                <Button disabled={!selected.length || busy} onClick={save}>
                  <Plus size={15} />
                  保存 {selected.length} 个选题
                </Button>
              </div>
            </div>
          )}
          {!ideas.length && (
            <Empty
              title="让熟悉的单品，生长出新故事"
              description="从用户的问题、场景和搭配方式三个角度出发。"
            />
          )}
        </Modal>
      )}
    </>
  );
}
