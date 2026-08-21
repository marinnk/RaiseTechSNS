variable "project_name" {
  description = "リソース名のプレフィックスに使うプロジェクト名"
  type        = string
  default     = "raisetechsns"
}

variable "aws_region" {
  description = "構築先のAWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "backend_image_tag" {
  description = "ECSタスク定義が参照するバックエンドDockerイメージのタグ"
  type        = string
  default     = "latest"
}

variable "db_name" {
  description = "RDSのデータベース名（application.propertiesのPOSTGRES_DBデフォルトに合わせる）"
  type        = string
  default     = "raisetechsns"
}

variable "db_username" {
  description = "RDSのマスターユーザー名（application.propertiesのPOSTGRES_USERデフォルトに合わせる）"
  type        = string
  default     = "raisetechsns"
}
