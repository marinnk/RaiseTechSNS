# --- フロントエンド配信用バケット（非公開、CloudFront OAC経由のみアクセス可） ---

resource "aws_s3_bucket" "frontend" {
  bucket        = "${var.project_name}-frontend-${data.aws_caller_identity.current.account_id}"
  force_destroy = true

  tags = { Name = "${var.project_name}-frontend" }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

# --- アバター画像用バケット（S3StorageServiceがpath-styleの直リンクURLを発行するため、
# 匿名read公開が必要。ローカル開発のMinIOバケット設定[匿名read]と同じ挙動に合わせる） ---

resource "aws_s3_bucket" "avatars" {
  bucket        = "${var.project_name}-avatars-${data.aws_caller_identity.current.account_id}"
  force_destroy = true

  tags = { Name = "${var.project_name}-avatars" }
}

resource "aws_s3_bucket_public_access_block" "avatars" {
  bucket = aws_s3_bucket.avatars.id
  # ACLではなくバケットポリシーで公開するため、ACL関連の2項目はtrueのままでよい
  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "avatars" {
  bucket = aws_s3_bucket.avatars.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadAvatars"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.avatars.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.avatars]
}
