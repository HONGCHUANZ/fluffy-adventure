import { NextRequest, NextResponse } from "next/server";
import { callMiniMax } from "@/lib/ai";

export const dynamic = "force-dynamic";

type FrameAssetSet = {
  cornerGradient: string;
  lineGradient: string;
};

type FrameVariant = {
  layout: "glow" | "offset" | "band";
  cornerSize: number;
  cornerOffset: number;
  borderInset: number;
  borderHeight: number;
  imagePadding: string;
  radius: number;
  shadow: string;
  backgroundAlpha: string;
};

// 模板主题定义
export const TEMPLATE_THEMES = {
  dark: {
    name: "暗夜霓虹",
    emoji: "🌃",
    description: "深色背景 + 霓虹装饰，适合活动报道",
    containerBg: "#1a1a2e",
    titleColor: "#ffffff",
    textColor: "#e0e0e0",
    subtitleColor: "#00d4ff",
    quoteBg: "#16213e",
    quoteBorder: "#00d4ff",
    bulletColor: "#00d4ff",
    fontSize: "15px",
    lineHeight: "1.9",
    accentEmoji: "✨",
    sectionEmoji: "🔖",
    quoteEmoji: "💬",
    listEmoji: "▪",
    decorations: ["🌸", "⭐", "🌿", "🔮", "💫", "🌺", "✨", "🎨"],
    decorations_inline: "══════",
    bodyTint: "rgba(0, 212, 255, 0.06)",
    frameAssets: {
      cornerGradient: "linear-gradient(135deg, rgba(0,212,255,0.95), rgba(124,58,237,0.85))",
      lineGradient: "linear-gradient(90deg, rgba(0,212,255,0), rgba(0,212,255,0.95), rgba(124,58,237,0.9), rgba(0,212,255,0))",
    },
    frameVariants: [
      { layout: "glow", cornerSize: 18, cornerOffset: 6, borderInset: 22, borderHeight: 3, imagePadding: "6px", radius: 12, shadow: "0 6px 14px rgba(0,212,255,0.08)", backgroundAlpha: "10" },
      { layout: "offset", cornerSize: 16, cornerOffset: 5, borderInset: 24, borderHeight: 2, imagePadding: "6px 7px", radius: 12, shadow: "0 6px 14px rgba(124,58,237,0.07)", backgroundAlpha: "10" },
      { layout: "band", cornerSize: 18, cornerOffset: 6, borderInset: 18, borderHeight: 3, imagePadding: "6px", radius: 10, shadow: "0 6px 14px rgba(0,212,255,0.07)", backgroundAlpha: "08" },
    ],
  },
  tech: {
    name: "极客黑",
    emoji: "🛸",
    description: "深色科技风格",
    containerBg: "#1a1a2e",
    titleColor: "#00d4ff",
    textColor: "#e0e0e0",
    subtitleColor: "#7c3aed",
    quoteBg: "#16213e",
    quoteBorder: "#00d4ff",
    bulletColor: "#00d4ff",
    fontSize: "15px",
    lineHeight: "1.9",
    accentEmoji: "🛸",
    sectionEmoji: "📡",
    quoteEmoji: "💬",
    listEmoji: "▪",
    decorations: ["🛸", "🔧", "⚡", "🔮", "💻", "🌐"],
    decorations_inline: "////////",
    bodyTint: "rgba(124, 58, 237, 0.06)",
    frameAssets: {
      cornerGradient: "linear-gradient(135deg, rgba(0,212,255,0.92), rgba(59,130,246,0.78))",
      lineGradient: "linear-gradient(90deg, rgba(0,212,255,0), rgba(0,212,255,0.92), rgba(59,130,246,0.78), rgba(0,212,255,0))",
    },
    frameVariants: [
      { layout: "band", cornerSize: 18, cornerOffset: 6, borderInset: 18, borderHeight: 3, imagePadding: "6px", radius: 10, shadow: "0 6px 14px rgba(0,212,255,0.08)", backgroundAlpha: "08" },
      { layout: "offset", cornerSize: 16, cornerOffset: 5, borderInset: 22, borderHeight: 2, imagePadding: "6px 7px", radius: 12, shadow: "0 6px 14px rgba(124,58,237,0.08)", backgroundAlpha: "10" },
      { layout: "glow", cornerSize: 18, cornerOffset: 6, borderInset: 20, borderHeight: 3, imagePadding: "6px", radius: 12, shadow: "0 6px 14px rgba(0,212,255,0.07)", backgroundAlpha: "08" },
    ],
  },
  professional: {
    name: "商务蓝",
    emoji: "💼",
    description: "专业商务风格",
    containerBg: "#ffffff",
    titleColor: "#1e3a5f",
    textColor: "#374151",
    subtitleColor: "#2563eb",
    quoteBg: "#eff6ff",
    quoteBorder: "#2563eb",
    bulletColor: "#2563eb",
    fontSize: "15px",
    lineHeight: "1.8",
    accentEmoji: "📌",
    sectionEmoji: "📋",
    quoteEmoji: "💡",
    listEmoji: "▪",
    decorations: ["💼", "📊", "✅", "📈", "🔑", "💡"],
    decorations_inline: "───────",
    bodyTint: "rgba(37, 99, 235, 0.05)",
    frameAssets: {
      cornerGradient: "linear-gradient(135deg, rgba(37,99,235,0.9), rgba(125,211,252,0.72))",
      lineGradient: "linear-gradient(90deg, rgba(37,99,235,0), rgba(37,99,235,0.85), rgba(125,211,252,0.72), rgba(37,99,235,0))",
    },
    frameVariants: [
      { layout: "offset", cornerSize: 14, cornerOffset: 4, borderInset: 22, borderHeight: 2, imagePadding: "6px 7px", radius: 12, shadow: "0 5px 12px rgba(30,58,95,0.06)", backgroundAlpha: "08" },
      { layout: "glow", cornerSize: 16, cornerOffset: 5, borderInset: 20, borderHeight: 2, imagePadding: "6px", radius: 12, shadow: "0 5px 12px rgba(37,99,235,0.06)", backgroundAlpha: "08" },
      { layout: "band", cornerSize: 16, cornerOffset: 5, borderInset: 18, borderHeight: 2, imagePadding: "6px", radius: 10, shadow: "0 5px 12px rgba(96,165,250,0.06)", backgroundAlpha: "08" },
    ],
  },
  fresh: {
    name: "清新绿",
    emoji: "🌿",
    description: "清新自然风格",
    containerBg: "#f0fdf4",
    titleColor: "#166534",
    textColor: "#3f3f46",
    subtitleColor: "#16a34a",
    quoteBg: "#dcfce7",
    quoteBorder: "#16a34a",
    bulletColor: "#16a34a",
    fontSize: "15px",
    lineHeight: "1.9",
    accentEmoji: "🌿",
    sectionEmoji: "🌱",
    quoteEmoji: "🌸",
    listEmoji: "▪",
    decorations: ["🌿", "🌸", "🌳", "🍃", "🌻", "🌾"],
    decorations_inline: "~~~~~~~~~",
    bodyTint: "rgba(22, 163, 74, 0.05)",
    frameAssets: {
      cornerGradient: "linear-gradient(135deg, rgba(22,163,74,0.88), rgba(110,231,183,0.7))",
      lineGradient: "linear-gradient(90deg, rgba(22,163,74,0), rgba(22,163,74,0.84), rgba(110,231,183,0.7), rgba(22,163,74,0))",
    },
    frameVariants: [
      { layout: "offset", cornerSize: 16, cornerOffset: 5, borderInset: 22, borderHeight: 2, imagePadding: "6px 7px", radius: 12, shadow: "0 5px 12px rgba(22,101,52,0.06)", backgroundAlpha: "08" },
      { layout: "glow", cornerSize: 14, cornerOffset: 4, borderInset: 20, borderHeight: 2, imagePadding: "6px", radius: 12, shadow: "0 5px 12px rgba(22,163,74,0.06)", backgroundAlpha: "08" },
      { layout: "band", cornerSize: 16, cornerOffset: 5, borderInset: 18, borderHeight: 2, imagePadding: "6px", radius: 10, shadow: "0 5px 12px rgba(110,231,183,0.06)", backgroundAlpha: "08" },
    ],
  },
} as const;

