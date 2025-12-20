# AWS CloudFront CDN Configuration for Crypto-ERP
# Provides global edge caching and geographic routing

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "project_name" {
  description = "Project name"
  default     = "crypto-erp"
}

variable "environment" {
  description = "Environment (staging, production)"
  default     = "production"
}

variable "origin_domain" {
  description = "Origin domain for the API"
  type        = string
}

variable "web_domain" {
  description = "Custom domain for the web application"
  type        = string
  default     = null
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
  default     = null
}

# CloudFront Origin Access Identity for S3
resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "${var.project_name}-${var.environment}-oai"
}

# CloudFront Distribution for API
resource "aws_cloudfront_distribution" "api" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name}-${var.environment}-api"
  default_root_object = ""
  price_class         = "PriceClass_All" # Global distribution

  # Origin - API Backend
  origin {
    domain_name = var.origin_domain
    origin_id   = "api-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    # Custom headers for region detection
    custom_header {
      name  = "X-CloudFront-Distribution"
      value = "${var.project_name}-${var.environment}"
    }
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "api-origin"

    # Forward all headers for API requests (minimal caching)
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Accept", "Content-Type", "CloudFront-Viewer-Country"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0      # No caching for dynamic API
    max_ttl                = 3600   # Max 1 hour
    compress               = true
  }

  # Cache behavior for static assets (images, CSS, JS)
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "api-origin"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 86400    # 1 day
    default_ttl            = 604800   # 7 days
    max_ttl                = 31536000 # 1 year
    compress               = true
  }

  # Cache behavior for API documentation
  ordered_cache_behavior {
    path_pattern     = "/api-docs*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "api-origin"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600  # 1 hour
    max_ttl                = 86400 # 1 day
    compress               = true
  }

  # Geographic restrictions (none by default)
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SSL certificate configuration
  viewer_certificate {
    cloudfront_default_certificate = var.certificate_arn == null
    acm_certificate_arn            = var.certificate_arn
    ssl_support_method             = var.certificate_arn != null ? "sni-only" : null
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  # Aliases (custom domains)
  aliases = var.web_domain != null ? [var.web_domain] : []

  # Logging configuration
  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.cdn_logs.bucket_domain_name
    prefix          = "cloudfront/"
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-api"
    Environment = var.environment
    Project     = var.project_name
  }
}

# S3 bucket for CloudFront logs
resource "aws_s3_bucket" "cdn_logs" {
  bucket = "${var.project_name}-${var.environment}-cdn-logs"

  tags = {
    Name        = "${var.project_name}-${var.environment}-cdn-logs"
    Environment = var.environment
  }
}

# S3 bucket ACL for logs
resource "aws_s3_bucket_acl" "cdn_logs" {
  bucket = aws_s3_bucket.cdn_logs.id
  acl    = "log-delivery-write"
}

# S3 bucket lifecycle policy for logs
resource "aws_s3_bucket_lifecycle_configuration" "cdn_logs" {
  bucket = aws_s3_bucket.cdn_logs.id

  rule {
    id     = "delete-old-logs"
    status = "Enabled"

    expiration {
      days = 90 # Keep logs for 90 days
    }
  }
}

# Outputs
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.api.id
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name"
  value       = aws_cloudfront_distribution.api.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "CloudFront hosted zone ID for Route53"
  value       = aws_cloudfront_distribution.api.hosted_zone_id
}
