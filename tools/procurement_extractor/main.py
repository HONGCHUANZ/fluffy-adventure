from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path

from .config_loader import load_export_schema, load_site_config, load_site_preset, resolve_site_config_path
from .discovery import fetch_list_items
from .extractors.attachment_extractor import backfill_from_attachments, summarize_attachments
from .extractors.detail_extractor import extract_detail_fields
from .extractors.list_extractor import extract_list_fields
from .exporters.excel_exporter import export_records
from .http_client import HttpClient
from .logging_utils import setup_logging
from .models import ExportColumn, SiteConfig


EXPORT_SCHEMA_PATH = Path(__file__).with_name("export_schema.json")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="招标公告提取工具")
    source_group = parser.add_mutually_exclusive_group(required=True)
    source_group.add_argument("--config", help="单个站点配置文件路径")
    source_group.add_argument("--preset", help="站点预设文件路径")
    parser.add_argument("--date-mode", choices=["today", "manual"], default="manual", help="日期模式：today 抓取当天，manual 抓取指定日期")
    parser.add_argument("--date", help="目标日期，格式 YYYY-MM-DD；date-mode=manual 时必填")
    parser.add_argument("--output", help="输出文件路径")
    parser.add_argument("--verbose", action="store_true", help="输出调试日志")
    return parser


def resolve_target_date(date_mode: str, explicit_date: str | None) -> str:
    if date_mode == "today":
        return date.today().isoformat()
    if not explicit_date:
        raise ValueError("--date-mode manual 时必须提供 --date")
    return explicit_date


def _initialize_record(columns: list[ExportColumn]) -> dict[str, str]:
    return {column.name: "" for column in columns}


def fetch_site_records(client: HttpClient, config: SiteConfig, target_date: str, export_columns: list[ExportColumn]) -> list[dict[str, str]]:
    list_items = fetch_list_items(client, config, target_date)
    records: list[dict[str, str]] = []

    for item in list_items:
        record = _initialize_record(export_columns)
        record.update(extract_list_fields(item, config.fields))
        detail_url = record.get("detail_url")
        detail_html = client.get_text(detail_url)
        detail_values = extract_detail_fields(detail_html, config.fields)
        record.update({key: value for key, value in detail_values.items() if value})
        record.update(summarize_attachments(detail_html, detail_url, config.attachment))
        attachment_values = backfill_from_attachments(
            client,
            detail_html,
            detail_url,
            record,
            config.fields,
            config.attachment,
        )
        for field_name, value in attachment_values.items():
            if value:
                record[field_name] = value
        records.append(record)

    return records


def load_configs(args: argparse.Namespace) -> list[tuple[SiteConfig, str | None]]:
    if args.config:
        config = load_site_config(args.config)
        return [(config, None)]

    preset_path = Path(args.preset)
    preset = load_site_preset(preset_path)
    configs: list[tuple[SiteConfig, str | None]] = []
    for entry in preset.sites:
        if not entry.enabled:
            continue
        config_path = resolve_site_config_path(entry.config_path, base_path=preset_path.parent)
        config = load_site_config(config_path)
        if entry.site_key and entry.site_key != config.site_key:
            raise ValueError(f"Preset site_key mismatch for {config_path}: {entry.site_key} != {config.site_key}")
        configs.append((config, entry.sheet_name))
    return configs


def build_output_path(output_path: str | None, configs: list[tuple[SiteConfig, str | None]], target_date: str) -> str:
    if output_path:
        return output_path
    if len(configs) == 1:
        return str(Path("output") / f"{configs[0][0].site_key}_{target_date}.xlsx")
    return str(Path("output") / f"batch_{target_date}.xlsx")


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    setup_logging(args.verbose)
    target_date = resolve_target_date(args.date_mode, args.date)
    export_columns = load_export_schema(EXPORT_SCHEMA_PATH)
    configs = load_configs(args)
    client = HttpClient(timeout=40)

    records_by_site: list[dict[str, object]] = []
    for config, sheet_name in configs:
        records = fetch_site_records(client, config, target_date, export_columns)
        records_by_site.append(
            {
                "site_key": config.site_key,
                "site_name": config.site_name,
                "sheet_name": sheet_name or config.site_name,
                "columns": [(column.name, column.label) for column in export_columns],
                "records": records,
            }
        )

    final_output_path = build_output_path(args.output, configs, target_date)
    final_path = export_records(records_by_site, final_output_path, target_date=target_date)
    print(final_path)


if __name__ == "__main__":
    main()
