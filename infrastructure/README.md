# Crypto-ERP Infrastructure - Multi-Region Deployment

This directory contains infrastructure-as-code configurations for deploying Crypto-ERP in a multi-region, highly available setup.

---

## Overview

The multi-region infrastructure provides:

- **Global Low Latency**: Read replicas in EU, US, and Asia regions
- **High Availability**: Automatic failover and health monitoring
- **Scalability**: Handle 10,000+ concurrent users
- **GDPR Compliance**: Data residency controls
- **CDN Integration**: Edge caching for static assets
- **Load Balancing**: Geographic routing and health checks

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CloudFront CDN                           │
│              (Global Edge Locations)                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│            Application Load Balancer (ALB)                   │
│          (Geographic Routing + Health Checks)                │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
    ┌───▼───┐ ┌───▼───┐ ┌───▼───┐
    │  API  │ │  API  │ │  API  │
    │  EU   │ │  US   │ │ ASIA  │
    └───┬───┘ └───┬───┘ └───┬───┘
        │         │         │
    ┌───▼───┐ ┌───▼───┐ ┌───▼───┐
    │  DB   │ │  DB   │ │  DB   │
    │Primary│ │Replica│ │Replica│
    │  (W)  │ │  (R)  │ │  (R)  │
    └───────┘ └───────┘ └───────┘
```

---

## Directory Structure

```
infrastructure/
├── cdn/
│   └── cloudfront.tf       # CloudFront CDN configuration
├── alb/
│   └── main.tf             # Application Load Balancer
├── terraform/
│   ├── main.tf             # Main Terraform configuration
│   ├── variables.tf        # Input variables
│   └── outputs.tf          # Output values
└── README.md               # This file
```

---

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Terraform** >= 1.0 installed
3. **AWS CLI** configured with credentials
4. **SSL/TLS Certificate** in AWS Certificate Manager (ACM)
5. **VPC** with public and private subnets

---

## Deployment Steps

### 1. Configure AWS Credentials

```bash
aws configure
```

### 2. Create ACM Certificate

```bash
# Request certificate for your domain
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --validation-method DNS \
  --region us-east-1  # Must be us-east-1 for CloudFront
```

### 3. Initialize Terraform

```bash
cd infrastructure/alb
terraform init
```

### 4. Configure Variables

Create `terraform.tfvars`:

```hcl
project_name = "crypto-erp"
environment  = "production"
vpc_id       = "vpc-xxxxxxxxx"
public_subnet_ids = [
  "subnet-xxxxxxxxx",
  "subnet-yyyyyyyyy",
  "subnet-zzzzzzzzz"
]
certificate_arn = "arn:aws:acm:region:account:certificate/xxxxx"
api_target_port = 3000
```

### 5. Deploy Load Balancer

```bash
cd infrastructure/alb
terraform plan
terraform apply
```

### 6. Deploy CDN

```bash
cd infrastructure/cdn
terraform init

# Configure variables
terraform apply \
  -var="origin_domain=alb-dns-name.region.elb.amazonaws.com" \
  -var="certificate_arn=arn:aws:acm:us-east-1:account:certificate/xxxxx"
```

### 7. Setup Database Replicas

#### Option A: Docker Compose (Local/Development)

```bash
cd ../..
docker-compose -f docker-compose.production.yml up -d
```

#### Option B: AWS RDS (Production)

```bash
# Create primary database
aws rds create-db-instance \
  --db-instance-identifier crypto-erp-primary \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15 \
  --master-username admin \
  --master-user-password <password> \
  --allocated-storage 100 \
  --backup-retention-period 7 \
  --multi-az

# Create read replica in another region
aws rds create-db-instance-read-replica \
  --db-instance-identifier crypto-erp-replica-us \
  --source-db-instance-identifier arn:aws:rds:eu-west-1:account:db:crypto-erp-primary \
  --db-instance-class db.t3.medium \
  --region us-east-1
```

### 8. Configure Environment Variables

Update `.env` with the infrastructure outputs:

```bash
# Primary database
DATABASE_URL="postgresql://admin:password@primary.rds.amazonaws.com:5432/crypto_erp"

# Read replicas
DATABASE_READ_REPLICA_EU="postgresql://admin:password@replica-eu.rds.amazonaws.com:5432/crypto_erp"
DATABASE_READ_REPLICA_US="postgresql://admin:password@replica-us.rds.amazonaws.com:5432/crypto_erp"
DATABASE_READ_REPLICA_ASIA="postgresql://admin:password@replica-asia.rds.amazonaws.com:5432/crypto_erp"

# Region configuration
DATABASE_PRIMARY_REGION=eu
```

### 9. Deploy Application

```bash
# Deploy API to ECS/Fargate or EC2
# Update target group with instance IDs

# Register targets with ALB
aws elbv2 register-targets \
  --target-group-arn <target-group-arn> \
  --targets Id=i-xxxxxxxxx Id=i-yyyyyyyyy
