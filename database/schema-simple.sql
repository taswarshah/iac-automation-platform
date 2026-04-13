-- =====================================================
-- IaC AUTOMATION PLATFORM
-- Simple Azure SQL Schema (No Foreign Keys)
-- =====================================================

CREATE TABLE organizations (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    slug NVARCHAR(100) UNIQUE NOT NULL,
    tier NVARCHAR(50) NOT NULL DEFAULT 'free',
    settings NVARCHAR(MAX) DEFAULT '{}',
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) UNIQUE NOT NULL,
    username NVARCHAR(100) UNIQUE NOT NULL,
    full_name NVARCHAR(255),
    password_hash NVARCHAR(255),
    auth_provider NVARCHAR(50) DEFAULT 'local',
    settings NVARCHAR(MAX) DEFAULT '{}',
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE organization_members (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    role NVARCHAR(50) NOT NULL DEFAULT 'member',
    created_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE templates (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER,
    name NVARCHAR(255) NOT NULL,
    slug NVARCHAR(255),
    description NVARCHAR(MAX),
    category NVARCHAR(100),
    provider NVARCHAR(50),
    version NVARCHAR(50) DEFAULT '1.0.0',
    is_public BIT DEFAULT 0,
    resources NVARCHAR(MAX) DEFAULT '[]',
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE visual_designs (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    ia_type NVARCHAR(50) NOT NULL,
    version INT DEFAULT 1,
    canvas_state NVARCHAR(MAX) DEFAULT '{}',
    resources NVARCHAR(MAX) DEFAULT '[]',
    created_by UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE cloud_credentials (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(255) NOT NULL,
    provider NVARCHAR(50) NOT NULL,
    credentials_encrypted NVARCHAR(MAX) NOT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE policies (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    policy_type NVARCHAR(50) NOT NULL,
    severity NVARCHAR(50) NOT NULL,
    provider NVARCHAR(50),
    enabled BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE deployments (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(255) NOT NULL,
    status NVARCHAR(50) DEFAULT 'pending',
    created_at DATETIME2 DEFAULT GETDATE()
);

PRINT 'Simple database schema created successfully!';