# Unified Storage Mobile App

A mobile application that combines multiple free cloud storage accounts into a single unified storage interface.

## Overview

This app allows users to connect multiple cloud storage providers (Google Drive, Dropbox, Backblaze B2, OneDrive, etc.) and access all their files through a single unified interface, preventing storage limitations on individual services.

## Tech Stack

- **Frontend**: React Native 0.74+ with TypeScript
- **Authentication**: Firebase Auth
- **Storage Abstraction**: Custom storage providers + react-native-cloud-storage
- **State Management**: Redux Toolkit
- **Build Tools**: Expo SDK 50+
- **Local Database**: SQLite for metadata caching

## Project Structure

```
unified-storage-app/
├── /assets/
├── /components/
├── /screens/
├── /services/
├── /store/
├── /utils/
├── /hooks/
├── /types/
├── /tests/
├── App.tsx
├── app.json
├── package.json
└── tsconfig.json
```

## Getting Started

1. Install dependencies: `npm install`
2. Start development server: `expo start`
3. Run on iOS/Android: `expo run:ios` or `expo run:android`

## Development Guidelines

- Follow the code conventions in the Living Spec
- All components must be TypeScript strict
- Write unit tests for business logic
- Handle platform differences appropriately
- Never store raw credentials locally