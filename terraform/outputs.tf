output "cloudfront_domain_name" {
  description = "アプリにアクセスするためのCloudFrontドメイン（このURLをブラウザで開く）"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "alb_dns_name" {
  description = "ALBのDNS名（デバッグ用。通常はCloudFront経由でアクセスする）"
  value       = aws_lb.main.dns_name
}

output "ecr_repository_url" {
  description = "バックエンドDockerイメージのpush先"
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_bucket_name" {
  description = "フロントエンドの静的ファイルを配置するS3バケット名"
  value       = aws_s3_bucket.frontend.bucket
}

output "avatars_bucket_name" {
  description = "アバター画像を保存するS3バケット名"
  value       = aws_s3_bucket.avatars.bucket
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.backend.name
}
