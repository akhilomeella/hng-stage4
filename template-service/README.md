# Template Service

## Overview

The Template Service is the content hub of the distributed notification system. It manages all notification templates email and push with built-in support for multiple languages and version control. By centralizing template storage and rendering, it ensures that every notification is consistent, personalized, and localized.

## Purpose

This service acts as a content management system or notification templates. It provides:

- A centralized repository for all templates
- Variable substitution for dynamic content
- Multi-language support for global reach

Other services query the Template Service to retrieve and render templates before sending notifications.

## Core Responsibilities

- Template Management

  - Create, read, update, and delete templates
  - Support for email and push types
  - Categorize templates for better organization

- Variable Handling

  - Auto-extraction of variables (e.g., {{user_name}})
  - Validation during rendering
  - Handlebars syntax support
  - Error reporting for missing variables

- Multi-Language Support

  - Store multiple language versions of the same template
  - Retrieve templates by language code (en, es, fr, etc.)
  - Allow same template name across different languages

- Template Rendering

  - Replace variables with actual values
  - Validate required variables
  - Render by template ID or name
  - Return subject + body for notification services

- Technology Stack
  - Runtime & Framework: Node.js + TypeScript + Fastify
  - Database: PostgreSQL
  - Caching: Redis (via ioredis)
  - Templating Engine: Handlebars (variable substitution + error handling)

## Integration Points

Consumed by:

- Email Service → retrieves + renders email templates
- Push Service → retrieves + renders push templates
- API Gateway → may fetch templates for preview/testing

## Template Rendering Flow

- Service requests template by name or ID
- Template Service retrieves from cache or database
- Service provides variable values
- Template Service validates required variables
- Template Service renders using Handlebars
- Returns rendered subject + body to requesting service

## Service Endpoints

- Health check
- Retrieval by ID or name
- Rendering with variable substitution

## Variable Substitution

- Templates use Handlebars syntax → {{variable_name}}
- Variables auto-detected when templates are created
- Rendering requires all variables; missing ones trigger errors