export type TemplateThemeKey = keyof typeof TEMPLATE_THEMES;

type ThemeDecorationSet = {
  cornerGradient: string;
  lineGradient: string;
};

function getThemeDecorationSet(theme: TemplateThemeKey): ThemeDecorationSet {
  return TEMPLATE_THEMES[theme].frameAssets;
}

function getThemeFrameVariant(theme: TemplateThemeKey, index: number, seedSource: string): FrameVariant {
  const variants = TEMPLATE_THEMES[theme].frameVariants;
  const seed = `${theme}:${index}:${seedSource}`;
  let hash = 0;

  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return variants[hash % variants.length];
}

function buildImageFrameHtml(
  image: { desc: string; url?: string },
  theme: TemplateThemeKey,
  index: number
): string {
  const t = TEMPLATE_THEMES[theme];
  const frame = getThemeFrameVariant(theme, index, `${image.url || ""}|${image.desc}`);
  const innerRadius = Math.max(frame.radius - 2, 8);
  const shellRadius = Math.max(frame.radius, 10);
  const lineHeight = Math.max(frame.borderHeight, 2);
  const accentWidth = frame.layout === "band" ? 4 : 2;
  const cornerColor = t.quoteBorder;
  const softBg = t.quoteBg;

  const imgHtml = image.url
    ? `<img src="${image.url}" alt="${image.desc}" style="display:block; width:100%; max-width:100%; border:0; border-radius:${innerRadius}px;">`
    : `<div style="display:flex; align-items:center; justify-content:center; width:100%; height:180px; background:${softBg}; border-radius:${innerRadius}px; color:${t.subtitleColor}; font-size:14px;"><span>${image.desc}</span></div>`;

  const wrappers = {
    glow: `<div style="padding:8px; background:${softBg}; border:1px solid ${cornerColor}; border-radius:${shellRadius}px;"><div style="padding:4px; background:#ffffff; border:1px solid ${cornerColor}; border-radius:${innerRadius + 2}px;">${imgHtml}</div></div>`,
    offset: `<div style="padding:6px; background:#ffffff; border:1px solid ${cornerColor}; border-radius:${shellRadius}px;"><div style="padding:4px; background:${softBg}; border:1px solid ${cornerColor}; border-radius:${innerRadius + 2}px;"><div style="border-radius:${innerRadius}px; overflow:hidden;">${imgHtml}</div></div></div>`,
    band: `<div style="padding:8px; background:#ffffff; border:1px solid ${cornerColor}; border-left:${accentWidth}px solid ${cornerColor}; border-radius:${shellRadius}px;"><div style="padding-top:${lineHeight + 2}px; border-top:${lineHeight}px solid ${cornerColor}; border-radius:${innerRadius}px; overflow:hidden;">${imgHtml}</div></div>`,
  } as const;

  return `<div style="display:block; width:100%; max-width:100%; margin:16px 0 20px;">${wrappers[frame.layout]}</div>`;
}