```

---

## Health Monitoring

### Regional Health Check

```bash
curl https://api.yourdomain.com/health/regional
```

Response:
```json
{
  "status": "ok",
  "region": "eu",
  "services": {
    "primaryDatabase": "healthy",
    "readReplicas": [
      { "region": "eu", "status": "healthy", "latency": 12 },
      { "region": "us", "status": "healthy", "latency": 145 },
      { "region": "asia", "status": "healthy", "latency": 230 }
    ],
    "redis": "healthy"
  },
  "replicaCount": 3,
  "uptime": 86400
}
```

### CloudWatch Alarms

The infrastructure automatically creates CloudWatch alarms for:

- **Unhealthy Targets**: Alerts when API instances fail health checks
- **High Response Time**: Alerts when average response time exceeds 1 second
- **4xx/5xx Errors**: Alerts on high error rates

---

## Cost Estimation

### Monthly Costs (Production - 10,000 users)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| **RDS Primary** | db.r6g.large (EU) | $180 |
| **RDS Replica** | db.r6g.large (US) | $180 |
| **RDS Replica** | db.r6g.large (Asia) | $180 |
| **ALB** | 3 regions | $50 |
| **CloudFront** | 1TB data transfer | $85 |
| **ECS Fargate** | 6 tasks (0.5 vCPU, 1GB) | $90 |
| **S3 Logs** | 100GB | $3 |
| **CloudWatch** | Metrics + Alarms | $15 |
| **Data Transfer** | Inter-region replication | $100 |
| **Total** | | **~$883/month** |

### Optimization Tips

1. **Use Reserved Instances** for RDS (save 30-40%)
2. **Enable S3 Lifecycle Policies** for log rotation
3. **Use Fargate Spot** for non-critical workloads (save 70%)
4. **Compress API responses** to reduce CloudFront costs

---

## Security Best Practices

### 1. Database Security

- Enable encryption at rest
- Use IAM database authentication
- Restrict security group rules
- Enable audit logging

```bash
aws rds modify-db-instance \
  --db-instance-identifier crypto-erp-primary \
  --enable-iam-database-authentication \
  --apply-immediately
```

### 2. Network Security

- Use VPC with private subnets for databases
- Enable AWS Shield Standard (free DDoS protection)
- Configure WAF rules for CloudFront
- Use Security Groups with least privilege

### 3. Secrets Management

- Store credentials in AWS Secrets Manager
- Rotate database passwords regularly
- Use IAM roles instead of access keys

```bash
# Store database password in Secrets Manager
aws secretsmanager create-secret \
  --name crypto-erp/db/password \
  --secret-string "your-secure-password"
```

---

## Disaster Recovery

### Backup Strategy

1. **Automated RDS Backups**: 7-day retention
2. **Manual Snapshots**: Before major deployments
3. **Cross-Region Replication**: S3 backups to secondary region

### Recovery Procedures

#### Failover to Read Replica

```bash
# Promote read replica to primary
aws rds promote-read-replica \
  --db-instance-identifier crypto-erp-replica-us

# Update DNS to point to new primary
# Update environment variables
```

#### Restore from Backup

```bash
# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier crypto-erp-restored \
  --db-snapshot-identifier crypto-erp-snapshot-2025-12-20
```

---

## Performance Tuning

### Database Optimization

1. **Enable Connection Pooling**
   ```
   DATABASE_POOL_MIN=2
   DATABASE_POOL_MAX=10
   ```

2. **Read Replica Distribution**
   - EU users → EU replica
   - US users → US replica
   - Asia users → Asia replica

3. **Query Optimization**
   - Use indexes for frequently queried fields
   - Monitor slow queries with CloudWatch Insights
   - Enable query caching in Redis

### CDN Optimization

1. **Cache-Control Headers**
   - Static assets: `max-age=31536000` (1 year)
   - API docs: `max-age=3600` (1 hour)
   - Dynamic API: `no-cache`

2. **Compression**
   - Enable Brotli compression in CloudFront
   - Gzip fallback for older browsers

3. **Edge Functions**
   - Use Lambda@Edge for dynamic header injection
   - Geographic routing based on viewer location

---

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Database**
   - Replication lag
   - CPU utilization
   - IOPS
   - Connection count

2. **Load Balancer**
   - Request count
   - Target response time
   - Healthy/unhealthy target count
   - 4xx/5xx errors

3. **CDN**
   - Cache hit ratio
   - Origin requests
   - Bandwidth usage
   - Error rate

### Grafana Dashboard

Import the pre-configured dashboard:
```bash
# Available in monitoring/grafana/dashboards/multi-region.json
```

---

## Troubleshooting

### Issue: High Replication Lag

**Symptoms**: Stale data in read replicas

**Solutions**:
1. Check network connectivity between regions
2. Increase replica instance size
3. Reduce write load on primary
4. Check for long-running queries

### Issue: Unhealthy Targets

**Symptoms**: ALB reporting unhealthy targets

**Solutions**:
1. Check application logs for errors
2. Verify security group allows ALB health check traffic
3. Increase health check timeout
4. Check database connectivity

### Issue: High CDN Costs

**Symptoms**: Unexpected CloudFront bills

**Solutions**:
1. Enable compression to reduce data transfer
2. Optimize cache hit ratio
3. Use price class to limit edge locations
4. Review origin request patterns

---

## Rollback Procedures

### Rollback Load Balancer Changes

```bash
terraform workspace select production-backup
terraform apply
```

### Rollback Database Migration

```bash
cd libs/database
npx prisma migrate rollback
```

---

## Support & Maintenance

### Regular Maintenance Tasks

1. **Weekly**
   - Review CloudWatch alarms
   - Check replication lag
   - Analyze slow query logs

2. **Monthly**
   - Rotate database passwords
   - Review cost optimization
   - Update security patches

3. **Quarterly**
   - Load testing
   - Disaster recovery drills
   - Infrastructure security audit

---

## Additional Resources

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [PostgreSQL Replication](https://www.postgresql.org/docs/current/warm-standby.html)
- [CloudFront Best Practices](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/best-practices.html)

---

**Last Updated**: December 2025
**Terraform Version**: 1.0+
**AWS Provider Version**: 5.0+
