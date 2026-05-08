from __future__ import annotations

import json
from pathlib import Path

from .models import ExportColumn, ExportSchema, SiteConfig, SitePreset


class ConfigError(Exception):
    pass


def _load_json_file(path: Path):
    if not path.exists():
        raise ConfigError(f"Config file not found: {path}")

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ConfigError(f"Invalid JSON in config file {path}: {exc}") from exc


def load_site_config(config_path: str | Path) -> SiteConfig:
    path = Path(config_path)
    data = _load_json_file(path)

    try:
        return SiteConfig.model_validate(data)
    except Exception as exc:
        raise ConfigError(f"Invalid config structure in {path}: {exc}") from exc


def load_site_preset(preset_path: str | Path) -> SitePreset:
    path = Path(preset_path)
    data = _load_json_file(path)

    try:
        return SitePreset.model_validate(data)
    except Exception as exc:
        raise ConfigError(f"Invalid preset structure in {path}: {exc}") from exc


def load_export_schema(schema_path: str | Path) -> list[ExportColumn]:
    path = Path(schema_path)
    data = _load_json_file(path)

    try:
        if isinstance(data, dict):
            schema = ExportSchema.model_validate(data)
        else:
            schema = ExportSchema(columns=data)
        return schema.columns
    except Exception as exc:
        raise ConfigError(f"Invalid export schema in {path}: {exc}") from exc


def resolve_site_config_path(config_path: str | Path, *, base_path: str | Path | None = None) -> Path:
    path = Path(config_path)
    if path.is_absolute():
        return path
    if base_path is None:
        return path
    return Path(base_path).joinpath(path).resolve()