// 从正文中提取所有图片占位符，返回：(1)去掉占位符后的纯文本, (2)图片数组
function extractImages(content: string): { text: string; images: { desc: string; url?: string }[] } {
  const images: { desc: string; url?: string }[] = [];
  // 匹配 [image]描述[/image] 或 [image]url|描述[/image]
  const regex = /\[image\](?:(https?:\/\/[^\s\[\]]+)\|)?([^\[\]]+)\[\/image\]/g;
  const text = content.replace(regex, (_match, url, desc) => {
    images.push({ desc: desc.trim(), url: url?.trim() });
    return `[IMAGE_PLACEHOLDER_${images.length - 1}]`;
  });
  return { text, images };
}

// 更健壮的图片替换
function replaceImagePlaceholders(html: string, images: { desc: string; url?: string }[], theme: TemplateThemeKey): string {
  let result = html;
  images.forEach((img, i) => {
    const gifFrame = buildImageFrameHtml(img, theme, i);
    const placeholderRegex = new RegExp(`(?:<p[^>]*>\\s*)?(?:\\[)?IMAGE_PLACEHOLDER_${i}(?:\\])?(?:\\s*<\\/p>)?`, "g");
    result = result.replace(placeholderRegex, gifFrame);
  });
  return result;
}

function sanitizeOptimizeResult(raw: string): string {
  let result = raw.trim();

  result = result.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  result = result.replace(/^```(?:html)?\s*/i, "").replace(/```$/i, "").trim();

  const firstHtmlTagIndex = result.search(/<(section|div|h1|h2|h3|p|blockquote|ul|ol|img)\b/i);
  if (firstHtmlTagIndex > 0) {
    result = result.slice(firstHtmlTagIndex).trim();
  }

  const lastClosingIndex = Math.max(
    result.lastIndexOf("</section>"),
    result.lastIndexOf("</div>"),
    result.lastIndexOf("</p>"),
    result.lastIndexOf("</ul>"),
    result.lastIndexOf("</blockquote>")
  );

  if (lastClosingIndex !== -1) {
    const closeTag = result.slice(lastClosingIndex).match(/^<\/\w+>/)?.[0] ?? "";
    result = result.slice(0, lastClosingIndex + closeTag.length).trim();
  }

  return result;
}

