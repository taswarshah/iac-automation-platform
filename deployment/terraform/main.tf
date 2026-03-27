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

# PostgreSQL Flexible Server (Smallest tier for dev)
resource "azurerm_postgresql_flexible_server" "db" {
  name                   = "iac-platform-db-dev"
  resource_group_name    = azurerm_resource_group.rg.name
  location               = azurerm_resource_group.rg.location
  version                = "13"
  administrator_login    = "iacadmin"
  administrator_password = "ComplexPassword123!"
  storage_mb             = 32768
  sku_name               = "B_Standard_B1ms" # Smallest available
}

# Define each service and its port
locals {
  services = {
    "api-gateway"         = 3000
    "auth-service"        = 3001
    "project-service"     = 3002
    "template-service"    = 3003
    "code-gen-service"    = 3004
    "policy-service"      = 3005
    "deployment-service"  = 3006
    "drift-service"       = 3007
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
        name  = "DATABASE_URL"
        value = "postgresql://iacadmin:ComplexPassword123!@${azurerm_postgresql_flexible_server.db.fqdn}:5432/postgres"
      }
    }

    # SCALE TO ZERO when no requests
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
}
