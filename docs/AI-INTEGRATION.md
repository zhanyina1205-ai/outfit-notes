# 真实 AI 与服务端接入

## 1. 替换 AIProvider

`src/services/ai.ts` 的 `AIProvider` 已将五种生成任务与页面分离：

| 方法 | 输入 | 返回 |
| --- | --- | --- |
| `analyzeInspiration` | 灵感图片、标题、标签、来源、备注 | `{ type, hook, direction }` |
| `generateTopics` | 单品、风格 | 10 个 `{ title, category }` |
| `suggestGarment` | 单品与完成拍摄次数 | `string[]` |
| `generateOutfit` | 选中的衣橱单品、风格、场景 | `{ name, style, scene, shots }` |
| `analyzeContent` | 当前内容数据 | `string[]` |

先保留现有模拟对象作为 `mockAI`，再新增同接口的 HTTP 实现，将导出的 `ai` 替换为 HTTP Provider。后端负责选择模型、调用真实 AI API、校验结构化输出。

示意：

```ts
import type { AIProvider } from './ai';

async function requestAI<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`/api/ai/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error('生成失败，请稍后重试');
  return response.json(); // 正式实现再用 Zod 校验具体输出结构
}

export const realAI: AIProvider = {
  analyzeInspiration: inspiration => requestAI('inspiration', { inspiration }),
  generateTopics: (item, style) => requestAI('topics', { item, style }),
  suggestGarment: (garment, times) => requestAI('garment', { garment, times }),
  generateOutfit: (garments, style, scene) => requestAI('outfit', { garments, style, scene }),
  analyzeContent: contents => requestAI('analytics', { contents }),
};
```

此代码是接入示意，当前项目没有这些后端端点，不应直接切换到真实模式。

## 2. 加一个轻量后端代理

可使用 Node 服务或托管的服务端函数，提供以上5个端点：

1. 接收前端的已选单品和创作数据，限制文本长度、图片大小与请求频率。
2. 在服务端环境变量中设置 `AI_API_KEY`、`AI_MODEL` 等配置。
3. 构造任务提示和结构化返回契约；对图片分析使用支持图像输入的模型。
4. 校验模型输出，确保类别在现有枚举内、选题数量为10、文本长度满足实体限制。
5. 返回 JSON，并处理超时、限额、失败与重试。把界面的「模拟 AI」标记更新为实际状态。

密钥必须只存在于服务端，不使用 `VITE_*` 存放密钥，也不写入 localStorage、Git 或浏览器代码。开发时可在 `vite.config.ts` 配置 `/api` 代理到后端；生产环境由部署平台提供同源路由。

灵感中的图片 URL、来源文本、备注是用户材料，应作为待分析内容传递；不要将材料中出现的指令当成系统提示。复盘只根据记录的数据给出结论；若要解释内容形式与表现关系，应增加形式、受众、发布时间等结构字段。

## 3. 替换存储层

`repository.ts` 已有 `WorkspaceRepository` 接口，当前实现为同步 localStorage。真实数据库接入建议：

1. 将 `load/save` 改为异步接口，在 `workspace.tsx` 增加初始化加载、保存中与失败状态；页面仍只调用 Context。
2. 建立 inspirations、topics、garments、outfits、outfit_garments、shoots、shoot_looks、contents、content_outfits、daily_plans 表。
3. UUID 可沿用现有实体 ID，增加 `created_at / updated_at` 与用户/工作空间字段；关联用外键和事务保证完整性。
4. 图片改为对象存储 URL，数据库存元数据；迁移时把备份中的 data URL 上传后再替换引用。
5. 将当前整个状态快照保存逐步改为实体级创建、更新、删除，避免多人编辑互相覆盖；增加乐观版本控制。
6. 保存拍摄与发布时的 Look/单品快照，让后续搭配调整不改变旧内容档案。

先接入真实 AI，再按需要增加云端数据同步即可；MVP 不需要引入复杂角色权限。
