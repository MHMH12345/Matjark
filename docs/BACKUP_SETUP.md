# Matjark backup setup

## How the two backup systems behave

- **Local computer backup:** writes a new JSON snapshot at the selected interval while Matjark is open. Each snapshot is retained as a separate file under `Matjark Backups/YYYY/YYYY-MM/Week-NN/YYYY-MM-DD/`. It does not need Internet access.
- **Google Drive backup:** keeps one replaceable JSON file per date under `Matjark Backups/YYYY/YYYY-MM/Week-NN/YYYY-MM-DD/`. Each scheduled update replaces that date's file content. When Drive is unreachable, the browser's IndexedDB queue keeps only the latest pending snapshot for each date and uploads it after reconnection.
- Both automated backup formats include the current application database and the audit log. Product images are intentionally excluded to keep the archives smaller.
- The local monthly retention dialog reports the previous month's JSON file count and total size. Deletion only occurs after the user explicitly chooses **Delete**.

## Local computer backup

1. Open Settings → Local backup.
2. Choose a parent folder on the computer. Matjark creates a child folder named `Matjark Backups`.
3. Keep that folder and its contents in place. Do not rename, move, or delete it.
4. Enable automatic local backup and set the interval in minutes (for example, `60` = one hour, `180` = three hours).
5. If Chrome asks for folder access again after a browser restart, return to Settings and grant permission.

The folder picker uses the File System Access API and therefore requires a supported Chromium browser (Chrome or Edge) and a secure context (HTTPS or localhost). If the browser denies or does not support persistent folder access, local automatic backup must remain disabled until the user selects the folder and grants permission again.

Local scheduling runs only while the Matjark app is open. It is not an operating-system background service. If the browser or computer closes or sleeps, missed local intervals are not recreated as fake historical snapshots; one fresh snapshot is written when the app runs again and the next check is due.

## Google Drive setup for local development

The Drive integration uses a Node/Express backend so Google refresh tokens are never stored in browser JavaScript.

1. In Google Cloud Console, create a project and enable the **Google Drive API**.
2. Configure the OAuth consent screen and add the Google account that will be used for development as a test user if the app is still in testing.
3. Create an OAuth client of type **Web application**.
4. Add this authorized redirect URI exactly:
   `http://localhost:3001/api/drive/oauth/callback`
5. Copy `.env.example` to `.env` in the project root.
6. Fill in `GOOGLE_DRIVE_CLIENT_ID` and `GOOGLE_DRIVE_CLIENT_SECRET`.
7. Keep the local development values:
   - `GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3001/api/drive/oauth/callback`
   - `MATJARK_APP_ORIGIN=https://localhost:3000`
8. Generate the token encryption key with:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   Paste the generated 64-character value into `GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY`.
9. Keep `.env` and the `.matjark-data` folder private. The encrypted refresh token is stored in `.matjark-data/google-drive-credentials.enc`. Back up that folder and the encryption key securely; losing either means Google must be linked again.
10. Run `npm install`, then `npm run dev`. This starts the Vite web app on port 3000 and the local API on port 3001.
11. In Settings, connect the Google account and enable automatic sync.

The API binds to `127.0.0.1` by default. For a production deployment, configure the host, public HTTPS origin, and authorized redirect URI to match the deployment. Do not expose the local development API port to a public network.

## Google OAuth publishing status

Google documents that refresh tokens issued to an external OAuth consent screen in **Testing** status expire after seven days when the app requests non-profile scopes such as Drive access. For ongoing unattended backup, the OAuth app must be moved to an appropriate production publishing state and any required Google verification completed. Google can also revoke refresh tokens, so the app reports a reconnection requirement instead of claiming that uploads are healthy.

## Restore behaviour

Restoring a local or Drive snapshot replaces the application's current database. The user must confirm the operation. When the backup contains an audit log, the log's SHA-256 chain is validated before it is restored. Product images are not restored by these automated snapshots.
