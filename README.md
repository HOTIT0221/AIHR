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
- Filter chips by state, search, and sortable columns (Name, DA date, HS date, State)
- Change a state from the table by clicking its pill
- One-click copy for contact, AnyDesk ID and password; passwords are masked until you reveal them
- Date pickers with **Today** and **Clear** shortcuts. Future dates show as *scheduled*, past ones as "x days ago"
- Undo after deleting, dark and light themes, CSV export, JSON backup and restore
- Shortcuts: `Ctrl+N` new, `Ctrl+F` search, `Ctrl+S` save in the form, `Esc` close, double-click a row to edit

## Data

Data is saved automatically to `%APPDATA%\AITrain HR Manager\collaborators.json`.
AnyDesk passwords are stored there as plain text, so keep the file private and use **Backup** regularly.

To change the list of states, edit the `STATES` array at the top of `renderer/app.js`.