function decodeHtmlImagePlaceholders(html: string): string {
  return html
    .replaceAll("&lsqb;", "[")
    .replaceAll("&rsqb;", "]")
    .replaceAll("&#91;", "[")
    .replaceAll("&#93;", "]")
    .replaceAll("&#x5B;", "[")
    .replaceAll("&#x5D;", "]");
}

function ensureImagePlaceholders(html: string, images: { desc: string; url?: string }[]): string {
  let result = decodeHtmlImagePlaceholders(html);

  images.forEach((_img, i) => {
    const placeholderRegex = new RegExp(`(?:<[^>]+>\\s*)*(?:\\[)?IMAGE_PLACEHOLDER_${i}(?:\\])?(?:\\s*<\\/[^>]+>)*`, "g");
    if (!placeholderRegex.test(result)) {
      result += `\n<p>[IMAGE_PLACEHOLDER_${i}]</p>`;
    }
  });

  return result;
}

function replacePlaceholderParagraphs(html: string, index: number, replacement: string): string {
  const token = `IMAGE_PLACEHOLDER_${index}`;
  const paragraphRegex = new RegExp(`<p([^>]*)>([\\s\\S]*?)(?:\\[)?${token}(?:\\])?([\\s\\S]*?)<\\/p>`, "g");

  return html.replace(paragraphRegex, (_match, attrs = "", before = "", after = "") => {
    const attrText = attrs || "";
    const prefix = before.trim();
    const suffix = after.trim();
    const prefixHtml = prefix ? `<p${attrText}>${prefix}</p>` : "";
    const suffixHtml = suffix ? `<p${attrText}>${suffix}</p>` : "";
    return `${prefixHtml}${replacement}${suffixHtml}`;
  });
}

