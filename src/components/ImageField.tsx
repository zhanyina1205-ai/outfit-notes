import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Photo } from "./ui";
export function ImageField({
  value,
  onChange,
  onBusyChange,
}: {
  value: string;
  onChange: (value: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("支持 JPG、PNG、WebP 图片");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("请选择小于 15 MB 的图片");
      return;
    }
    setBusy(true);
    onBusyChange?.(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error();
      context.fillStyle = "#f6f3ed";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let data = canvas.toDataURL("image/jpeg", 0.76);
      if (data.length > 600000) data = canvas.toDataURL("image/jpeg", 0.5);
      if (data.length > 600000) {
        setError("图片压缩后仍过大，请选择较小图片");
        return;
      }
      onChange(data);
    } catch {
      setError("无法读取此图片，请换一张");
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
      onBusyChange?.(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  return (
    <div className="image-field">
      <label>封面图片</label>
      <div className="image-upload">
        <Photo src={value} alt="封面预览" />
        <div>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={15} />
            {busy ? "正在压缩…" : "上传图片"}
          </button>
          {value && (
            <button
              className="icon-btn"
              type="button"
              aria-label="移除图片"
              onClick={() => onChange("")}
            >
              <X size={16} />
            </button>
          )}
          <p>JPG / PNG / WebP，自动压缩保存</p>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0])}
      />
      <input
        aria-label="图片链接"
        placeholder="或粘贴 https:// 图片链接"
        value={value.startsWith("data:") ? "" : value}
        onChange={(e) => onChange(e.target.value.trim())}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
