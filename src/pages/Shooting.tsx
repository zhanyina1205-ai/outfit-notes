import { Camera, CalendarDays, Plus, ArrowUpRight } from "lucide-react";
import { shootStatuses, shotTypes, type Shoot } from "../types";
import { useWorkspace } from "../services/workspace-context";
import { today } from "../lib/date";
import { Actions, Button, Photo, Tag } from "../components/ui";
import type { PageProps } from "./shared";
export function Shooting({ edit, remove }: PageProps) {
  const { state, update, notify } = useWorkspace();
  function status(shoot: Shoot, value: Shoot["status"]) {
    if (
      value === "完成" &&
      (!shoot.looks.length ||
        shoot.looks.some((l) =>
          shotTypes.some((type) => !l.checks.includes(type)),
        ))
    ) {
      notify("请先勾选所有 Look 的 5 项拍摄清单，再标记完成", true);
      return;
    }
    update((s) => ({
      ...s,
      shoots: s.shoots.map((item) =>
        item.id === shoot.id ? { ...item, status: value } : item,
      ),
      topics: s.topics.map((t) =>
        t.id === shoot.topicId && t.status !== "已发布"
          ? {
              ...t,
              status:
                value === "准备中"
                  ? "准备拍摄"
                  : value === "拍摄中"
                    ? "拍摄中"
                    : t.status,
            }
          : t,
      ),
    }));
  }
  return (
    <>
      <div className="shooting-tip">
        <Camera size={17} />
        <span>一次只专注一个镜头。勾完清单，再把拍摄标记为完成。</span>
        <Tag>
          {state.shoots.filter((s) => s.status !== "完成").length} 场待完成
        </Tag>
      </div>
      <div className="kanban shooting-kanban">
        {shootStatuses.map((column, i) => (
          <section className="kanban-column" key={column}>
            <div className="column-heading">
              <span className={`status-dot dot-${i + 1}`} />
              <h2>{column}</h2>
              <span>
                {state.shoots.filter((s) => s.status === column).length}
              </span>
              <button
                className="icon-btn"
                aria-label={`新建${column}拍摄`}
                onClick={() =>
                  edit({
                    collection: "shoots",
                    initial: { status: column === "完成" ? "准备中" : column },
                  })
                }
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="column-content">
              {state.shoots
                .filter((s) => s.status === column)
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((shoot) => {
                  const done = shoot.looks.reduce(
                      (sum, l) => sum + l.checks.length,
                      0,
                    ),
                    total = shoot.looks.length * 5;
                  return (
                    <article className="shoot-card" key={shoot.id}>
                      <div className="flex items-center justify-between">
                        <Tag
                          tone={
                            shoot.date === today()
                              ? "pink"
                              : shoot.date < today() && shoot.status !== "完成"
                                ? "orange"
                                : "neutral"
                          }
                        >
                          <CalendarDays size={12} />
                          {shoot.date === today() ? "今天" : shoot.date}
                          {shoot.date < today() && shoot.status !== "完成"
                            ? " · 待补拍"
                            : ""}
                        </Tag>
                        <Actions
                          edit={() =>
                            edit({ collection: "shoots", entity: shoot })
                          }
                          remove={() => remove("shoots", shoot)}
                        />
                      </div>
                      <h3>{shoot.title}</h3>
                      {shoot.topicId && (
                        <p className="source">
                          ↳{" "}
                          {
                            state.topics.find((t) => t.id === shoot.topicId)
                              ?.title
                          }
                        </p>
                      )}
                      {shoot.looks.map((look, index) => {
                        const outfit = state.outfits.find(
                          (o) => o.id === look.outfitId,
                        );
                        const garment = state.garments.find((g) =>
                          outfit?.garmentIds.includes(g.id),
                        );
                        return (
                          <div className="look-checklist" key={look.outfitId}>
                            <div className="checklist-heading">
                              <Photo
                                src={garment?.image || ""}
                                alt={outfit?.name || "Look"}
                              />
                              <div>
                                <small>
                                  LOOK {String(index + 1).padStart(2, "0")}
                                </small>
                                <strong>{outfit?.name || "未命名搭配"}</strong>
                              </div>
                              <span>{look.checks.length}/5</span>
                            </div>
                            <div className="checks">
                              {shotTypes.map((type) => (
                                <label key={type}>
                                  <input
                                    type="checkbox"
                                    checked={look.checks.includes(type)}
                                    onChange={() =>
                                      update((s) => ({
                                        ...s,
                                        shoots: s.shoots.map((item) =>
                                          item.id !== shoot.id
                                            ? item
                                            : {
                                                ...item,
                                                status:
                                                  item.status === "完成"
                                                    ? "拍摄中"
                                                    : item.status,
                                                looks: item.looks.map((l) =>
                                                  l.outfitId !== look.outfitId
                                                    ? l
                                                    : {
                                                        ...l,
                                                        checks:
                                                          l.checks.includes(
                                                            type,
                                                          )
                                                            ? l.checks.filter(
                                                                (t) =>
                                                                  t !== type,
                                                              )
                                                            : [
                                                                ...l.checks,
                                                                type,
                                                              ],
                                                      },
                                                ),
                                              },
                                        ),
                                      }))
                                    }
                                  />
                                  <span>{type}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {!shoot.looks.length && (
                        <p className="muted">编辑任务，添加一套 Look。</p>
                      )}
                      {shoot.notes && (
                        <p className="shoot-notes">{shoot.notes}</p>
                      )}
                      <div className="progress">
                        <span
                          style={{
                            width: `${total ? (done / total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <div className="shoot-card-footer">
                        <select
                          aria-label={`${shoot.title}拍摄状态`}
                          value={shoot.status}
                          onChange={(e) =>
                            status(shoot, e.target.value as Shoot["status"])
                          }
                        >
                          {shootStatuses.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                        <span>
                          {done} / {total} 镜头
                        </span>
                      </div>
                      {shoot.status === "完成" && (
                        <button
                          className="text-link mt-3"
                          onClick={() =>
                            edit({
                              collection: "contents",
                              initial: {
                                title: shoot.title,
                                topicId: shoot.topicId,
                                outfitIds: shoot.looks.map((l) => l.outfitId),
                              },
                            })
                          }
                        >
                          记录发布数据
                          <ArrowUpRight size={14} />
                        </button>
                      )}
                    </article>
                  );
                })}
              <Button
                variant="ghost"
                className="add-in-column"
                onClick={() =>
                  edit({
                    collection: "shoots",
                    initial: { status: column === "完成" ? "准备中" : column },
                  })
                }
              >
                <Plus size={15} />
                安排拍摄
              </Button>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