function finalizeOptimizeResult(html: string, images: { desc: string; url?: string }[], theme: TemplateThemeKey): string {
  let result = ensureImagePlaceholders(html, images);

  images.forEach((img, i) => {
    const gifFrame = buildImageFrameHtml(img, theme, i);
    const escaped = `IMAGE_PLACEHOLDER_${i}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = replacePlaceholderParagraphs(result, i, gifFrame);

    const placeholderRegex = new RegExp(`(?:<[^>]+>\\s*)*(?:\\[)?${escaped}(?:\\])?(?:\\s*<\\/[^>]+>)*`, "g");
    result = result.replace(placeholderRegex, gifFrame);
    result = result.replaceAll(`[IMAGE_PLACEHOLDER_${i}]`, gifFrame);
    result = result.replaceAll(`IMAGE_PLACEHOLDER_${i}`, gifFrame);
  });

  const leftoverRegex = /(?:\[|&lsqb;)?IMAGE_PLACEHOLDER_\d+(?:\]|&rsqb;)?/g;
  result = result.replace(leftoverRegex, "");

  return result;
}

const OPTIMIZE_SYSTEM_PROMPT = `你是一个专业的公众号文章排版专家，负责生成可直接粘贴到微信公众号编辑器的精简 HTML 内容。

## 核心原则（最重要）

1. **绝对不修改原文内容**！只调整排版结构、段落划分、标题层次
2. 所有原文的文字、措辞、顺序必须原封不动保留
3. 微信公众号编辑器兼容性优先，只使用简单、稳定、可直接粘贴的内联 style
4. 整体版式参考微信公众号优质活动报道：大留白、窄版正文、柔和底色卡片、清晰标题层级、图片穿插在段落之间
5. 禁止使用 style 标签、keyframes、animation、transform、filter、mix-blend-mode、复杂渐变叠层或依赖高级 CSS 的效果

## 输出要求

1. 只输出最终 HTML，不输出分析过程、规则说明、主题配置、用户要求复述
2. 不要出现“用户要求我将……”“我将……”“要求如下”等说明性文字
3. 不要使用 Markdown 代码块包裹
4. 最终结果必须以 HTML 标签开头
5. **所有图片占位符都必须保留在最终 HTML 中**，不得删除、改写、合并
6. 输出结构务必合法，不能出现嵌套错乱的 <p>、多余闭合标签、空的重复段落标签
7. **正文必须明显重新编排**：即使原文已有分段，也要重新组织成更适合公众号阅读的版式
8. **允许重组段落，但不允许改写句子内容**：可以拆段、并段、调整为列表/引用/小标题区块，但正文原句不能被改写

## 输出格式规范

每个 HTML 标签必须包含完整的内联 style。以下是所有可用标签的样式规范：

### 1. 文章容器
<section style="max-width:720px; margin:0 auto; padding:28px 18px; background:#ffffff; font-size:{SIZE}; line-height:{LH}; color:{TC};">

### 2. 顶部导语卡片
<div style="margin:0 0 22px; padding:14px 16px; background:{QBG}; border:1px solid {QBC}22; border-radius:12px; color:{TC};">{导语原文}</div>

### 3. 一级标题（H2，带细分隔线）
<h2 style="font-size:22px; font-weight:700; color:{H2C}; margin:30px 0 12px; text-align:center; letter-spacing:0.04em;">{emoji} {标题文字}</h2>
<div style="width:64px; height:2px; margin:0 auto 18px; background:{QBC};"></div>

### 4. 二级标题（H3，左侧竖线）
<h3 style="font-size:17px; font-weight:700; color:{H3C}; margin:22px 0 10px; padding-left:10px; border-left:3px solid {QBC};">{emoji} {小标题}</h3>

### 5. 段落（P）
<p style="margin:12px 0; line-height:{LH}; color:{TC}; text-align:justify; text-indent:2em;">{原文内容，原封不动}</p>

### 6. 强调信息卡片
<blockquote style="margin:18px 0; padding:12px 14px; background:{QBG}; border-left:3px solid {QBC}; color:{TC}; font-size:14px; line-height:1.85; border-radius:10px;">{emoji} {引用内容，原文}</blockquote>

### 7. 无序列表（ul + li）
<div style="margin:16px 0; padding:12px 14px; background:{BODY_TINT}; border:1px solid {QBC}18; border-radius:12px;">
<ul style="margin:0; padding:0 0 0 18px; color:{TC};">
<li style="margin:6px 0; line-height:{LH}; color:{TC};">{emoji} {列表项原文}</li>
...
</ul>
</div>

### 8. 细线分隔
<div style="height:1px; margin:22px 0; background:{QBC}33;"></div>

### 9. 图片占位符
在正文中遇到 [image]描述[/image] 或 [image]图片URL|描述[/image] 时：
- 直接输出占位符标签 [IMAGE_PLACEHOLDER_0]、[IMAGE_PLACEHOLDER_1] ...
- 不要在占位符处写任何其他内容
- 不要删除任何一个占位符
- 占位符单独成段，前后保留自然留白

## 排版规则

1. **绝对不改原文**：所有文字内容、措辞、顺序必须与原文完全一致
2. **必须重新排版正文**：不要沿用原始分段，必须根据内容语义重新拆段、合并、分组，让版面明显比原文更规整
3. **首行缩进**：所有正常正文段落都要保留 2 个汉字的首行缩进
4. **层级清晰**：主动补充更合理的小标题、导语卡片、分隔线、列表或引用块，让正文结构一眼可读
5. **图文穿插**：图片必须保持在原文对应位置，不允许移动到文末
6. **简洁优先**：避免复杂阴影、多层包裹、动态效果，优先保证微信后台粘贴成功率
7. **活动报道风格**：更像公众号活动推文，不要做成科技海报感
8. **柔和配色**：用浅色卡片、细线分隔、轻装饰
9. **引用/列表卡片化**：重点段落和要点列表使用简洁容器承载
10. **避免大段墙**：连续长段必须拆开，优先形成 2-4 句一组的阅读节奏
11. **图片处理**：遇到 [image] 占位符，必须在对应位置原样保留 [IMAGE_PLACEHOLDER_n]

## 主题配置

[THEME_CONFIG]

## 待排版原文

[TEXT_CONTENT]

## 用户偏好
- 风格：[STYLE_PREFERENCE]
- 强调程度：[EMPHASIS_PREFERENCE]
- 长度要求：[LENGTH_PREFERENCE]

请直接输出 HTML 内容，不要解释。`;

function buildThemeStyle(theme: keyof typeof TEMPLATE_THEMES) {
  const t = TEMPLATE_THEMES[theme];
  return `
【主题名称】${t.name}
【背景色】${t.containerBg}
【正文颜色】${t.textColor}
【H2标题颜色】${t.titleColor}
【H3小标题颜色】${t.subtitleColor}
【引用块背景】${t.quoteBg}
【引用块边框颜色】${t.quoteBorder}
【列表颜色】${t.bulletColor}
【正文字号】${t.fontSize}
【正文行高】${t.lineHeight}
【正文淡色底】${t.bodyTint}
【H2前缀emoji】${t.accentEmoji}
【H3前缀emoji】${t.sectionEmoji}
【引用前缀emoji】${t.quoteEmoji}
【列表项emoji】${t.listEmoji}
【装饰emoji序列】${t.decorations.join("  ")}
【几何线条装饰符】${t.decorations_inline}
`.trim();
}

export async function POST(request: NextRequest) {
  try {
    const { content, options } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
    }

    const theme = (options?.theme || "dark") as TemplateThemeKey;
    const themeConfig = TEMPLATE_THEMES[theme] || TEMPLATE_THEMES.dark;

    // 提前提取图片占位符，保留到后续注入
    const { text: textWithoutImages, images } = extractImages(content);

    const styleMap: Record<string, string> = {
      professional: "专业严谨，措辞正式，适合企业公告",
      casual: "轻松活泼，口语化，适合活动报道",
      tech: "技术干货风格，逻辑清晰，适合教程",
    };
    const lengthMap: Record<string, string> = {
      shorten: "精简内容，去除冗余表达，保留核心",
      preserve: "保持原文长度和完整性",
      expand: "适当补充细节和案例",
    };
    const emphasisMap: Record<string, string> = {
      light: "轻度突出关键信息",
      balanced: "适中强调重要观点和数据",
      strong: "大量使用引用块和加粗突出重点",
    };

    const style = options?.style || "casual";
    const length = options?.length || "preserve";
    const emphasis = options?.emphasis || "balanced";

    const themeStyle = buildThemeStyle(theme);

    const systemPrompt = OPTIMIZE_SYSTEM_PROMPT
      .replace("[THEME_CONFIG]", themeStyle)
      .replace("[STYLE_PREFERENCE]", styleMap[style] || styleMap.casual)
      .replace("[EMPHASIS_PREFERENCE]", emphasisMap[emphasis] || emphasisMap.balanced)
      .replace("[LENGTH_PREFERENCE]", lengthMap[length] || lengthMap.preserve)
      .replaceAll("{BODY_TINT}", themeConfig.bodyTint)
      .replaceAll("{QBG}", themeConfig.quoteBg)
      .replace("{decorations_inline}", themeConfig.decorations_inline);

    const userPrompt = `请将下面的文章内容，按照主题配置和排版规则生成精简、稳定、适合微信后台粘贴的 HTML 结果。

额外要求：
1. 必须重新整理正文版式，不要照搬原始分段
2. 可以拆段、合并、补充小标题、卡片、列表和引用块，但不能改写任何原文句子
3. 正常正文段落保留首行缩进，整体阅读节奏更像成熟的公众号文章
4. 图片占位符必须严格保留在原位置附近
5. 尽量减少嵌套层级和复杂样式，优先保证复制到微信后台后的稳定性
6. 模块化内容块（导语、引用、列表、小结）要保留轻微背景色，不要全部做成纯白

文章内容：
${textWithoutImages}`;

    let result = await callMiniMax(systemPrompt, userPrompt);
    result = sanitizeOptimizeResult(result);
    result = finalizeOptimizeResult(result, images, theme);

    return NextResponse.json({ result, theme: themeConfig.name });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
