# Spec: Google Drive Incremental Sync

Alternative persistent save method that uploads audio chapters to Google Drive as they are synthesized.

## Goals
- Provide an alternative to local ZIP downloads.
- Enable resilient, "sync-as-you-go" uploads to prevent data loss.
- Organize audio in a "Folder per Book" structure.

## Architecture

### 1. Data Flow
1. **Initiation**: User enables "Sync to Drive" and starts synthesis.
2. **Folder Creation (Pre-emptive)**: App calls `/api/drive/init` to create/verify the book's destination folder.
3. **Incremental Upload**: As each chapter finishes TTS, `useSynthesis` sends the buffer to `/api/drive/upload`.
4. **UI Feedback**: Each chapter displays its sync status (`pending`, `syncing`, `synced`, or `failed`).

### 2. API Components

#### `POST /api/drive/init`
- **Input**: `{ title: string }`
- **Action**: 
    - Ensure a top-level "Narrify" folder exists.
    - Create a sub-folder for the specific book.
- **Output**: `{ folderId: string }`

#### `POST /api/drive/upload`
- **Input**: `Multipart form-data` (buffer, fileName, folderId)
- **Action**: Uploads the buffer to the specified folder in Google Drive.
- **Output**: `{ fileId: string }`

### 3. State Management (`useSynthesis.ts`)
- `isDriveEnabled`: Boolean toggle.
- `driveFolderId`: ID of the current book's folder.
- `chapterSyncStatus`: Record mapping chapter IDs to `syncing | synced | failed`.

### 4. UI Changes
- **Controls**: "Sync to Google Drive" toggle in `NarrationControls`.
- **Progress**: Cloud icon indicators in `ChapterList` or `ChapterItem`.

## Authentication
- Use Google OAuth2.
- Environment variables required:
    - `GOOGLE_CLIENT_ID`
    - `GOOGLE_CLIENT_SECRET`
    - `GOOGLE_REFRESH_TOKEN` (for personal use/prototype) or standard OAuth flow.

## Success Criteria
- Folder created successfully before synthesis starts.
- Files appear in Drive immediately after synthesis of each chapter.
- Failure to sync a single chapter does not stop the overall synthesis process.
