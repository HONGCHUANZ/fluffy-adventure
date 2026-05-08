# Procurement Extractor

一个独立的 Python 工具，用于从政府/交易中心公告栏目抓取招标公告，并导出为 Excel。

## 当前支持

- 单站点配置运行
- 多站点 preset 批量运行
- `today` / `manual` 两种日期模式
- 统一完整表头导出
- 每站一个工作表的 Excel 导出
- 详情页正文 + 核心 PDF 附件联合提取
- 金额字段统一换算为“万元”输出
- 页面或附件里明确写了“无 / 无需 / 不接受 / 未要求”等值时，会按有效结果保留
- 当前已接入站点：阜阳市公共资源交易中心、合肥市公共资源交易中心（招标公告首页抓取）

## 统一导出表头

当前统一导出列：
- 开标日期
- 开标时间
- 报名截止日期
- 公告链接
- 项目所属地
- 开标地区
- 项目名称
- 是否需要施组
- 开标办法
- 项目金额（万）
- 资质等级
- 保证金（万）
- 基本户保函
- 建造师现场陈述/答辩
- 业绩要求
- 工程款支付方式
- 工期
- 答疑次数
- 文件包
- 招标文件
- 清单文件
- 答疑文件

## 安装依赖

```bash
python -m pip install -r tools/procurement_extractor/requirements.txt
```

## 运行示例

### 1. 阜阳单站点 + 指定日期

```bash
python -m tools.procurement_extractor.main --config tools/procurement_extractor/sites/fuyang.json --date-mode manual --date 2026-04-30
```

### 2. 合肥单站点 + 指定日期

```bash
python -m tools.procurement_extractor.main --config tools/procurement_extractor/sites/hefei.json --date-mode manual --date 2026-04-30
```

### 3. 多站点 preset 批量运行

```bash
python -m tools.procurement_extractor.main --preset tools/procurement_extractor/sites/presets/default.json --date-mode today
```

### 4. 指定输出路径

```bash
python -m tools.procurement_extractor.main --config tools/procurement_extractor/sites/hefei.json --date-mode manual --date 2026-04-30 --output output/hefei_2026-04-30.xlsx
```

## 输出说明

- 单站点运行：默认输出到 `output/<site_key>_<date>.xlsx`
- 多站点运行：默认输出到 `output/batch_<date>.xlsx`
- 一个工作簿内每个站点一个 worksheet
- 额外包含 `run_summary` 工作表，记录目标日期、导出时间、站点数量、公告总数
- 所有站点统一按 `export_schema.json` 定义的列顺序导出

金额字段如果命中后处理，会统一输出为“万元数值”，例如：
- `3500000元` → `350`
- `4200万元` → `4200`
- `1.2亿元` → `12000`

## 附件补全

当站点配置启用 `attachment` 后，工具会在详情页字段缺失时：

1. 从详情页发现附件链接
2. 仅保留核心附件候选，如招标文件 / 采购文件 / 清单 / 答疑 / 澄清
3. 排除异议 / 投诉 / 复函 / 操作手册等无关附件
4. 首版只解析 PDF
5. 一份招标文件可一次性补齐多个字段
6. 页面或附件中明确写了“无 / 无需 / 不接受 / 未要求”等值时会直接保留

示例配置：

```json
{
  "attachment": {
    "enabled": true,
    "allowed_extensions": ["pdf"],
    "include_keywords": ["招标文件", "采购文件", "清单", "答疑", "澄清"],
    "exclude_keywords": ["异议", "投诉", "复函", "操作手册"],
    "max_candidates": 3,
    "trigger_fields": ["project_amount_wan", "duration_days", "qualification_level"],
    "max_file_size_bytes": 31457280
  }
}
```

## 如何新增站点

1. 复制一个现有站点配置，例如 `sites/fuyang.json` 或 `sites/hefei.json`
2. 修改站点名称、列表接口、字段定义等内容
3. 如需附件补全，新增 `attachment` 配置
4. 如果要加入批量运行，再把它添加到 `sites/presets/default.json`

preset 示例：

```json
{
  "preset_name": "default",
  "sites": [
    {
      "site_key": "fuyang",
      "config_path": "../fuyang.json",
      "enabled": true,
      "sheet_name": "阜阳"
    },
    {
      "site_key": "hefei",
      "config_path": "../hefei.json",
      "enabled": true,
      "sheet_name": "合肥"
    }
  ]
}
```

## 如何加字段

### 1. 加到统一导出表头

先在 `tools/procurement_extractor/export_schema.json` 中新增列定义：

```json
{
  "name": "tenderer",
  "label": "招标人"
}
```

### 2. 加到站点字段规则

再在站点配置的 `fields` 数组里新增提取规则：

```json
{
  "name": "tenderer",
  "label": "招标人",
  "source": "detail",
  "strategy": "label_value",
  "aliases": ["招标人", "招标单位"],
  "required": false,
  "postprocess": []
}
```

如果字段也可能只出现在附件里，只要字段名加入 `attachment.trigger_fields`，附件补全阶段也会尝试回填。

## 每日自动执行

工具本身只负责单次执行。要实现“每天某一时刻自动执行”，建议使用 Windows 任务计划程序调用命令行。

示例：每天抓取当天数据

```bash
python -m tools.procurement_extractor.main --preset tools/procurement_extractor/sites/presets/default.json --date-mode today
```

示例：每天固定抓取手工指定日期

```bash
python -m tools.procurement_extractor.main --preset tools/procurement_extractor/sites/presets/default.json --date-mode manual --date 2026-04-30
```

建议在任务计划程序里把“程序或脚本”设为 Python，可选参数设为上面的命令参数部分，起始目录设为仓库根目录。

## 打包 exe

这轮实现优先保证源码运行；后续如果要发给其他 Windows 电脑，可以再使用 PyInstaller 打包。

```bash
pyinstaller --onedir --name procurement-extractor tools/procurement_extractor/main.py
```

打包时请确保：
- `sites/` 配置目录随 exe 一起分发
- `export_schema.json` 随 exe 一起分发
- 配置文件保持外置，方便后续改字段和别名

## 目录说明

- `main.py`：CLI 入口
- `export_schema.json`：统一导出列定义
- `sites/*.json`：单站点配置
- `sites/presets/*.json`：批量运行预设
- `extractors/`：列表页、详情页、附件提取逻辑
- `exporters/`：Excel 导出
