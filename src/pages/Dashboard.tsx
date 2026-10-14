import { useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Lightbulb,
  Shirt,
  Camera,
  Send,
  ChartNoAxesCombined,
  Plus,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
  Check,
  NotebookPen,
} from "lucide-react";
import { useWorkspace } from "../services/workspace-context";
import { taskNames, type WorkspaceState } from "../types";
import { today, displayDate } from "../lib/date";
import { pictures } from "../data/seed";
import {
  Button,
  Photo,
  SectionTitle,
  Tag,
  TextLink,
  Modal,
  AIBox,
  Empty,
} from "../components/ui";
import type { PageProps } from "./shared";
import { AnimatedNumber } from "../components/motion";
const icons = [Lightbulb, Shirt, Camera, Send, ChartNoAxesCombined];
const destinations = [
  "topics",
  "outfits",
  "shooting",
  "analytics",
  "analytics",
] as const;
export function Dashboard({ navigate, edit }: PageProps) {
  const { state, update, notify } = useWorkspace();
  const date = today();
  const plan =
    state.plans[date] || taskNames.map((name) => ({ name, done: 0, total: 1 }));
  const [planning, setPlanning] = useState(false);
  const done = plan.reduce((sum, t) => sum + t.done, 0),
    total = plan.reduce((sum, t) => sum + t.total, 0);
  const percentage = Math.round((done / total) * 100);
  const route = [
    {
      page: "inspiration",
      name: "收集灵感",
      note: "留住心动",
      Icon: Lightbulb,
    },
    { page: "topics", name: "规划选题", note: "找到表达", Icon: NotebookPen },
    { page: "outfits", name: "组合搭配", note: "试出风格", Icon: Shirt },
    { page: "shooting", name: "准备拍摄", note: "记录此刻", Icon: Camera },
    {
      page: "analytics",
      name: "沉淀作品",
      note: "听见回响",
      Icon: ChartNoAxesCombined,
    },
  ] as const;
  const upcoming = state.shoots
    .filter((s) => s.status !== "完成" && s.date >= date)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  function savePlan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const next: WorkspaceState["plans"][string] = plan.map((t, i) => ({
      ...t,
      done: Number(data.get(`done${i}`)),
      total: Number(data.get(`total${i}`)),
    }));
    if (update((s) => ({ ...s, plans: { ...s.plans, [date]: next } }))) {
      notify("今日计划已更新");
      setPlanning(false);
    }
  }
  return (
    <div className="dashboard">
      <div className="journal-masthead">
        <span>
          THE DAILY EDIT <i> / 创作日常</i>
        </span>
        <span>
          {displayDate()} <span aria-hidden="true">✳</span>
        </span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="small-star">✳</span> YOUR EVERYDAY CREATIVE SPACE
          </div>
          <h1>
            早安，
            <br />
            开始创造今天的<span className="underline-pink">穿搭内容</span>
            <span className="hero-spark">✧</span>
          </h1>
          <p>让每一个灵感，都变成值得被看见的作品。</p>
          <Button onClick={() => edit({ collection: "inspirations" })}>
            <Plus size={16} />
            记录一个灵感
            <ArrowUpRight size={16} />
          </Button>
          <span className="hero-date">{displayDate()}</span>
          <div className="hero-footnote">
            <span>
              灵感正在积累 <b>{state.inspirations.length}</b>
            </span>
            <span>
              故事等待发生{" "}
              <b>{state.topics.filter((t) => t.status !== "已发布").length}</b>
            </span>
          </div>
        </div>
        <div className="hero-collage" aria-hidden="true">
          <div className="handwritten collage-note">
            Make a little
            <br />
            beauty, everyday.
          </div>
          <div className="polaroid photo-one">
            <Photo src={pictures.street} alt="秋日街头穿搭" />
            <span>my autumn mood</span>
          </div>
          <div className="polaroid photo-two">
            <Photo src={pictures.city} alt="城市穿搭灵感" />
            <span>less, but better.</span>
          </div>
          <div className="pink-sticker">
            made
            <br />
            with ♡
          </div>
          <span className="collage-star">✳</span>
        </div>
      </section>
      <section className="creative-route" aria-label="创作路线">
        <div className="route-caption">
          <span>从心动到作品</span>
          <small>YOUR CREATIVE FLOW</small>
        </div>
        <div className="route-steps">
          {route.map(({ page, name, note, Icon }, i) => (
            <button key={page} onClick={() => navigate(page)}>
              <span className="route-number">0{i + 1}</span>
              <Icon size={17} />
              <span>
                <strong>{name}</strong>
                <small>{note}</small>
              </span>
              <ArrowUpRight size={13} className="route-arrow" />
            </button>
          ))}
        </div>
      </section>
      <SectionTitle
        title="今天，向前一点点"
        subtitle={`已完成 ${done} / ${total} 项计划，每一步都算数。`}
        action={
          <div className="today-actions">
            <div
              className="daily-ring"
              role="img"
              aria-label={`今日计划已完成 ${percentage}%`}
            >
              <svg viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="20" cy="20" r="17" />
                <circle
                  className="ring-value"
                  cx="20"
                  cy="20"
                  r="17"
                  pathLength="100"
                  strokeDasharray="100"
                  strokeDashoffset={100 - percentage}
                />
              </svg>
              <span>
                <AnimatedNumber value={percentage} />%
              </span>
            </div>
            <button className="text-link" onClick={() => setPlanning(true)}>
              <SlidersHorizontal size={14} />
              调整计划
            </button>
          </div>
        }
      />
      <div className="task-grid">
        {plan.map((task, i) => {
          const Icon = icons[i],
            complete = task.done === task.total;
          return (
            <article
              className={`task-card ${complete ? "complete" : ""}`}
              key={task.name}
            >
              <div className="task-top">
                <span className={`task-icon task-icon-${i}`}>
                  <Icon size={20} />
                </span>
                <Tag tone={complete ? "green" : task.done ? "pink" : "neutral"}>
                  {complete ? "已完成" : task.done ? "进行中" : "待开始"}
                </Tag>
              </div>
              <div className="task-label">
                <button onClick={() => navigate(destinations[i])}>
                  {task.name}
                  <ArrowUpRight size={14} />
                </button>
                <span>
                  {task.done}
                  <small> / {task.total}</small>
                </span>
              </div>
              <div className="progress">
                <span style={{ width: `${(task.done / task.total) * 100}%` }} />
              </div>
              <button
                className="task-increment"
                aria-label={`完成一项${task.name}`}
                disabled={complete}
                onClick={() =>
                  update((s) => ({
                    ...s,
                    plans: {
                      ...s.plans,
                      [date]: plan.map((t) =>
                        t.name === task.name
                          ? { ...t, done: Math.min(t.total, t.done + 1) }
                          : t,
                      ),
                    },
                  }))
                }
              >
                {complete ? (
                  <>
                    <Check size={12} />
                    今天的目标达成
                  </>
                ) : (
                  <>
                    <Plus size={12} />
                    完成一项
                  </>
                )}
              </button>
            </article>
          );
        })}
      </div>
      <div className="dashboard-columns">
        <section>
          <SectionTitle
            title="最近收集的灵感"
            subtitle="留住心动，创作就有了起点。"
            action={
              <TextLink onClick={() => navigate("inspiration")}>
                查看全部
              </TextLink>
            }
          />
          <div className="dashboard-inspirations">
            {state.inspirations.slice(0, 3).map((item, i) => (
              <button
                className="mini-inspiration"
                key={item.id}
                onClick={() =>
                  edit({ collection: "inspirations", entity: item })
                }
              >
                <div className={`mini-frame mini-frame-${i}`}>
                  <Photo src={item.image} alt={item.title} />
                  {i === 0 && <span className="new-sticker">INSPIRATION</span>}
                </div>
                <h3>{item.title}</h3>
                <p>{item.tags.join(" · ") || "未分类灵感"}</p>
              </button>
            ))}
            {!state.inspirations.length && (
              <Empty
                title="收集第一份心动"
                description="一张图片，一句文案，都可以成为灵感。"
                action={
                  <Button onClick={() => edit({ collection: "inspirations" })}>
                    添加灵感
                  </Button>
                }
              />
            )}
          </div>
        </section>
        <section className="next-shoot">
          <SectionTitle
            title="下一场拍摄"
            action={
              <TextLink onClick={() => navigate("shooting")}>任务板</TextLink>
            }
          />
          {upcoming ? (
            <div className="shoot-note">
              <span className="tape" />
              <div className="eyebrow">ON THE SHOOT LIST</div>
              <h3>{upcoming.title}</h3>
              <div className="shoot-date">
                <Camera size={15} />
                {displayDate(upcoming.date)}
              </div>
              <div className="look-lines">
                {upcoming.looks.map((l, i) => (
                  <div key={l.outfitId}>
                    <span>0{i + 1}</span>
                    {state.outfits.find((o) => o.id === l.outfitId)?.name ||
                      "未命名搭配"}
                    <Tag>{l.checks.length}/5</Tag>
                  </div>
                ))}
              </div>
              <p>{upcoming.notes || "为这次拍摄写一点准备笔记。"}</p>
              <Button variant="secondary" onClick={() => navigate("shooting")}>
                打开拍摄清单
                <ArrowRight size={15} />
              </Button>
            </div>
          ) : (
            <Empty
              title="给下一次创作留个位置"
              description="挑选 Look，安排一场新的拍摄。"
              action={
                <Button onClick={() => edit({ collection: "shoots" })}>
                  安排拍摄
                </Button>
              }
            />
          )}
        </section>
      </div>
      <AIBox
        title="给下一次创作，一点新方向"
        action={
          <span className="ai-corner">
            <Sparkles size={32} />
          </span>
        }
      >
        <p>从衣橱里的熟悉单品出发，试试这些值得持续开发的系列。</p>
        <div className="suggestion-row">
          {["秋冬大衣系列", "小个子显高穿搭", "一衣多穿"].map((title, i) => (
            <button
              key={title}
              onClick={() =>
                edit({
                  collection: "topics",
                  initial: {
                    title,
                    category: i === 2 ? "一衣多穿" : "教程",
                    status: "灵感",
                  },
                })
              }
            >
              <span>0{i + 1}</span>
              {title}
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
      </AIBox>
      <div className="page-footer">
        <span>GOOD IDEAS START WITH A LITTLE NOTE.</span>
        <span>慢慢来，你的风格正在发生。 ♡</span>
      </div>
      {planning && (
        <Modal
          title="今天的创作计划"
          description="按自己的节奏设置数量；完成进度由你手动记录。"
          onClose={() => setPlanning(false)}
        >
          <form onSubmit={savePlan}>
            <div className="plan-labels">
              <span>创作任务</span>
              <span>已完成</span>
              <span>计划数量</span>
            </div>
            {plan.map((t, i) => (
              <div className="plan-row" key={t.name}>
                <strong>{t.name}</strong>
                <input
                  aria-label={`${t.name}已完成`}
                  name={`done${i}`}
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={t.done}
                  required
                />
                <input
                  aria-label={`${t.name}计划数量`}
                  name={`total${i}`}
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={t.total}
                  required
                />
              </div>
            ))}
            <div className="modal-footer">
              <Button type="submit">保存今日计划</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
