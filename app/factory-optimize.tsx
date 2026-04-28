"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { Copy, RefreshCw, ArrowLeft, Check, Eye, Code2, ImagePlus, Save, Type, Smartphone, ClipboardPaste } from "lucide-react";

const THEMES = [
  { key: "dark", label: "暗夜霓虹", emoji: "🌃", desc: "深色背景+霓虹装饰，适合活动报道" },
  { key: "tech", label: "极客黑", emoji: "🛸", desc: "深色科技风格" },
  { key: "professional", label: "商务蓝", emoji: "💼", desc: "专业商务风格" },
  { key: "fresh", label: "清新绿", emoji: "🌿", desc: "清新自然风格" },
] as const;

type ThemeKey = typeof THEMES[number]["key"];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createPreviewDocumentHtml(content: string) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #f3f4f6;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #1f2937;
      }
      .wechat-shell {
        min-height: 100vh;
        padding: 24px 16px 40px;
        box-sizing: border-box;
      }
      .wechat-article {
        width: min(100%, 760px);
        margin: 0 auto;
        background: #ffffff;
        border-radius: 24px;
        box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
        overflow: hidden;
      }
      .wechat-article-inner {
        padding: 28px 22px 36px;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      p, h1, h2, h3, h4, h5, h6, blockquote, ul, ol {
        word-break: break-word;
      }
    </style>
  </head>
  <body>
    <div class="wechat-shell">
      <div class="wechat-article">
        <div class="wechat-article-inner">${content || '<p style="margin:0; color:#9ca3af; text-align:center;">右侧预览区会显示这里的排版结果</p>'}</div>
      </div>
    </div>
  </body>
</html>`;
}

function htmlToPlainText(html: string) {
  if (!html.trim()) return "";
  if (typeof window === "undefined") return html;

  const doc = new DOMParser().parseFromString(html, "text/html");
  const blockSelectors = ["p", "div", "section", "article", "blockquote", "li", "h1", "h2", "h3", "h4", "h5", "h6"];
  blockSelectors.forEach((selector) => {
    doc.querySelectorAll(selector).forEach((node) => {
      if (node.textContent?.trim()) {
        node.appendChild(doc.createTextNode("\n"));
      }
    });
  });

  return (doc.body.textContent || "")
    .replace(/ /g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function copyRichContentToClipboard(html: string) {
  const plainText = htmlToPlainText(html);
  if (!html.trim()) return false;

  try {
    if (navigator.clipboard && "ClipboardItem" in window) {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plainText], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch {
    // fall through to execCommand fallback
  }

  const container = document.createElement("div");
  container.innerHTML = html;
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.contentEditable = "true";
  document.body.appendChild(container);

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(container);
  selection?.removeAllRanges();
  selection?.addRange(range);

  const copied = document.execCommand("copy");
  selection?.removeAllRanges();
  document.body.removeChild(container);
  return copied;
}

export default function FactoryOptimize() {
  const {
    factoryOptimizeSource,
    factorySessionId,
    setFactoryView,
    setFactoryOptimizeSource,
    setWechatSyncDraft,
  } = useStore();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<"html" | "text" | "rich" | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showHtml, setShowHtml] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<Record<string, string>>({});
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [lastTheme, setLastTheme] = useState<string>("");
  const [editorMode, setEditorMode] = useState<"plain" | "rich">("rich");
  const [options, setOptions] = useState({
    theme: "dark" as ThemeKey,
    style: "casual",
    emphasis: "balanced",
    length: "preserve",
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const previewDoc = useMemo(() => createPreviewDocumentHtml(output), [output]);

  const buildInputFromEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return "";

    const clone = editor.cloneNode(true) as HTMLDivElement;
    clone.querySelectorAll("[data-image-placeholder]").forEach((node) => {
      const placeholder = (node as HTMLElement).dataset.imagePlaceholder || "";
      node.replaceWith(document.createTextNode(`\n${placeholder}\n`));
    });

    const text = clone.innerText ?? clone.textContent ?? "";
    return text.replace(/\n{3,}/g, "\n\n").trim();
  }, []);

  const normalizeImagePlaceholders = useCallback((value: string) => {
    return value.replace(/\[image\](?:(https?:\/\/[^\s\[\]]+)\|)?([^\[\]]+)\[\/image\]/g, (match, url, rawLabel) => {
      const label = String(rawLabel || "").trim();
      if (url) return match;
      const uploadedUrl = uploadedImageUrls[label];
      return uploadedUrl ? `[image]${uploadedUrl}|${label}[/image]` : match;
    });
  }, [uploadedImageUrls]);

  const syncRichEditorToInput = useCallback(() => {
    setInput(buildInputFromEditor());
  }, [buildInputFromEditor]);

  const createImagePreviewNode = (placeholder: string, previewUrl: string, label: string, uploading: boolean) => {
    const wrapper = document.createElement("div");
    wrapper.dataset.imagePlaceholder = placeholder;
    wrapper.contentEditable = "false";
    wrapper.className = "my-3 overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-sm";

    const safeLabel = escapeHtml(label);
    const status = uploading
      ? '<span class="text-[11px] text-purple-500">上传中...</span>'
      : '<span class="text-[11px] text-emerald-500">已上传</span>';

    wrapper.innerHTML = `
      <img src="${previewUrl}" alt="${safeLabel}" class="block max-h-72 w-full object-contain bg-gray-100" />
      <div class="flex items-center justify-between gap-3 border-t border-purple-100 bg-purple-50/70 px-3 py-2 text-xs text-gray-500">
        <span class="truncate">${safeLabel}</span>
        ${status}
      </div>
    `;

    return wrapper;
  };

  const insertNodeAtSelection = (node: HTMLElement) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const spacer = document.createElement("div");
    spacer.innerHTML = "<br/>";

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editor.contains(range.startContainer)) {
        range.deleteContents();
        range.insertNode(spacer);
        range.insertNode(node);
        range.setStartAfter(spacer);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
    }

    editor.appendChild(node);
    editor.appendChild(spacer);
  };

  const insertRichImagePlaceholder = (placeholder: string, previewUrl: string, label: string) => {
    const node = createImagePreviewNode(placeholder, previewUrl, label, true);
    insertNodeAtSelection(node);
    syncRichEditorToInput();
  };

  const updateRichImagePlaceholder = (placeholder: string, nextPlaceholder: string, previewUrl: string, label: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const node = editor.querySelector(`[data-image-placeholder='${CSS.escape(placeholder)}']`) as HTMLElement | null;
    if (!node) return;

    node.dataset.imagePlaceholder = nextPlaceholder;
    node.innerHTML = `
      <img src="${previewUrl}" alt="${escapeHtml(label)}" class="block max-h-72 w-full object-contain bg-gray-100" />
      <div class="flex items-center justify-between gap-3 border-t border-purple-100 bg-purple-50/70 px-3 py-2 text-xs text-gray-500">
        <span class="truncate">${escapeHtml(label)}</span>
        <span class="text-[11px] text-emerald-500">已上传</span>
      </div>
    `;
  };

  const renderInputToRichEditor = useCallback((value: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    const activeInsideEditor = selection?.rangeCount
      ? editor.contains(selection.getRangeAt(0).startContainer)
      : false;
    if (activeInsideEditor) return;

    editor.innerHTML = "";
    if (!value.trim()) return;

    const lines = value.split(/\n/);
    const imagePattern = /^\[image\](?:(https?:\/\/[^\s\[\]]+)\|)?([^\[\]]+)\[\/image\]$/;

    lines.forEach((line) => {
      const trimmed = line.trim();
      const match = trimmed.match(imagePattern);
      if (match) {
        const [, url, label] = match;
        editor.appendChild(createImagePreviewNode(trimmed, url || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", label, !url));
        return;
      }

      const paragraph = document.createElement("div");
      if (!line) {
        paragraph.innerHTML = "<br/>";
      } else {
        paragraph.textContent = line;
      }
      editor.appendChild(paragraph);
    });
  }, []);

  const insertPlainPlaceholder = (placeholder: string) => {
    const ta = textareaRef.current;
    const currentValue = ta?.value ?? input;
    const start = ta?.selectionStart ?? currentValue.length;
    const end = ta?.selectionEnd ?? start;
    const nextValue = `${currentValue.slice(0, start)}${placeholder}\n${currentValue.slice(end)}`;
    setInput(nextValue);

    setTimeout(() => {
      if (!ta) return;
      const nextPos = start + placeholder.length + 1;
      ta.focus();
      ta.setSelectionRange(nextPos, nextPos);
    }, 0);
  };

  const uploadImage = async (file: File): Promise<{ url: string; previewUrl: string } | null> => {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        return {
          url: data.url,
          previewUrl: data.thumbnail || data.url,
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  const getCurrentInput = useCallback(() => {
    if (editorMode === "rich") {
      return buildInputFromEditor();
    }
    return textareaRef.current?.value ?? input;
  }, [buildInputFromEditor, editorMode, input]);

  useEffect(() => {
    if (!output) return;
    const hasHostedImage = /<img[^>]+src="https?:\/\//i.test(output);
    const hasLocalFilename = /<img[^>]+src="(?!https?:\/\/)[^"]+"/i.test(output);
    setPreviewError(hasLocalFilename && !hasHostedImage ? "右侧结果里仍然是本地文件名，不是图床 URL，我已经补了提交前归一化；请重新点一次开始优化。" : null);
  }, [output]);

  const handleFiles = useCallback(async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      const name = file.name || `图片${i + 1}`;
      const localUrl = URL.createObjectURL(file);
      const placeholder = `[image]${name}[/image]`;

      if (editorMode === "rich") {
        insertRichImagePlaceholder(placeholder, localUrl, name);
      } else {
        insertPlainPlaceholder(placeholder);
      }

      setUploadingCount((count) => count + 1);
      try {
        const uploadResult = await uploadImage(file);
        const nextPlaceholder = uploadResult ? `[image]${uploadResult.url}|${name}[/image]` : placeholder;

        if (uploadResult?.url) {
          setUploadedImageUrls((prev) => ({ ...prev, [name]: uploadResult.url }));
        }

        setInput((prev) => prev.replace(placeholder, nextPlaceholder));

        if (editorMode === "rich") {
          updateRichImagePlaceholder(placeholder, nextPlaceholder, uploadResult?.previewUrl || localUrl, name);
          setInput(buildInputFromEditor());
        }
      } finally {
        setUploadingCount((count) => Math.max(0, count - 1));
      }
    }
  }, [buildInputFromEditor, editorMode, input, syncRichEditorToInput]);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        await handleFiles(imageFiles as unknown as FileList);
      }
    },
    [handleFiles]
  );

  const handleDrop = async (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await handleFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (_e?: React.DragEvent<HTMLElement>) => setDragging(false);

  const handleOptimize = async () => {
    const currentInput = normalizeImagePlaceholders(getCurrentInput().trim());
    if (!currentInput || uploadingCount > 0) return;

    setInput(currentInput);
    setLoading(true);
    try {
      const res = await fetch("/api/factory/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: currentInput, options }),
      });
      const data = await res.json();
      setInput(data.result || data.error || "优化失败");
      setOutput(data.result || data.error || "优化失败");
      setShowHtml(false);
      setLastTheme(data.theme || "");
      setPreviewError(null);
      if (!(data.result || "").includes("<img")) {
        setShowHtml(true);
        setPreviewError("这次返回结果里没有任何图片标签，说明图片占位符在提交前就丢了；我已修正提取逻辑，请再次点击开始优化。")
      }
    } catch {
      setOutput("请求失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (mode: "html" | "text" | "rich" = "html") => {
    if (mode === "rich") {
      const success = await copyRichContentToClipboard(output);
      if (!success) return;
      setCopied("rich");
      setTimeout(() => setCopied((current) => (current === "rich" ? null : current)), 2000);
      return;
    }

    const value = mode === "html" ? output : htmlToPlainText(output);
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(mode);
    setTimeout(() => setCopied((current) => (current === mode ? null : current)), 2000);
  };

  const handleSave = async () => {
    if (!factorySessionId) {
      setSaveMessage("请先选择一个创作会话");
      return;
    }

    setSaving(true);
    setSaveMessage(null);
    try {
      const contentToSave = (showHtml ? output : input).trim();
      await fetch("/api/factory/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: factorySessionId,
          platform: factoryOptimizeSource?.platform || "公众号文章",
          content: contentToSave,
        }),
      });
      setSaveMessage("已保存到当前创作记录");
    } catch {
      setSaveMessage("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setFactoryOptimizeSource(null);
    setFactoryView("editor");
  };

  const handleSyncDraft = () => {
    if (!factorySessionId || !output.trim()) return;
    setWechatSyncDraft({
      sessionId: factorySessionId,
      platform: factoryOptimizeSource?.platform || "公众号文章",
      html: output,
    });
  };

  useEffect(() => {
    if (!factoryOptimizeSource?.content?.trim()) return;
    setInput(factoryOptimizeSource.content);
    setOutput(factoryOptimizeSource.content);
    setShowHtml(/<[^>]+>/.test(factoryOptimizeSource.content));
    setSaveMessage(null);
  }, [factoryOptimizeSource]);

  useEffect(() => {
    if (editorMode !== "rich") return;
    renderInputToRichEditor(input);
  }, [editorMode, input, renderInputToRichEditor]);

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc]">
      <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">公众号排版中转编辑器</h2>
            <p className="text-xs text-gray-400 mt-1">源码编辑、预览、保存和复制都放在这里完成</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !factorySessionId || !(showHtml ? output : input).trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" /> {saving ? "保存中..." : "保存"}
          </button>
          <button
            onClick={handleSyncDraft}
            disabled={!factorySessionId || !output.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Smartphone className="w-4 h-4" /> 同步到草稿箱
          </button>
          <button
            onClick={() => handleCopy("rich")}
            disabled={!output.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition-all disabled:opacity-40"
          >
            <ClipboardPaste className="w-4 h-4" /> {copied === "rich" ? "已复制公众号粘贴版" : "复制公众号粘贴版"}
          </button>
          <button
            onClick={() => handleCopy("text")}
            disabled={!output.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition-all disabled:opacity-40"
          >
            <Type className="w-4 h-4" /> {copied === "text" ? "已复制纯文本" : "复制纯文本"}
          </button>
          <button
            onClick={() => handleCopy("html")}
            disabled={!output.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:shadow-md transition-all disabled:opacity-40"
          >
            {copied === "html" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied === "html" ? "已复制 HTML" : "复制 HTML"}
          </button>
        </div>
      </div>

      <div className="px-8 py-4 bg-white border-b border-gray-100 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-500">
          <Smartphone className="w-3.5 h-3.5" />
          公众号近似预览
        </div>
        {saveMessage && (
          <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs text-emerald-600">
            {saveMessage}
          </div>
        )}
        <div className="h-5 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">模板</span>
          <div className="flex gap-2">
            {THEMES.map((t) => (
              <button
                key={t.key}
                onClick={() => setOptions((o) => ({ ...o, theme: t.key as ThemeKey }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  options.theme === t.key
                    ? "bg-purple-500 text-white"
                    : "bg-gray-100 text-gray-400 hover:text-gray-600"
                }`}
              >
                <span>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-5 w-px bg-gray-200" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">风格</span>
          {[
            ["professional", "专业"],
            ["casual", "轻松"],
            ["tech", "技术"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setOptions((o) => ({ ...o, style: value }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                options.style === value
                  ? "bg-purple-500 text-white"
                  : "bg-gray-100 text-gray-400 hover:text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">强调</span>
          {[
            ["light", "轻度"],
            ["balanced", "适度"],
            ["strong", "强"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setOptions((o) => ({ ...o, emphasis: value }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                options.emphasis === value
                  ? "bg-purple-500 text-white"
                  : "bg-gray-100 text-gray-400 hover:text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">长度</span>
          {[
            ["shorten", "缩短"],
            ["preserve", "保持"],
            ["expand", "扩展"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setOptions((o) => ({ ...o, length: value }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                options.length === value
                  ? "bg-purple-500 text-white"
                  : "bg-gray-100 text-gray-400 hover:text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-gray-200" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">输入模式</span>
          {[
            ["rich", "图文编辑"],
            ["plain", "纯文本"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setEditorMode(value as "plain" | "rich")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                editorMode === value
                  ? "bg-purple-500 text-white"
                  : "bg-gray-100 text-gray-400 hover:text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-6 border-r border-gray-100 flex flex-col gap-4">
          <div className="bg-white rounded-2xl h-full p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-500">HTML 源码 / 原文输入</div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <ImagePlus className="w-3.5 h-3.5" />
                <span>{uploadingCount > 0 ? `图片上传中（${uploadingCount}）` : "在正文里直接 Ctrl+V 粘贴图片"}</span>
              </div>
            </div>
            {editorMode === "rich" ? (
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={syncRichEditorToInput}
                onPaste={handlePaste}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`w-full flex-1 bg-gray-50 rounded-xl p-4 text-sm text-gray-700 outline-none overflow-auto ${dragging ? "ring-2 ring-purple-400 ring-inset" : ""}`}
                data-placeholder="输入或粘贴文章内容，直接在正文中粘贴图片"
                style={{ whiteSpace: "pre-wrap" }}
              />
            ) : (
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                placeholder="输入或粘贴文章内容...

支持直接在正文中粘贴图片（Ctrl+V），图片会插入到当前光标位置"
                className={`w-full flex-1 bg-gray-50 rounded-xl p-4 text-sm text-gray-700 outline-none resize-none placeholder:text-gray-300 ${dragging ? "ring-2 ring-purple-400 ring-inset" : ""}`}
              />
            )}
          </div>
        </div>

        <div className="flex-1 p-6 flex flex-col">
          <div className="bg-white rounded-2xl h-full p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-gray-500">编辑器预览</div>
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setShowHtml(false)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all ${
                      !showHtml ? "bg-white shadow-sm text-gray-600" : "text-gray-400"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> 预览
                  </button>
                  <button
                    onClick={() => setShowHtml(true)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all ${
                      showHtml ? "bg-white shadow-sm text-gray-600" : "text-gray-400"
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" /> HTML
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!showHtml && (
                  <button
                    onClick={() => handleCopy("rich")}
                    disabled={!output.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-40"
                  >
                    {copied === "rich" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <ClipboardPaste className="w-3.5 h-3.5" />}
                    {copied === "rich" ? "已复制公众号粘贴版" : "复制公众号粘贴版"}
                  </button>
                )}
                <button
                  onClick={() => handleCopy(showHtml ? "html" : "text")}
                  disabled={!(showHtml ? output : htmlToPlainText(output)).trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-40"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied === "html" ? "已复制 HTML" : copied === "text" ? "已复制纯文本" : copied === "rich" ? "已复制公众号粘贴版" : showHtml ? "复制 HTML" : "复制纯文本"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {previewError && !showHtml && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {previewError}
                </div>
              )}
              {!showHtml && !!lastTheme && (
                <div className="mb-3 flex items-center gap-2 text-xs text-gray-400">
                  <span>当前模板</span>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-500">{lastTheme}</span>
                </div>
              )}
              {!showHtml && (
                <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  这里是公众号近似预览，用来辅助整理版式；最终效果仍以公众号后台实际粘贴结果为准。上方“复制公众号粘贴版”会把当前预览按富文本格式写入剪贴板。
                </div>
              )}
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-6 h-6 border-2 border-purple-200 border-t-purple-500 rounded-full" />
                </div>
              ) : output ? (
                showHtml ? (
                  <pre className="w-full h-full bg-gray-900 rounded-xl p-4 text-xs text-green-400 overflow-auto whitespace-pre-wrap font-mono">
                    {output}
                  </pre>
                ) : (
                  <iframe
                    title="优化结果预览"
                    className="w-full h-full rounded-xl bg-white"
                    sandbox="allow-same-origin"
                    srcDoc={previewDoc}
                    onError={() => setPreviewError("预览加载失败，请切换到 HTML 查看原始结果")}
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  点击「开始优化」查看结果
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-5 bg-white border-t border-gray-100 flex justify-center">
        <button
          onClick={handleOptimize}
          disabled={loading || uploadingCount > 0 || !getCurrentInput().trim()}
          className="flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-purple-600 to-indigo-500 text-white rounded-2xl text-sm font-bold hover:shadow-xl hover:shadow-purple-200/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
              优化中...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              {uploadingCount > 0 ? `等待图片上传（${uploadingCount}）` : "开始优化"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
