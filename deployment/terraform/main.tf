terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

variable "location" {
  default = "East US"
}

variable "resource_group_name" {
  default = "iac-platform-dev-rg"
}

variable "db_server" {
  type    = string
  default = "iac-dev.database.windows.net"
}

variable "db_name" {
  type    = string
  default = "iac"
}

variable "db_user" {
  type      = string
  default   = "iac"
  sensitive = true
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_port" {
  type    = string
  default = "1433"
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

# Resource Group
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

# Azure Container Registry
resource "azurerm_container_registry" "acr" {
  name                = "iacplatformacrdev"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic"
  admin_enabled       = true
}

# Log Analytics Workspace for Container Apps
resource "azurerm_log_analytics_workspace" "law" {
  name                = "iac-platform-law"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# Container Apps Environment
resource "azurerm_container_app_environment" "env" {
  name                       = "iac-platform-env"
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.law.id
}

# Define each service and its port
locals {
  services = {
    "api-gateway"          = 3000
    "auth-service"         = 3001
    "project-service"      = 3002
    "template-service"     = 3003
    "code-gen-service"     = 3004
    "policy-service"       = 3005
    "deployment-service"   = 3006
    "drift-service"        = 3007
    "notification-service" = 3008
  }
}

# Create Container App for each service
resource "azurerm_container_app" "services" {
  for_each = local.services

  name                         = "iac-${each.key}"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  template {
    container {
      name   = each.key
      image  = "${azurerm_container_registry.acr.login_server}/iac-${each.key}:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "PORT"
        value = tostring(each.value)
      }
      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-secret"
      }
      env {
        name  = "CORS_ORIGIN"
        value = "*"
      }
      env {
        name  = "DB_SERVER"
        value = var.db_server
      }
      env {
        name  = "DB_NAME"
        value = var.db_name
      }
      env {
        name        = "DB_USER"
        secret_name = "db-user"
      }
      env {
        name        = "DB_PASSWORD"
        secret_name = "db-password"
      }
      env {
        name  = "DB_PORT"
        value = var.db_port
      }

      dynamic "env" {
        for_each = each.key == "api-gateway" ? [1] : []
        content {
          name  = "AUTH_SERVICE_URL"
          value = "https://iac-auth-service.internal.${azurerm_container_app_environment.env.default_domain}"
        }
      }
      dynamic "env" {
        for_each = each.key == "api-gateway" ? [1] : []
        content {
          name  = "PROJECT_SERVICE_URL"
          value = "https://iac-project-service.internal.${azurerm_container_app_environment.env.default_domain}"
        }
      }
      dynamic "env" {
        for_each = each.key == "api-gateway" ? [1] : []
        content {
          name  = "TEMPLATE_SERVICE_URL"
          value = "https://iac-template-service.internal.${azurerm_container_app_environment.env.default_domain}"
        }
      }
      dynamic "env" {
        for_each = each.key == "api-gateway" ? [1] : []
        content {
          name  = "CODE_GEN_SERVICE_URL"
          value = "https://iac-code-gen-service.internal.${azurerm_container_app_environment.env.default_domain}"
        }
      }
      dynamic "env" {
        for_each = each.key == "api-gateway" ? [1] : []
        content {
          name  = "POLICY_SERVICE_URL"
          value = "https://iac-policy-service.internal.${azurerm_container_app_environment.env.default_domain}"
        }
      }
      dynamic "env" {
        for_each = each.key == "api-gateway" ? [1] : []
        content {
          name  = "DEPLOYMENT_SERVICE_URL"
          value = "https://iac-deployment-service.internal.${azurerm_container_app_environment.env.default_domain}"
        }
      }
      dynamic "env" {
        for_each = each.key == "api-gateway" ? [1] : []
        content {
          name  = "DRIFT_SERVICE_URL"
          value = "https://iac-drift-service.internal.${azurerm_container_app_environment.env.default_domain}"
        }
      }
      dynamic "env" {
        for_each = each.key == "api-gateway" ? [1] : []
        content {
          name  = "NOTIFICATION_SERVICE_URL"
          value = "https://iac-notification-service.internal.${azurerm_container_app_environment.env.default_domain}"
        }
      }
    }

    min_replicas = 0
    max_replicas = 2

    http_scale_rule {
      name                = "http-rule"
      concurrent_requests = "10"
    }
  }

  ingress {
    allow_insecure_connections = false
    external_enabled           = each.key == "api-gateway" ? true : false
    target_port                = each.value
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password
  }

  secret {
    name  = "jwt-secret"
    value = var.jwt_secret
  }

  secret {
    name  = "db-user"
    value = var.db_user
  }

  secret {
    name  = "db-password"
    value = var.db_password
  }
}
