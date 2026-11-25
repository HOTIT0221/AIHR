# AITrain HR Manager

A small desktop app (Electron) for tracking the collaborators you're helping with
DataAnnotation (DA) and Handshake (HS) assessments.

## Run

```
npm install
npm start
```

## Build the .exe

```
npm run dist
```

This creates a portable single-file app at `dist\AITrain-HR-Manager-1.0.0.exe` (no install needed).

## Features

- One table with everyone: name, LinkedIn, contact, DA/HS assessment dates, AnyDesk ID and password, state and notes
- Summary cards: total, DA taken, HS taken, both done, with progress bars and scheduled counts
- Separate status for each assessment (DataAnnotation and Handshake), with a filter row for each that can be combined
- Search, and sortable columns (Name, DA date, HS date)
- Change a DA or HS status right in the table by clicking its pill
- One-click copy for contact, AnyDesk ID and password; passwords are masked until you reveal them
- Date pickers with **Today** and **Clear** shortcuts. Future dates show as *scheduled*, past ones as "x days ago"
- Undo after deleting, dark and light themes, CSV export, backup and restore (`.db` or `.json`)
- Shortcuts: `Ctrl+N` new, `Ctrl+F` search, `Ctrl+S` save in the form, `Esc` close, double-click a row to edit

## Data

Data is stored in a SQLite database at `%APPDATA%\AITrain HR Manager\hrmanager.db`. It uses the SQLite engine
built into Electron (`node:sqlite`), so there are no native modules to compile. Every change is written immediately.

Table `collaborators`: `id`, `name`, `linkedin`, `contact`, `da_date`, `hs_date` (`YYYY-MM-DD` or NULL),
`da_state`, `hs_state`, `anydesk_id`, `anydesk_password`, `notes`, `created_at`, `updated_at` (ms timestamps).
Schema v2 replaced the single `state` column with `da_state` and `hs_state`. On upgrade, the old state is copied to
each assessment that has a date. An assessment without a date (when the other one has a date) starts as `new` (Not started).
The schema version is kept in `PRAGMA user_version`. Add future migrations in `db.js`.

- **Backup** saves a consistent snapshot of the database as `.db`, or as `.json` if you pick that type.
- **Restore** merges a `.db` or `.json` backup into the current data, matching people by id.
- Older versions stored data in `collaborators.json`. It is imported automatically on first launch and renamed to `collaborators.json.migrated`.

AnyDesk passwords are stored as plain text in the database, so keep the file and your backups private.

To change the status options (shared by DA and HS), edit the `STATES` array at the top of `renderer/app.js` and `STATE_KEYS` in `db.js`.
