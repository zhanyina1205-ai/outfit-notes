import type { Inspiration, Garment, Content, Topic, Outfit } from "../types";
export interface AIProvider {
  analyzeInspiration(
    inspiration: Inspiration,
  ): Promise<{ type: string; hook: string; direction: string }>;
  generateTopics(
    item: string,
    style: string,
  ): Promise<{ title: string; category: Topic["category"] }[]>;
  suggestGarment(garment: Garment, times: number): Promise<string[]>;
  generateOutfit(
    garments: Garment[],
    style: string,
    scene: string,
  ): Promise<Pick<Outfit, "name" | "style" | "scene" | "shots">>;
  analyzeContent(contents: Content[]): Promise<string[]>;
}
const wait = () => new Promise((resolve) => setTimeout(resolve, 700));
export const ai: AIProvider = {
  async analyzeInspiration(i) {
    await wait();
    const type = i.tags.includes("拍摄姿势")
      ? "场景化穿搭 + 镜头教学"
      : i.tags.includes("爆款拆解")
        ? "一衣多穿"
        : "日常穿搭教程";
    return {
      type,
      hook: `「${i.title}」可以用具体场景和前后对比强化实用价值。`,
      direction: `把「${i.notes || i.title}」拆成3套普通女生可以复制的秋日通勤方案。`.slice(0, 2000),
    };
  },
  async generateTopics(item, style) {
    await wait();
    return [
      { title: `一件${item}，5种${style}穿法`, category: "一衣多穿" },
      { title: `普通女生的${style}：${item}这样搭`, category: "教程" },
      { title: `${item}值得买吗？从面料到版型的真实测评`, category: "测评" },
      { title: `${item}别这样穿！3个容易踩的搭配坑`, category: "避坑" },
      { title: `一周通勤不重样：${item}的胶囊衣橱`, category: "一衣多穿" },
      { title: `今天穿什么｜${item}和我的日常`, category: "日常" },
      { title: `小个子穿${item}，记住这3个比例`, category: "教程" },
      { title: `从通勤到约会，${item}的一衣两穿`, category: "一衣多穿" },
      { title: `${style}配色公式：让${item}更有质感`, category: "教程" },
      { title: `周末出门，穿${item}也可以很松弛`, category: "日常" },
    ];
  },
  async suggestGarment(g, times) {
    await wait();
    return [
      `「${g.name}」已用于 ${times} 次完成拍摄，可以试试小个子比例对比。`,
      `把${g.color || "基础"}色与奶油白搭配，做一期「${g.style || "日常"}配色公式」。`,
      `同一件${g.name}从工作日穿到约会，突出场景变化。`,
    ];
  },
  async generateOutfit(garments, style, scene) {
    await wait();
    return {
      name: `${style} · ${scene}`,
      style,
      scene,
      shots: `全身镜头：在${scene}自然走路，展示整体比例\n细节镜头：${garments[0]?.name || "单品"}的材质与层次\n动态视频：转身、回眸，保留真实动作\n口播：讲清楚${style}的搭配思路\n前后对比：展示腰线和配饰的变化`,
    };
  },
  async analyzeContent(contents) {
    await wait();
    if (!contents.length)
      return ["还没有内容数据。先记录至少一篇作品，再生成复盘。"];
    const top = [...contents].sort((a, b) => b.saves - a.saves)[0];
    const rate = top.views
      ? `${((top.saves / top.views) * 100).toFixed(1)}%`
      : "暂无播放量";
    return [
      `「${top.title}」收藏最多（${top.saves.toLocaleString()}），收藏率为 ${rate}，值得拆解标题和场景。`,
      "下一轮可以测试：明确穿搭问题 + 前后对比 + 场景关键词。",
      "以上是模拟规则建议。当前数据只支持指标比较，不能证明某种内容形式必然带来增长。",
    ];
  },
};
