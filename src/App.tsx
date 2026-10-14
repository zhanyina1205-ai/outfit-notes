import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Lightbulb,
  NotebookPen,
  Shirt,
  Layers,
  Camera,
  ChartNoAxesCombined,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Download,
  Upload,
  HardDrive,
  Menu,
  X,
  Check,
  FolderHeart,
  Sparkles,
  BookOpen,
} from "lucide-react";
import {
  type Page,
  type Collection,
  type Entity,
  collectionPage,
} from "./types";
import { useWorkspace } from "./services/workspace-context";
import { removeEntity, validateState } from "./services/repository";
import { today, displayDate } from "./lib/date";
import { Button, Modal, Tag, Toast } from "./components/ui";
import {
  EntityEditor,
  collectionNames,
  type EditorRequest,
} from "./components/EntityEditor";
import { Dashboard } from "./pages/Dashboard";
import { Inspiration } from "./pages/Inspiration";
import { Topics } from "./pages/Topics";
import { Closet } from "./pages/Closet";
import { Outfits } from "./pages/Outfits";
import { Shooting } from "./pages/Shooting";
import { Analytics } from "./pages/Analytics";
import { MotionPage } from "./components/motion";
const pages = [
  {
    id: "dashboard",
    title: "创作总览",
    en: "My creative day",
    description: "",
    Icon: LayoutDashboard,
  },
  {
    id: "inspiration",
    title: "灵感库",
    en: "The inspiration journal",
    description: "收集让你心动的画面，让灵感有迹可循。",
    Icon: Lightbulb,
    collection: "inspirations",
  },
  {
    id: "topics",
    title: "选题中心",
    en: "Your next great story",
    description: "从一个想法，到一篇值得被看见的内容。",
    Icon: NotebookPen,
    collection: "topics",
  },
  {
    id: "closet",
    title: "我的衣橱",
    en: "A wardrobe of possibilities",
    description: "衣服是你的创作资产，每一件都有新的可能。",
    Icon: Shirt,
    collection: "garments",
  },
  {
    id: "outfits",
    title: "搭配实验室",
    en: "The outfit experiment",
    description: "组合熟悉的单品，发现属于你的风格。",
    Icon: Layers,
    collection: "outfits",
  },
  {
    id: "shooting",
    title: "拍摄管理",
    en: "Lights, camera, your style",
    description: "把准备做好，把每一个想拍的镜头留下。",
    Icon: Camera,
    collection: "shoots",
  },
  {
    id: "analytics",
    title: "内容复盘",
    en: "A little reflection, a better next",
    description: "记录作品的回响，让下一次创作更有方向。",
    Icon: ChartNoAxesCombined,
    collection: "contents",
  },
] as const;
const currentPage = (): Page =>
  pages.find((p) => p.id === location.hash.slice(1))?.id || "dashboard";
