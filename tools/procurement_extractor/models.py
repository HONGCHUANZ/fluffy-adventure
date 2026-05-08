from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, model_validator


FieldSource = Literal["list", "detail", "computed"]
FieldStrategy = Literal["list_key", "label_value", "regex"]
ListResponseType = Literal["json", "html"]


class FieldDefinition(BaseModel):
    name: str
    label: str
    source: FieldSource
    strategy: FieldStrategy
    aliases: List[str] = Field(default_factory=list)
    key: Optional[str] = None
    pattern: Optional[str] = None
    required: bool = False
    postprocess: List[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_strategy_requirements(self) -> "FieldDefinition":
        if self.strategy == "list_key" and not self.key:
            raise ValueError(f"Field {self.name} requires 'key' for list_key strategy")
        if self.strategy == "regex" and not self.pattern:
            raise ValueError(f"Field {self.name} requires 'pattern' for regex strategy")
        return self


class ExportColumn(BaseModel):
    name: str
    label: str


class ExportSchema(BaseModel):
    columns: List[ExportColumn]


class AttachmentConfig(BaseModel):
    enabled: bool = False
    allowed_extensions: List[str] = Field(default_factory=lambda: ["pdf"])
    include_keywords: List[str] = Field(
        default_factory=lambda: ["招标文件", "采购文件", "工程量清单", "清单", "控制价", "限价", "答疑", "澄清", "补遗", "更正"]
    )
    exclude_keywords: List[str] = Field(
        default_factory=lambda: ["异议", "投诉", "质疑", "复函", "立项", "批复", "核准", "审批", "操作手册"]
    )
    max_candidates: int = 2
    trigger_fields: List[str] = Field(default_factory=list)
    max_file_size_bytes: Optional[int] = None


class AttachmentCandidate(BaseModel):
    url: str
    title: str
    text: str = ""
    extension: str = ""
    score: int = 0


class ListRequestConfig(BaseModel):
    method: Literal["GET", "POST"] = "POST"
    url: str
    headers: Dict[str, str] = Field(default_factory=dict)
    static_params: Dict[str, Any] = Field(default_factory=dict)
    date_param_names: Dict[str, str] = Field(default_factory=dict)
    list_path: str = "custom"
    response_type: ListResponseType = "json"
    link_selector: Optional[str] = None
    title_keywords: List[str] = Field(default_factory=list)
    html_date_pattern: str = r"/(\d{8})/"
    html_title_attr: str = ""


class DateFilterConfig(BaseModel):
    mode: Literal["prefix"] = "prefix"
    list_date_key: str = "infodate"


class SiteConfig(BaseModel):
    site_key: str
    site_name: str
    base_url: str
    category_page_url: str
    list_request: ListRequestConfig
    date_filter: DateFilterConfig
    fields: List[FieldDefinition]
    attachment: Optional[AttachmentConfig] = None


class PresetEntry(BaseModel):
    site_key: Optional[str] = None
    config_path: str
    enabled: bool = True
    sheet_name: Optional[str] = None


class SitePreset(BaseModel):
    preset_name: str
    sites: List[PresetEntry]
