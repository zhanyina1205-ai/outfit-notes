import { useState, type FormEvent } from "react";
import { Plus, Camera, MapPin, Sparkles, ArrowUpRight } from "lucide-react";
import { garmentCategories, type Outfit } from "../types";
import { useWorkspace } from "../services/workspace-context";
import { ai } from "../services/ai";
import { id, today } from "../lib/date";
import {
  Actions,
  Button,
  Empty,
  LoadingLabel,
  Modal,
  Photo,
  Tag,
} from "../components/ui";
import type { PageProps } from "./shared";
export function Outfits({ edit, remove }: PageProps) {
  const { state, update, notify } = useWorkspace();
  const [generator, setGenerator] = useState(false);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function generate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const ids = Object.values(chosen).filter(Boolean);
    if (!ids.length) {
      notify("先选择至少一件单品，再生成搭配", true);
      return;
    }
    const style = String(data.get("style") || "").trim(),
      scene = String(data.get("scene") || "").trim();
    if (!style || !scene) {
      notify("请填写风格与场景", true);
      return;
    }
    setBusy(true);
    try {
      const suggestion = await ai.generateOutfit(
        state.garments.filter((g) => ids.includes(g.id)),
        style,
        scene,
      );
      const outfit: Outfit = {
        ...suggestion,
        id: id(),
        garmentIds: ids,
        createdAt: today(),
      };
      if (update((s) => ({ ...s, outfits: [outfit, ...s.outfits] }))) {
        notify("搭配方案已生成并保存");
        setGenerator(false);
        setChosen({});
      }
    } catch {
      notify("方案生成失败，请稍后重试", true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="outfit-intro">
        <div>
          <span className="eyebrow">A LITTLE EXPERIMENT, A NEW LOOK.</span>
          <h2>同一件衣服，遇见不同的自己。</h2>
          <p>从衣橱里选几件单品，开始一场关于风格的小实验。</p>
        </div>
        <Button variant="secondary" onClick={() => setGenerator(true)}>
          <Sparkles size={16} />
          生成搭配方案
        </Button>
      </div>
      <div className="outfit-grid">
        {state.outfits.map((outfit, index) => {
          const garments = outfit.garmentIds
            .map((id) => state.garments.find((g) => g.id === id))
            .filter((g) => !!g);
          return (
            <article className="outfit-card" key={outfit.id}>
              <div className="outfit-visual">
                <span className="look-number">
                  LOOK / {String(index + 1).padStart(2, "0")}
                </span>
                <Actions
                  edit={() => edit({ collection: "outfits", entity: outfit })}
                  remove={() => remove("outfits", outfit)}
                />
                <div className="outfit-photo-grid">
                  {garments.slice(0, 4).map((g) => (
                    <Photo src={g.image} alt={g.name} key={g.id} />
                  ))}
                  {!garments.length && <Photo src="" alt="添加衣橱单品" />}
                </div>
              </div>
              <div className="outfit-body">
                <Tag tone="pink">{outfit.style}</Tag>
                <h3>{outfit.name}</h3>
                <p className="flex items-center gap-2">
                  <MapPin size={14} />
                  {outfit.scene}
                </p>
                <div className="tag-list garment-tags">
                  {garments.map((g) => (
                    <Tag key={g.id}>{g.name}</Tag>
                  ))}
                </div>
                <div className="shoot-suggestions">
                  <h4>
                    <Camera size={15} />
                    拍摄建议
                  </h4>
                  <p>{outfit.shots || "添加你想拍的镜头和细节。"}</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() =>
                    edit({
                      collection: "shoots",
                      initial: {
                        title: outfit.name,
                        looks: [{ outfitId: outfit.id, checks: [] }],
                      },
                    })
                  }
                >
                  加入拍摄计划
                  <ArrowUpRight size={15} />
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      {!state.outfits.length && (
        <Empty
          title="创建你的第一套 Look"
          description="用已有衣橱单品组合搭配，留下一份可复用的创作方案。"
          action={
            <Button onClick={() => edit({ collection: "outfits" })}>
              <Plus size={15} />
              创建搭配
            </Button>
          }
        />
      )}
      {generator && (
        <Modal
          title="让衣橱碰撞出新灵感"
          description="选择单品与场景，模拟 AI 生成搭配卡和镜头建议。"
          onClose={() => {
            if (!busy) setGenerator(false);
          }}
          wide
        >
          <form onSubmit={generate}>
            <div className="generator-garments">
              {garmentCategories.map((category) => (
                <label className="field" key={category}>
                  <span>{category}</span>
                  <Photo
                    src={
                      state.garments.find((g) => g.id === chosen[category])
                        ?.image || ""
                    }
                    alt={
                      state.garments.find((g) => g.id === chosen[category])
                        ?.name || `选择${category}`
                    }
                  />
                  <select
                    aria-label={`选择${category}`}
                    value={chosen[category] || ""}
                    onChange={(e) =>
                      setChosen({
                        ...chosen,
                        [category]: e.target.value,
                        ...(category === "裤子" && e.target.value
                          ? { 裙子: "" }
                          : category === "裙子" && e.target.value
                            ? { 裤子: "" }
                            : {}),
                      })
                    }
                  >
                    <option value="">暂不选择</option>
                    {state.garments
                      .filter((g) => g.category === category)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
            </div>
            <p className="form-hint">裤子与裙子二选一，至少选择一件单品。</p>
            <div className="form-grid">
              <label className="field">
                <span>搭配风格 *</span>
                <input
                  name="style"
                  required
                  maxLength={45}
                  defaultValue="秋日松弛感"
                  placeholder="例如：高级通勤"
                />
              </label>
              <label className="field">
                <span>适合场景 *</span>
                <input
                  name="scene"
                  required
                  maxLength={45}
                  defaultValue="日常通勤"
                  placeholder="例如：周末约会"
                />
              </label>
            </div>
            <div className="modal-footer">
              <Tag tone="pink">模拟 AI</Tag>
              <Button type="submit" disabled={busy}>
                <LoadingLabel busy={busy}>生成并保存方案</LoadingLabel>
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