const collections = Object.keys(collectionNames) as Collection[];
export default function App() {
  const { state, update, restore, notify, toast, storageIssue, rawBackup } =
    useWorkspace();
  const [page, setPage] = useState<Page>(currentPage);
  const [editor, setEditor] = useState<EditorRequest | null>(null);
  const [deleting, setDeleting] = useState<{
    collection: Collection;
    entity: Entity;
  } | null>(null);
  const [settings, setSettings] = useState(false);
  const [guide, setGuide] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [quick, setQuick] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [imported, setImported] = useState<unknown | null>(null);
  const [clear, setClear] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);
  const meta = pages.find((p) => p.id === page)!;
  const count = (collection?: Collection) =>
    collection ? state[collection].length : undefined;
  function navigate(next: Page) {
    location.hash = next;
    setPage(next);
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  useEffect(() => {
    const sync = () => {
      setPage(currentPage());
      setMobile(false);
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!quick) return;
    const outside = (e: MouseEvent) => {
      if (!quickRef.current?.contains(e.target as Node)) setQuick(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQuick(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [quick]);
  const props = {
    edit: setEditor,
    remove: (collection: Collection, entity: Entity) =>
      setDeleting({ collection, entity }),
    navigate,
  };
  const searchResults = collections
    .flatMap((collection) =>
      state[collection]
        .filter((entity) =>
          ("title" in entity ? entity.title : entity.name)
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        )
        .map((entity) => ({
          collection,
          entity,
          title: "title" in entity ? entity.title : entity.name,
        })),
    )
    .slice(0, 40);
  function exportBackup() {
    const blob = new Blob([rawBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `穿搭手记-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("备份已导出");
  }
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("备份文件不能超过 10 MB");
      const input = JSON.parse(await file.text());
      validateState(input);
      setImported(input);
    } catch (error) {
      notify(
        error instanceof Error && error.message === "备份文件不能超过 10 MB"
          ? error.message
          : "无法读取备份，格式或关联无效。当前数据未修改。",
        true,
      );
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        跳到内容
      </a>
      {mobile && (
        <div className="sidebar-scrim" onClick={() => setMobile(false)} />
      )}
      <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
        <button className="brand-lockup" onClick={() => navigate("dashboard")}>
          <span className="brand-symbol">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <path
                d="M17 12c0-5 7-5 7 0 0 3-4 3-4 6L8 27h24l-12-9"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>
            <strong>
              穿搭手记<span>✳</span>
            </strong>
            <small>OUTFIT NOTES</small>
          </span>
        </button>
        <button
          className="mobile-close icon-btn"
          aria-label="关闭导航"
          onClick={() => setMobile(false)}
        >
          <X size={20} />
        </button>
        <div className="workspace-switch">
          <FolderHeart size={17} />
          <span>我的创作工作台</span>
          <span className="workspace-dot" />
        </div>
        <p className="nav-section-label">WORKSPACE / 创作空间</p>
        <nav aria-label="主要导航">
          {pages.map((p) => (
            <button
              className={`nav-item ${page === p.id ? "active" : ""}`}
              key={p.id}
              onClick={() => navigate(p.id)}
              aria-current={page === p.id ? "page" : undefined}
            >
              <p.Icon size={18} />
              <span>{p.title}</span>
              {"collection" in p && <small>{count(p.collection)}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="handwritten">Wear your story.</span>
          <p>
            把日常穿成故事，
            <br />
            把灵感留在这里。
          </p>
          <span className="note-heart">♡</span>
        </div>
        <div className="sidebar-bottom">
          <button className="utility-nav" onClick={() => setGuide(true)}>
            <BookOpen size={16} />
            使用指南
            <ArrowUpRight size={14} />
          </button>
          <button className="utility-nav" onClick={() => setSettings(true)}>
            <HardDrive size={16} />
            数据与备份
            <ChevronRight size={14} />
          </button>
          <div className="user-profile">
            <div className="avatar">N</div>
            <div>
              <strong>我的创作空间</strong>
              <small>每一天，都是新的一页</small>
            </div>
            <button
              className="icon-btn"
              aria-label="创作空间设置"
              onClick={() => setSettings(true)}
            >
              <ChevronDown size={15} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-toggle icon-btn"
              aria-label="打开导航"
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </button>
            <span>工作空间</span>
            <ChevronRight size={14} />
            <strong>{meta.title}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="global-search"
              aria-label="搜索全部创作"
              onClick={() => setSearch(true)}
            >
              <Search size={15} />
              <span>搜索你的创作</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="saved-indicator">
              <span className={storageIssue ? "error-dot" : ""} />
              {storageIssue ? "保存异常" : "本地保存"}
            </span>
            <div className="quick-create" ref={quickRef}>
              <Button
                onClick={() => {
                  "collection" in meta
                    ? setEditor({ collection: meta.collection })
                    : setQuick(!quick);
                }}
                aria-expanded={page === "dashboard" ? quick : undefined}
              >
                <Plus size={16} />
                新建
                {"collection" in meta ? collectionNames[meta.collection] : ""}
                {page === "dashboard" && <ChevronDown size={13} />}
              </Button>
              {quick && (
                <div className="quick-menu">
                  {collections.map((collection) => (
                    <button
                      key={collection}
                      onClick={() => {
                        setQuick(false);
                        setEditor({ collection });
                      }}
                    >
                      <Plus size={14} />
                      {collectionNames[collection]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="main-content">
          {storageIssue && (
            <div className="storage-alert" role="alert">
              {storageIssue}
              <button onClick={() => setSettings(true)}>
                数据与备份
                <ArrowUpRight size={15} />
              </button>
            </div>
          )}
          <MotionPage key={page}>
            {page !== "dashboard" && (
              <div className="page-heading">
                <div className="page-edition" aria-hidden="true">
                  THE CREATIVE JOURNAL{" "}
                  <span>
                    CHAPTER{" "}
                    {String(pages.findIndex((p) => p.id === page) + 1).padStart(
                      2,
                      "0",
                    )}
                  </span>
                </div>
                <span className="eyebrow">{meta.en}</span>
                <h1>
                  {meta.title}
                  <span>✳</span>
                </h1>
                <p>{meta.description}</p>
              </div>
            )}
            {page === "dashboard" ? (
              <Dashboard {...props} />
            ) : page === "inspiration" ? (
              <Inspiration {...props} />
            ) : page === "topics" ? (
              <Topics {...props} />
            ) : page === "closet" ? (
              <Closet {...props} />
            ) : page === "outfits" ? (
              <Outfits {...props} />
            ) : page === "shooting" ? (
              <Shooting {...props} />
            ) : (
              <Analytics {...props} />
            )}
          </MotionPage>
        </main>
      </div>
      {editor && (
        <EntityEditor
          key={editor.entity?.id || editor.collection}
          request={editor}
          onClose={() => setEditor(null)}
        />
      )}
      {deleting && (
        <Modal
          title={`删除这条${collectionNames[deleting.collection]}？`}
          description="这条记录会从当前浏览器移除，相关作品保留并解除关联。删除后无法撤销，可先导出备份。"
          onClose={() => setDeleting(null)}
        >
          <div className="delete-preview">
            {"title" in deleting.entity
              ? deleting.entity.title
              : deleting.entity.name}
          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              取消
            </Button>
            <Button
              className="danger-btn"
              onClick={() => {
                if (
                  update((s) =>
                    removeEntity(s, deleting.collection, deleting.entity.id),
                  )
                ) {
                  notify("记录已删除");
                  setDeleting(null);
                }
              }}
            >
              确认删除
            </Button>
          </div>
        </Modal>
      )}
      {search && (
        <Modal title="找到你的下一份灵感" onClose={() => setSearch(false)} wide>
          <label className="search-dialog-input">
            <Search size={20} />
            <input
              data-autofocus
              autoComplete="off"
              aria-label="搜索全部创作"
              placeholder="搜索灵感、选题、单品、搭配…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <p className="form-hint">
            {query.trim()
              ? `找到 ${searchResults.length} 条相关记录`
              : "最近的创作记录 · 输入关键词搜索"}
          </p>
          <div className="search-results">
            {searchResults.map(({ collection, entity, title }) => (
              <button
                key={`${collection}-${entity.id}`}
                onClick={() => {
                  setSearch(false);
                  navigate(collectionPage[collection]);
                  setEditor({ collection, entity });
                }}
              >
                <Tag tone="pink">{collectionNames[collection]}</Tag>
                <span>{title}</span>
                <ArrowUpRight size={16} />
              </button>
            ))}
            {!searchResults.length && (
              <p className="muted">
                没有找到相关记录，试试单品名称或选题关键词。
              </p>
            )}
          </div>
        </Modal>
      )}
      {settings && (
        <Modal
          title="你的创作，妥善收藏"
          description="记录保存在当前浏览器。导出备份后，可以在另一台设备恢复。"
          onClose={() => {
            setSettings(false);
            setImported(null);
            setClear(false);
          }}
        >
          <div className="backup-summary">
            <HardDrive size={25} />
            <div>
              <strong>
                {collections.reduce((sum, c) => sum + state[c].length, 0)}{" "}
                条创作记录
              </strong>
              <p>本地存储 · {displayDate()}</p>
            </div>
          </div>
          <div className="backup-actions">
            <Button variant="secondary" onClick={exportBackup}>
              <Download size={16} />
              导出 JSON 备份
            </Button>
            <Button
              variant="secondary"
              onClick={() => importRef.current?.click()}
            >
              <Upload size={16} />
              选择备份文件
            </Button>
            <input
              className="hidden"
              ref={importRef}
              type="file"
              accept="application/json,.json"
              onChange={(e) => importBackup(e.target.files?.[0])}
            />
          </div>
          {imported !== null && (
            <div className="import-confirm">
              <h3>备份已通过校验</h3>
              <p>恢复将覆盖当前浏览器的全部记录。建议先导出当前数据。</p>
              <Button
                onClick={() => {
                  if (restore(imported)) {
                    notify("备份已恢复");
                    setImported(null);
                    setSettings(false);
                  }
                }}
              >
                确认恢复备份
              </Button>
            </div>
          )}
          <div className="backup-tip">
            <Check size={15} />
            <p>
              上传图片自动压缩后本地保存。更换浏览器或清理网站数据前，请先备份。相同浏览器的不同地址也有独立数据。
            </p>
          </div>
          <div className="reset-section">
            <h3>从一张白纸开始</h3>
            <p>
              首次打开包含示例内容。你可以清空后，开始记录自己的衣橱与灵感。
            </p>
            {clear ? (
              <div className="reset-confirm">
                <p>将删除所有当前记录与今日计划，无法撤销。</p>
                <Button
                  className="danger-btn"
                  onClick={() => {
                    if (
                      restore({
                        version: 1,
                        inspirations: [],
                        topics: [],
                        garments: [],
                        outfits: [],
                        shoots: [],
                        contents: [],
                        plans: {},
                      })
                    ) {
                      notify("空白工作台已准备好");
                      setSettings(false);
                      setClear(false);
                      navigate("dashboard");
                    }
                  }}
                >
                  确认清空全部记录
                </Button>
                <Button variant="ghost" onClick={() => setClear(false)}>
                  取消
                </Button>
              </div>
            ) : (
              <button className="text-link" onClick={() => setClear(true)}>
                清空工作台
                <ArrowUpRight size={14} />
              </button>
            )}
          </div>
        </Modal>
      )}
      {guide && (
        <Modal
          title="从灵感，到值得留下的作品"
          description="你的第一份穿搭创作手记，从这里开始。"
          onClose={() => setGuide(false)}
        >
          <ol className="guide-list">
            {[
              [
                "01",
                "收集灵感",
                "上传图片、记录来源与标签，模拟分析后转为选题。",
              ],
              [
                "02",
                "规划选题与搭配",
                "手动新建或生成10个选题，把衣橱里的单品组合成 Look。",
              ],
              [
                "03",
                "安排拍摄",
                "关联选题与搭配，按每套 Look 的5项清单执行拍摄。",
              ],
              [
                "04",
                "发布与复盘",
                "拍摄完成后记录发布数据，查看排行与模拟复盘建议。",
              ],
            ].map(([n, title, desc]) => (
              <li key={n}>
                <span>{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="guide-note">
            <Sparkles size={18} />
            <p>
              AI
              功能为模拟演示。首页任务进度由你手动记录；衣橱搭配次数与内容关联自动统计。
            </p>
          </div>
          <Button
            onClick={() => {
              setGuide(false);
              setEditor({ collection: "inspirations" });
            }}
          >
            记录第一份灵感
            <ArrowUpRight size={16} />
          </Button>
        </Modal>
      )}
      {toast && (
        <Toast key={toast.key} message={toast.message} error={toast.error} />
      )}
    </div>
  );
}
