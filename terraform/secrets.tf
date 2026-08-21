# RDSのパスワード制約に抵触する文字（/, @, ", スペース）を除いた記号のみ使う
resource "random_password" "db_password" {
  length           = 24
  special          = true
  override_special = "!#$%^&*()-_=+[]{}<>:?"
}

# HS256の署名鍵として使うため32バイト以上を確保する
resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "db_password" {
  name = "${var.project_name}/db-password"
  # 検証後にdestroy→再作成する運用のため、削除猶予期間を置かず即時削除にする
  # （置いたままだと同名シークレットの再作成時に「削除予定」エラーになる）
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.project_name}/jwt-secret"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

resource "aws_secretsmanager_secret" "s3_access_key_id" {
  name                    = "${var.project_name}/s3-access-key-id"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "s3_access_key_id" {
  secret_id     = aws_secretsmanager_secret.s3_access_key_id.id
  secret_string = aws_iam_access_key.avatar_uploader.id
}

resource "aws_secretsmanager_secret" "s3_secret_access_key" {
  name                    = "${var.project_name}/s3-secret-access-key"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "s3_secret_access_key" {
  secret_id     = aws_secretsmanager_secret.s3_secret_access_key.id
  secret_string = aws_iam_access_key.avatar_uploader.secret
}
