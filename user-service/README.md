# User Service

## Overview

The User Service is the backbone of our distributed notification system. It manages everything related to users from authentication and profiles to notification preferences. Think of it as the central hub for user identity and settings, ensuring that every other service knows who the user is and how they want to be contacted.

## Purpose

This service provides a single source of truth for user identity and preferences. Other services rely on it to:

- Verify authentication before sending notifications
- Retrieve user contact details (name, email, phone, push tokens)
- Without it, notifications wouldn’t be personalized, secure, or reliable.

## Core Responsibilities

- User Management
  - Register users with email + password
  - Manage profiles (name, email, phone number)
  - Store push notification tokens for mobile devices

## Service APIs

The User Service exposes REST APIs for:

- Health checks (monitoring)
- Profile management (get/update)
- Push token management
- Notification preference management

## Technology Stack

- Runtime & Framework: Node.js + TypeScript + Fastify
- Database: PostgreSQL

## Integration Points

The User Service is consumed by:

- API Gateway → for validation & routes requests
- Email Service → retrieves email addresses + preferences
- Push Service → retrieves push tokens + preferences
- Template Service → selects templates based on type of notification
