data "aws_iam_policy_document" "ecs_task_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# --- タスク実行ロール：ECRからのイメージpull・CloudWatch Logsへの書き込み・
# Secrets Managerからのシークレット読み取りに使う（コンテナ起動を"実行"するAWS側の権限） ---

resource "aws_iam_role" "ecs_task_execution" {
  name               = "${var.project_name}-ecs-task-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_managed" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "ecs_task_execution_secrets" {
  statement {
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      aws_secretsmanager_secret.db_password.arn,
      aws_secretsmanager_secret.jwt_secret.arn,
      aws_secretsmanager_secret.s3_access_key_id.arn,
      aws_secretsmanager_secret.s3_secret_access_key.arn,
    ]
  }
}

resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name   = "${var.project_name}-ecs-task-execution-secrets"
  role   = aws_iam_role.ecs_task_execution.id
  policy = data.aws_iam_policy_document.ecs_task_execution_secrets.json
}

# --- タスクロール：コンテナの中で動くアプリ自身が使うAWS権限。
# backend/S3Config.javaは常にStaticCredentialsProvider（静的キー）でS3クライアントを
# 作る実装で、ECSタスクロールベースの認証（DefaultCredentialsProvider）には対応していない。
# そのためタスクロールにS3権限を付けても実際には参照されない。ECSのタスク定義上
# task_role_arnの指定自体は慣例的に必須運用されることが多いため、空ロールとして用意する
# （恒久対応はS3Config側にDefaultCredentialsProviderフォールバックを追加すること。今回はスコープ外） ---

resource "aws_iam_role" "ecs_task" {
  name               = "${var.project_name}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
}

# --- アバターアップロード用IAMユーザー（静的アクセスキー） ---

resource "aws_iam_user" "avatar_uploader" {
  name = "${var.project_name}-avatar-uploader"
}

resource "aws_iam_access_key" "avatar_uploader" {
  user = aws_iam_user.avatar_uploader.name
}

data "aws_iam_policy_document" "avatar_uploader" {
  statement {
    # S3StorageServiceが呼ぶのはPutObject/DeleteObjectのみ（GetObjectはブラウザが
    # 匿名で直接行うためSDK経由では呼ばない）。最小権限に絞る
    actions   = ["s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.avatars.arn}/*"]
  }
}

resource "aws_iam_user_policy" "avatar_uploader" {
  name   = "${var.project_name}-avatar-uploader-policy"
  user   = aws_iam_user.avatar_uploader.name
  policy = data.aws_iam_policy_document.avatar_uploader.json
}
