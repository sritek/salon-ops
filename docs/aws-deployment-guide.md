# AWS Deployment Guide - Salon Management SaaS

## Overview

This guide covers deploying the Salon Management SaaS platform to AWS for production use. The architecture uses ECS Fargate for containerized workloads, RDS PostgreSQL for the database, ElastiCache Redis for caching/queues, and S3 for file storage.

**Target Environment:** Production-ready for 10-20 pilot salons
**Estimated Monthly Cost:** ~$150-300/month (can scale down for pilot)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [AWS Account Setup](#2-aws-account-setup)
3. [Infrastructure Overview](#3-infrastructure-overview)
4. [Step-by-Step Deployment](#4-step-by-step-deployment)
5. [Environment Configuration](#5-environment-configuration)
6. [Database Setup](#6-database-setup)
7. [Application Deployment](#7-application-deployment)
8. [Domain & SSL Setup](#8-domain--ssl-setup)
9. [Monitoring & Logging](#9-monitoring--logging)
10. [Cost Optimization](#10-cost-optimization)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

### Local Tools Required

```bash
# Install AWS CLI v2
brew install awscli

# Install Docker
brew install --cask docker

# Install Terraform (optional, for IaC)
brew install terraform

# Verify installations
aws --version
docker --version
```

### AWS Account Requirements

- AWS Account with admin access
- AWS CLI configured with credentials
- Domain name (e.g., `salonops.in` or `yoursalon.com`)

### Project Requirements

- All Docker images build successfully locally
- Environment variables documented
- Database migrations ready

---

## 2. AWS Account Setup

### 2.1 Create IAM User for Deployment

```bash
# Create a deployment user (do this in AWS Console or CLI)
aws iam create-user --user-name salon-ops-deployer

# Attach required policies
aws iam attach-user-policy --user-name salon-ops-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

aws iam attach-user-policy --user-name salon-ops-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonRDSFullAccess

aws iam attach-user-policy --user-name salon-ops-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonElastiCacheFullAccess

aws iam attach-user-policy --user-name salon-ops-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-user-policy --user-name salon-ops-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess

aws iam attach-user-policy --user-name salon-ops-deployer \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
```

### 2.2 Configure AWS CLI

```bash
# Configure with your credentials
aws configure

# Set default region (Mumbai for India)
AWS_DEFAULT_REGION=ap-south-1
```

---

## 3. Infrastructure Overview

### Architecture for Pilot (Cost-Optimized)

```
┌─────────────────────────────────────────────────────────────┐
│                    PILOT ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Route 53 ──► CloudFront ──► ALB ──► ECS Fargate            │
│                                        │                     │
│                                        ├── API Service       │
│                                        ├── Web Service       │
│                                        └── Worker Service    │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │ RDS PostgreSQL  │    │ ElastiCache     │                 │
│  │ (db.t3.micro)   │    │ (cache.t3.micro)│                 │
│  └─────────────────┘    └─────────────────┘                 │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │ S3 Bucket       │    │ Secrets Manager │                 │
│  │ (File Storage)  │    │ (Credentials)   │                 │
│  └─────────────────┘    └─────────────────┘                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### AWS Services Used

| Service           | Purpose           | Pilot Tier                       |
| ----------------- | ----------------- | -------------------------------- |
| ECS Fargate       | Container hosting | 0.25 vCPU, 0.5GB RAM             |
| RDS PostgreSQL    | Database          | db.t3.micro (Free tier eligible) |
| ElastiCache Redis | Cache & Queues    | cache.t3.micro                   |
| S3                | File storage      | Standard                         |
| CloudFront        | CDN               | Free tier: 1TB/month             |
| Route 53          | DNS               | $0.50/hosted zone                |
| ACM               | SSL Certificates  | Free                             |
| Secrets Manager   | Credentials       | $0.40/secret/month               |
| CloudWatch        | Monitoring        | Basic (free)                     |

---

## 4. Step-by-Step Deployment

### 4.1 Create ECR Repositories

```bash
# Set variables
export AWS_REGION=ap-south-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REGISTRY=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Create repositories
aws ecr create-repository --repository-name salon-ops/api --region $AWS_REGION
aws ecr create-repository --repository-name salon-ops/web --region $AWS_REGION
aws ecr create-repository --repository-name salon-ops/worker --region $AWS_REGION

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
```

### 4.2 Build and Push Docker Images

```bash
# From project root directory

# Build API image
docker build -f infrastructure/docker/api/Dockerfile -t salon-ops/api:latest .
docker tag salon-ops/api:latest $ECR_REGISTRY/salon-ops/api:latest
docker push $ECR_REGISTRY/salon-ops/api:latest

# Build Web image (with build args)
docker build -f infrastructure/docker/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  --build-arg NEXT_PUBLIC_APP_URL=https://app.yourdomain.com \
  -t salon-ops/web:latest .
docker tag salon-ops/web:latest $ECR_REGISTRY/salon-ops/web:latest
docker push $ECR_REGISTRY/salon-ops/web:latest

# Build Worker image
docker build -f infrastructure/docker/worker/Dockerfile -t salon-ops/worker:latest .
docker tag salon-ops/worker:latest $ECR_REGISTRY/salon-ops/worker:latest
docker push $ECR_REGISTRY/salon-ops/worker:latest
```

### 4.3 Create VPC and Networking

```bash
# Create VPC (or use default VPC for pilot)
# For pilot, we'll use the default VPC to save costs

# Get default VPC ID
export VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)

# Get subnet IDs (need at least 2 for ALB)
export SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[*].SubnetId" --output text | tr '\t' ',')

echo "VPC ID: $VPC_ID"
echo "Subnet IDs: $SUBNET_IDS"
```

### 4.4 Create Security Groups

```bash
# Create security group for ALB
aws ec2 create-security-group \
  --group-name salon-ops-alb-sg \
  --description "Security group for Salon Ops ALB" \
  --vpc-id $VPC_ID

export ALB_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=salon-ops-alb-sg" --query "SecurityGroups[0].GroupId" --output text)

# Allow HTTP and HTTPS
aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0

# Create security group for ECS tasks
aws ec2 create-security-group \
  --group-name salon-ops-ecs-sg \
  --description "Security group for Salon Ops ECS tasks" \
  --vpc-id $VPC_ID

export ECS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=salon-ops-ecs-sg" --query "SecurityGroups[0].GroupId" --output text)

# Allow traffic from ALB
aws ec2 authorize-security-group-ingress --group-id $ECS_SG_ID --protocol tcp --port 3000 --source-group $ALB_SG_ID

# Create security group for RDS
aws ec2 create-security-group \
  --group-name salon-ops-rds-sg \
  --description "Security group for Salon Ops RDS" \
  --vpc-id $VPC_ID

export RDS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=salon-ops-rds-sg" --query "SecurityGroups[0].GroupId" --output text)

# Allow PostgreSQL from ECS
aws ec2 authorize-security-group-ingress --group-id $RDS_SG_ID --protocol tcp --port 5432 --source-group $ECS_SG_ID

# Create security group for Redis
aws ec2 create-security-group \
  --group-name salon-ops-redis-sg \
  --description "Security group for Salon Ops Redis" \
  --vpc-id $VPC_ID

export REDIS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=salon-ops-redis-sg" --query "SecurityGroups[0].GroupId" --output text)

# Allow Redis from ECS
aws ec2 authorize-security-group-ingress --group-id $REDIS_SG_ID --protocol tcp --port 6379 --source-group $ECS_SG_ID
```

### 4.5 Create RDS PostgreSQL Database

```bash
# Create DB subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name salon-ops-db-subnet \
  --db-subnet-group-description "Subnet group for Salon Ops RDS" \
  --subnet-ids $SUBNET_IDS

# Generate a secure password
export DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)
echo "Save this password securely: $DB_PASSWORD"

# Create RDS instance (db.t3.micro for pilot - free tier eligible)
aws rds create-db-instance \
  --db-instance-identifier salon-ops-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15 \
  --master-username postgres \
  --master-user-password $DB_PASSWORD \
  --allocated-storage 20 \
  --storage-type gp2 \
  --db-name salon_ops \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name salon-ops-db-subnet \
  --backup-retention-period 7 \
  --no-publicly-accessible \
  --storage-encrypted

# Wait for RDS to be available (takes 5-10 minutes)
aws rds wait db-instance-available --db-instance-identifier salon-ops-db

# Get RDS endpoint
export RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier salon-ops-db --query "DBInstances[0].Endpoint.Address" --output text)
echo "RDS Endpoint: $RDS_ENDPOINT"
```

### 4.6 Create ElastiCache Redis

```bash
# Create cache subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name salon-ops-redis-subnet \
  --cache-subnet-group-description "Subnet group for Salon Ops Redis" \
  --subnet-ids $(echo $SUBNET_IDS | tr ',' ' ')

# Create Redis cluster (cache.t3.micro for pilot)
aws elasticache create-cache-cluster \
  --cache-cluster-id salon-ops-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name salon-ops-redis-subnet \
  --security-group-ids $REDIS_SG_ID

# Wait for Redis to be available (takes 5-10 minutes)
aws elasticache wait cache-cluster-available --cache-cluster-id salon-ops-redis

# Get Redis endpoint
export REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters --cache-cluster-id salon-ops-redis --show-cache-node-info --query "CacheClusters[0].CacheNodes[0].Endpoint.Address" --output text)
echo "Redis Endpoint: $REDIS_ENDPOINT"
```

### 4.7 Create S3 Bucket

```bash
# Create S3 bucket for file storage
export S3_BUCKET_NAME=salon-ops-files-$(openssl rand -hex 4)

aws s3api create-bucket \
  --bucket $S3_BUCKET_NAME \
  --region $AWS_REGION \
  --create-bucket-configuration LocationConstraint=$AWS_REGION

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket $S3_BUCKET_NAME \
  --versioning-configuration Status=Enabled

# Block public access
aws s3api put-public-access-block \
  --bucket $S3_BUCKET_NAME \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Create CORS configuration for uploads
cat > /tmp/cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedOrigins": ["https://app.yourdomain.com"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
EOF

aws s3api put-bucket-cors --bucket $S3_BUCKET_NAME --cors-configuration file:///tmp/cors.json

echo "S3 Bucket: $S3_BUCKET_NAME"
```

### 4.8 Store Secrets in AWS Secrets Manager

```bash
# Create secret for database credentials
aws secretsmanager create-secret \
  --name salon-ops/database \
  --description "Database credentials for Salon Ops" \
  --secret-string "{\"username\":\"postgres\",\"password\":\"$DB_PASSWORD\",\"host\":\"$RDS_ENDPOINT\",\"port\":5432,\"database\":\"salon_ops\"}"

# Generate JWT secret
export JWT_SECRET=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)

# Create secret for application
aws secretsmanager create-secret \
  --name salon-ops/app \
  --description "Application secrets for Salon Ops" \
  --secret-string "{\"JWT_SECRET\":\"$JWT_SECRET\"}"

echo "Secrets created in AWS Secrets Manager"
```

---

## 5. Environment Configuration

### 5.1 Create ECS Task Execution Role

```bash
# Create trust policy
cat > /tmp/ecs-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name salon-ops-ecs-task-execution-role \
  --assume-role-policy-document file:///tmp/ecs-trust-policy.json

# Attach policies
aws iam attach-role-policy \
  --role-name salon-ops-ecs-task-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Create policy for Secrets Manager access
cat > /tmp/secrets-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:salon-ops/*"
      ]
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name salon-ops-ecs-task-execution-role \
  --policy-name SecretsManagerAccess \
  --policy-document file:///tmp/secrets-policy.json

export TASK_EXECUTION_ROLE_ARN=arn:aws:iam::$AWS_ACCOUNT_ID:role/salon-ops-ecs-task-execution-role
```

### 5.2 Create ECS Task Role (for S3 access)

```bash
# Create task role
aws iam create-role \
  --role-name salon-ops-ecs-task-role \
  --assume-role-policy-document file:///tmp/ecs-trust-policy.json

# Create S3 access policy
cat > /tmp/s3-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::$S3_BUCKET_NAME",
        "arn:aws:s3:::$S3_BUCKET_NAME/*"
      ]
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name salon-ops-ecs-task-role \
  --policy-name S3Access \
  --policy-document file:///tmp/s3-policy.json

export TASK_ROLE_ARN=arn:aws:iam::$AWS_ACCOUNT_ID:role/salon-ops-ecs-task-role
```

---

## 6. Database Setup

### 6.1 Run Database Migrations

To run migrations, you need temporary access to the RDS instance. We'll use a bastion approach or ECS task.

```bash
# Option 1: Run migration as a one-time ECS task

# Create migration task definition
cat > /tmp/migration-task.json << EOF
{
  "family": "salon-ops-migration",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "$TASK_EXECUTION_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "migration",
      "image": "$ECR_REGISTRY/salon-ops/api:latest",
      "essential": true,
      "command": ["npx", "prisma", "migrate", "deploy"],
      "environment": [
        {"name": "DATABASE_URL", "value": "postgresql://postgres:$DB_PASSWORD@$RDS_ENDPOINT:5432/salon_ops"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/salon-ops",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "migration"
        }
      }
    }
  ]
}
EOF

# Create CloudWatch log group
aws logs create-log-group --log-group-name /ecs/salon-ops

# Register task definition
aws ecs register-task-definition --cli-input-json file:///tmp/migration-task.json

# Create ECS cluster
aws ecs create-cluster --cluster-name salon-ops-cluster

# Run migration task
aws ecs run-task \
  --cluster salon-ops-cluster \
  --task-definition salon-ops-migration \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$(echo $SUBNET_IDS | cut -d',' -f1)],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}"
```

### 6.2 Seed Initial Data (Optional)

```bash
# Create seed task definition
cat > /tmp/seed-task.json << EOF
{
  "family": "salon-ops-seed",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "$TASK_EXECUTION_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "seed",
      "image": "$ECR_REGISTRY/salon-ops/api:latest",
      "essential": true,
      "command": ["npx", "tsx", "prisma/seed.ts"],
      "environment": [
        {"name": "DATABASE_URL", "value": "postgresql://postgres:$DB_PASSWORD@$RDS_ENDPOINT:5432/salon_ops"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/salon-ops",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "seed"
        }
      }
    }
  ]
}
EOF

aws ecs register-task-definition --cli-input-json file:///tmp/seed-task.json

# Run seed task
aws ecs run-task \
  --cluster salon-ops-cluster \
  --task-definition salon-ops-seed \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$(echo $SUBNET_IDS | cut -d',' -f1)],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}"
```

---

## 7. Application Deployment

### 7.1 Create Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name salon-ops-alb \
  --subnets $(echo $SUBNET_IDS | tr ',' ' ') \
  --security-groups $ALB_SG_ID \
  --scheme internet-facing \
  --type application

export ALB_ARN=$(aws elbv2 describe-load-balancers --names salon-ops-alb --query "LoadBalancers[0].LoadBalancerArn" --output text)
export ALB_DNS=$(aws elbv2 describe-load-balancers --names salon-ops-alb --query "LoadBalancers[0].DNSName" --output text)

echo "ALB DNS: $ALB_DNS"

# Create target groups
# API target group
aws elbv2 create-target-group \
  --name salon-ops-api-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30

export API_TG_ARN=$(aws elbv2 describe-target-groups --names salon-ops-api-tg --query "TargetGroups[0].TargetGroupArn" --output text)

# Web target group
aws elbv2 create-target-group \
  --name salon-ops-web-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path / \
  --health-check-interval-seconds 30

export WEB_TG_ARN=$(aws elbv2 describe-target-groups --names salon-ops-web-tg --query "TargetGroups[0].TargetGroupArn" --output text)

# Create HTTP listener (will redirect to HTTPS after SSL setup)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$WEB_TG_ARN
```

### 7.2 Create ECS Task Definitions

```bash
# API Task Definition
cat > /tmp/api-task.json << EOF
{
  "family": "salon-ops-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "$TASK_EXECUTION_ROLE_ARN",
  "taskRoleArn": "$TASK_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "$ECR_REGISTRY/salon-ops/api:latest",
      "essential": true,
      "portMappings": [
        {"containerPort": 3000, "protocol": "tcp"}
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "3000"},
        {"name": "DATABASE_URL", "value": "postgresql://postgres:$DB_PASSWORD@$RDS_ENDPOINT:5432/salon_ops"},
        {"name": "REDIS_URL", "value": "redis://$REDIS_ENDPOINT:6379"},
        {"name": "JWT_SECRET", "value": "$JWT_SECRET"},
        {"name": "JWT_ACCESS_EXPIRY", "value": "15m"},
        {"name": "JWT_REFRESH_EXPIRY", "value": "7d"},
        {"name": "AWS_REGION", "value": "$AWS_REGION"},
        {"name": "S3_BUCKET_NAME", "value": "$S3_BUCKET_NAME"},
        {"name": "API_URL", "value": "https://api.yourdomain.com"},
        {"name": "APP_URL", "value": "https://app.yourdomain.com"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/salon-ops",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "api"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

aws ecs register-task-definition --cli-input-json file:///tmp/api-task.json

# Web Task Definition
cat > /tmp/web-task.json << EOF
{
  "family": "salon-ops-web",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "$TASK_EXECUTION_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "web",
      "image": "$ECR_REGISTRY/salon-ops/web:latest",
      "essential": true,
      "portMappings": [
        {"containerPort": 3000, "protocol": "tcp"}
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/salon-ops",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "web"
        }
      }
    }
  ]
}
EOF

aws ecs register-task-definition --cli-input-json file:///tmp/web-task.json

# Worker Task Definition
cat > /tmp/worker-task.json << EOF
{
  "family": "salon-ops-worker",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "$TASK_EXECUTION_ROLE_ARN",
  "taskRoleArn": "$TASK_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "worker",
      "image": "$ECR_REGISTRY/salon-ops/worker:latest",
      "essential": true,
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "DATABASE_URL", "value": "postgresql://postgres:$DB_PASSWORD@$RDS_ENDPOINT:5432/salon_ops"},
        {"name": "REDIS_URL", "value": "redis://$REDIS_ENDPOINT:6379"},
        {"name": "AWS_REGION", "value": "$AWS_REGION"},
        {"name": "S3_BUCKET_NAME", "value": "$S3_BUCKET_NAME"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/salon-ops",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "worker"
        }
      }
    }
  ]
}
EOF

aws ecs register-task-definition --cli-input-json file:///tmp/worker-task.json
```

### 7.3 Create ECS Services

```bash
# Create API service
aws ecs create-service \
  --cluster salon-ops-cluster \
  --service-name salon-ops-api \
  --task-definition salon-ops-api \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$(echo $SUBNET_IDS | tr ',' ' ' | awk '{print $1}')],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$API_TG_ARN,containerName=api,containerPort=3000"

# Create Web service
aws ecs create-service \
  --cluster salon-ops-cluster \
  --service-name salon-ops-web \
  --task-definition salon-ops-web \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$(echo $SUBNET_IDS | tr ',' ' ' | awk '{print $1}')],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$WEB_TG_ARN,containerName=web,containerPort=3000"

# Create Worker service (no load balancer)
aws ecs create-service \
  --cluster salon-ops-cluster \
  --service-name salon-ops-worker \
  --task-definition salon-ops-worker \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$(echo $SUBNET_IDS | tr ',' ' ' | awk '{print $1}')],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}"

echo "Services created! Check status with:"
echo "aws ecs describe-services --cluster salon-ops-cluster --services salon-ops-api salon-ops-web salon-ops-worker"
```

---

## 8. Domain & SSL Setup

### 8.1 Create Route 53 Hosted Zone

```bash
# Create hosted zone (if you don't have one)
aws route53 create-hosted-zone \
  --name yourdomain.com \
  --caller-reference $(date +%s)

# Get hosted zone ID
export HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name --dns-name yourdomain.com --query "HostedZones[0].Id" --output text | cut -d'/' -f3)

echo "Hosted Zone ID: $HOSTED_ZONE_ID"
echo "Update your domain registrar with these nameservers:"
aws route53 get-hosted-zone --id $HOSTED_ZONE_ID --query "DelegationSet.NameServers"
```

### 8.2 Request SSL Certificate

```bash
# Request certificate for your domains
aws acm request-certificate \
  --domain-name yourdomain.com \
  --subject-alternative-names "*.yourdomain.com" \
  --validation-method DNS \
  --region $AWS_REGION

# Get certificate ARN
export CERT_ARN=$(aws acm list-certificates --query "CertificateSummaryList[?DomainName=='yourdomain.com'].CertificateArn" --output text)

echo "Certificate ARN: $CERT_ARN"

# Get DNS validation records
aws acm describe-certificate --certificate-arn $CERT_ARN --query "Certificate.DomainValidationOptions"

# Add the CNAME records to Route 53 for validation
# (AWS Console is easier for this step)
```

### 8.3 Add HTTPS Listener to ALB

```bash
# Wait for certificate to be validated, then:
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$WEB_TG_ARN

# Get HTTPS listener ARN
export HTTPS_LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --query "Listeners[?Port==\`443\`].ListenerArn" --output text)

# Add rule for API subdomain
aws elbv2 create-rule \
  --listener-arn $HTTPS_LISTENER_ARN \
  --priority 10 \
  --conditions Field=host-header,Values=api.yourdomain.com \
  --actions Type=forward,TargetGroupArn=$API_TG_ARN

# Update HTTP listener to redirect to HTTPS
export HTTP_LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --query "Listeners[?Port==\`80\`].ListenerArn" --output text)

aws elbv2 modify-listener \
  --listener-arn $HTTP_LISTENER_ARN \
  --default-actions Type=redirect,RedirectConfig="{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}"
```

### 8.4 Create DNS Records

```bash
# Create A record for app.yourdomain.com pointing to ALB
cat > /tmp/dns-records.json << EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "app.yourdomain.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "$(aws elbv2 describe-load-balancers --names salon-ops-alb --query "LoadBalancers[0].CanonicalHostedZoneId" --output text)",
          "DNSName": "$ALB_DNS",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.yourdomain.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "$(aws elbv2 describe-load-balancers --names salon-ops-alb --query "LoadBalancers[0].CanonicalHostedZoneId" --output text)",
          "DNSName": "$ALB_DNS",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file:///tmp/dns-records.json
```

---

## 9. Monitoring & Logging

### 9.1 CloudWatch Dashboard

```bash
# Create CloudWatch dashboard
cat > /tmp/dashboard.json << 'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "title": "API Response Time",
        "metrics": [
          ["AWS/ApplicationELB", "TargetResponseTime", "TargetGroup", "salon-ops-api-tg"]
        ],
        "period": 300
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Request Count",
        "metrics": [
          ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "salon-ops-alb"]
        ],
        "period": 300
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "ECS CPU Utilization",
        "metrics": [
          ["AWS/ECS", "CPUUtilization", "ServiceName", "salon-ops-api", "ClusterName", "salon-ops-cluster"],
          ["AWS/ECS", "CPUUtilization", "ServiceName", "salon-ops-web", "ClusterName", "salon-ops-cluster"]
        ],
        "period": 300
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "RDS Connections",
        "metrics": [
          ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", "salon-ops-db"]
        ],
        "period": 300
      }
    }
  ]
}
EOF

aws cloudwatch put-dashboard \
  --dashboard-name salon-ops-dashboard \
  --dashboard-body file:///tmp/dashboard.json
```

### 9.2 CloudWatch Alarms

```bash
# Create alarm for high CPU
aws cloudwatch put-metric-alarm \
  --alarm-name salon-ops-api-high-cpu \
  --alarm-description "API CPU utilization is high" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=salon-ops-api Name=ClusterName,Value=salon-ops-cluster \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:$AWS_REGION:$AWS_ACCOUNT_ID:salon-ops-alerts

# Create alarm for 5xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name salon-ops-5xx-errors \
  --alarm-description "High 5xx error rate" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=LoadBalancer,Value=app/salon-ops-alb/$(aws elbv2 describe-load-balancers --names salon-ops-alb --query "LoadBalancers[0].LoadBalancerArn" --output text | cut -d'/' -f3-) \
  --evaluation-periods 1
```

### 9.3 View Logs

```bash
# View API logs
aws logs tail /ecs/salon-ops --filter-pattern "api" --follow

# View error logs
aws logs filter-log-events \
  --log-group-name /ecs/salon-ops \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s000)
```

---

## 10. Cost Optimization

### Estimated Monthly Costs (Pilot)

| Service           | Configuration               | Est. Cost          |
| ----------------- | --------------------------- | ------------------ |
| ECS Fargate       | 3 tasks × 0.25 vCPU × 0.5GB | ~$30               |
| RDS PostgreSQL    | db.t3.micro (free tier)     | $0-15              |
| ElastiCache Redis | cache.t3.micro              | ~$15               |
| ALB               | 1 ALB + data transfer       | ~$20               |
| S3                | <10GB storage               | ~$1                |
| Route 53          | 1 hosted zone               | $0.50              |
| CloudWatch        | Basic monitoring            | ~$5                |
| Data Transfer     | ~50GB/month                 | ~$5                |
| **Total**         |                             | **~$75-100/month** |

### Cost Saving Tips

1. **Use Free Tier**: RDS db.t3.micro is free tier eligible for 12 months
2. **Reserved Instances**: For production, consider reserved capacity (30-60% savings)
3. **Spot Instances**: For workers, use Fargate Spot (70% savings)
4. **Right-size**: Monitor and adjust task CPU/memory based on actual usage
5. **S3 Lifecycle**: Set up lifecycle rules to move old files to cheaper storage

### Enable Fargate Spot for Workers

```bash
# Update worker service to use Spot
aws ecs update-service \
  --cluster salon-ops-cluster \
  --service salon-ops-worker \
  --capacity-provider-strategy capacityProvider=FARGATE_SPOT,weight=1
```

---

## 11. Troubleshooting

### Common Issues

#### 1. ECS Task Fails to Start

```bash
# Check task stopped reason
aws ecs describe-tasks \
  --cluster salon-ops-cluster \
  --tasks $(aws ecs list-tasks --cluster salon-ops-cluster --service-name salon-ops-api --query "taskArns[0]" --output text)

# Check CloudWatch logs
aws logs tail /ecs/salon-ops --filter-pattern "api" --since 10m
```

#### 2. Database Connection Issues

```bash
# Verify security group allows connection
aws ec2 describe-security-groups --group-ids $RDS_SG_ID

# Test from a bastion or ECS task
# DATABASE_URL should be: postgresql://postgres:PASSWORD@RDS_ENDPOINT:5432/salon_ops
```

#### 3. Health Check Failures

```bash
# Check target group health
aws elbv2 describe-target-health --target-group-arn $API_TG_ARN

# Verify health check endpoint works
# The API should respond to GET /health with 200 OK
```

#### 4. SSL Certificate Not Working

```bash
# Check certificate status
aws acm describe-certificate --certificate-arn $CERT_ARN

# Ensure DNS validation records are in place
# Certificate must be in "Issued" status
```

### Useful Commands

```bash
# List all running tasks
aws ecs list-tasks --cluster salon-ops-cluster

# Force new deployment (after image update)
aws ecs update-service --cluster salon-ops-cluster --service salon-ops-api --force-new-deployment

# Scale service
aws ecs update-service --cluster salon-ops-cluster --service salon-ops-api --desired-count 2

# View service events
aws ecs describe-services --cluster salon-ops-cluster --services salon-ops-api --query "services[0].events[:5]"

# Check RDS status
aws rds describe-db-instances --db-instance-identifier salon-ops-db --query "DBInstances[0].DBInstanceStatus"

# Check Redis status
aws elasticache describe-cache-clusters --cache-cluster-id salon-ops-redis --query "CacheClusters[0].CacheClusterStatus"
```

---

## 12. Deployment Checklist

### Pre-Deployment

- [ ] AWS CLI configured with correct credentials
- [ ] Docker images build successfully locally
- [ ] Environment variables documented
- [ ] Domain name ready
- [ ] SSL certificate requested

### Infrastructure

- [ ] VPC and subnets configured
- [ ] Security groups created
- [ ] RDS PostgreSQL created and accessible
- [ ] ElastiCache Redis created
- [ ] S3 bucket created with CORS
- [ ] Secrets stored in Secrets Manager
- [ ] IAM roles created

### Application

- [ ] ECR repositories created
- [ ] Docker images pushed to ECR
- [ ] ECS cluster created
- [ ] Task definitions registered
- [ ] Database migrations run
- [ ] Seed data loaded (optional)

### Networking

- [ ] ALB created with target groups
- [ ] SSL certificate validated
- [ ] HTTPS listener configured
- [ ] DNS records created
- [ ] HTTP to HTTPS redirect enabled

### Monitoring

- [ ] CloudWatch log group created
- [ ] Dashboard configured
- [ ] Alarms set up
- [ ] SNS topic for alerts (optional)

### Post-Deployment

- [ ] Verify API health: `curl https://api.yourdomain.com/health`
- [ ] Verify web app loads: `https://app.yourdomain.com`
- [ ] Test login flow
- [ ] Test core features (appointments, billing)
- [ ] Monitor logs for errors

---

## 13. CI/CD Setup (Optional)

For automated deployments, set up GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

env:
  AWS_REGION: ap-south-1
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.ap-south-1.amazonaws.com

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push API image
        run: |
          docker build -f infrastructure/docker/api/Dockerfile -t $ECR_REGISTRY/salon-ops/api:${{ github.sha }} .
          docker push $ECR_REGISTRY/salon-ops/api:${{ github.sha }}

      - name: Build and push Web image
        run: |
          docker build -f infrastructure/docker/web/Dockerfile \
            --build-arg NEXT_PUBLIC_API_URL=${{ secrets.API_URL }} \
            --build-arg NEXT_PUBLIC_APP_URL=${{ secrets.APP_URL }} \
            -t $ECR_REGISTRY/salon-ops/web:${{ github.sha }} .
          docker push $ECR_REGISTRY/salon-ops/web:${{ github.sha }}

      - name: Update ECS services
        run: |
          aws ecs update-service --cluster salon-ops-cluster --service salon-ops-api --force-new-deployment
          aws ecs update-service --cluster salon-ops-cluster --service salon-ops-web --force-new-deployment
```

---

## Quick Reference

### Environment Variables Summary

| Variable             | Description           | Example                               |
| -------------------- | --------------------- | ------------------------------------- |
| `NODE_ENV`           | Environment           | `production`                          |
| `PORT`               | Server port           | `3000`                                |
| `DATABASE_URL`       | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL`          | Redis connection      | `redis://host:6379`                   |
| `JWT_SECRET`         | JWT signing key       | `64-char-random-string`               |
| `JWT_ACCESS_EXPIRY`  | Access token TTL      | `15m`                                 |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL     | `7d`                                  |
| `AWS_REGION`         | AWS region            | `ap-south-1`                          |
| `S3_BUCKET_NAME`     | S3 bucket             | `salon-ops-files-xxxx`                |
| `API_URL`            | API base URL          | `https://api.yourdomain.com`          |
| `APP_URL`            | Web app URL           | `https://app.yourdomain.com`          |

### Important URLs

- **AWS Console**: https://console.aws.amazon.com
- **ECS Console**: https://ap-south-1.console.aws.amazon.com/ecs
- **RDS Console**: https://ap-south-1.console.aws.amazon.com/rds
- **CloudWatch Logs**: https://ap-south-1.console.aws.amazon.com/cloudwatch/home#logsV2:log-groups

---

## Support

For issues with this deployment:

1. Check CloudWatch logs first
2. Verify security group rules
3. Ensure all environment variables are set correctly
4. Check AWS service health dashboard

**Last Updated:** February 2026
