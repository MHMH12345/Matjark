import 'dotenv/config';
import express from 'express';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface StoredDriveCredentials {
  refreshToken: string;
  createdAt: number;
  lastUploadAt: number | null;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType?: string;
  modifiedTime?: string;
  size?: string;
  appProperties?: Record<string, string>;
}

const app = express();
const port = Number(process.env.API_PORT || 3001);
const host = process.env.API_HOST || '127.0.0.1';
const appOrigin = (process.env.MATJARK_APP_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');
const dataDirectory = path.resolve(process.env.MATJARK_DATA_DIR || '.matjark-data');
const credentialsPath = path.join(dataDirectory, 'google-drive-credentials.enc');
const tokenCookieName = 'matjark_drive_oauth_state';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
let cachedAccessToken = '';
let cachedAccessTokenExpiresAt = 0;

app.use(express.json({ limit: '100mb' }));

function getDriveConfig() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI?.trim()
    || appOrigin + '/api/drive/oauth/callback';
  const encryptionSecret = process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY?.trim();
  return {
    clientId,
    clientSecret,
    redirectUri,
    configured: Boolean(clientId && clientSecret && encryptionSecret && /^[0-9a-fA-F]{64}$/.test(encryptionSecret)),
  };
}

function getEncryptionKey(): Buffer {
  const secret = process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY?.trim() || '';
  if (!/^[0-9a-fA-F]{64}$/.test(secret)) {
    throw new Error('GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY يجب أن يكون 64 حرفًا سداسيًا عشريًا (32 بايت).');
  }
  return Buffer.from(secret, 'hex');
}

function encryptCredentials(credentials: StoredDriveCredentials): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(credentials), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join('.');
}

function decryptCredentials(payload: string): StoredDriveCredentials {
  const [ivHex, tagHex, encryptedHex] = payload.split('.');
  if (!ivHex || !tagHex || !encryptedHex) throw new Error('ملف اعتماد Google Drive تالف.');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const clear = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(clear) as StoredDriveCredentials;
}

async function readCredentials(): Promise<StoredDriveCredentials | null> {
  try {
    return decryptCredentials(await readFile(credentialsPath, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function saveCredentials(credentials: StoredDriveCredentials): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  const temporaryPath = credentialsPath + '.tmp';
  await writeFile(temporaryPath, encryptCredentials(credentials), { mode: 0o600 });
  await rename(temporaryPath, credentialsPath);
}

function requireSameOrigin(request: express.Request, response: express.Response, next: express.NextFunction): void {
  const origin = request.get('origin');
  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(appOrigin).origin;
  } catch {
    response.status(500).json({ error: 'قيمة MATJARK_APP_ORIGIN غير صالحة.' });
    return;
  }
  if (origin !== expectedOrigin) {
    response.status(403).json({ error: 'تم رفض الطلب لعدم تطابق مصدره مع التطبيق.' });
    return;
  }
  next();
}

function readCookie(request: express.Request, cookieName: string): string | undefined {
  const header = request.headers.cookie || '';
  const cookie = header.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(cookieName + '='));
  return cookie ? decodeURIComponent(cookie.slice(cookieName.length + 1)) : undefined;
}

function quoteDriveQuery(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function exchangeAuthorizationCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const config = getDriveConfig();
  if (!config.clientId || !config.clientSecret) throw new Error('بيانات Google OAuth غير مكتملة.');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const result = await response.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };
  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || result.error || 'تعذر إكمال اتصال Google.');
  }
  return result as { access_token: string; refresh_token?: string; expires_in?: number };
}

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt - 60_000) return cachedAccessToken;
  const config = getDriveConfig();
  if (!config.clientId || !config.clientSecret) throw new Error('إعدادات Google Drive على الخادم غير مكتملة.');
  const credentials = await readCredentials();
  if (!credentials?.refreshToken) throw new Error('حساب Google Drive غير متصل. أعد ربط الحساب من الإعدادات.');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const result = await response.json() as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };
  if (!response.ok || !result.access_token) {
    cachedAccessToken = '';
    cachedAccessTokenExpiresAt = 0;
    throw new Error(result.error_description || result.error || 'انتهت صلاحية اتصال Google. أعد ربط الحساب.');
  }
  cachedAccessToken = result.access_token;
  cachedAccessTokenExpiresAt = Date.now() + (Number(result.expires_in || 3600) * 1000);
  return cachedAccessToken;
}

async function driveRequest<T>(
  token: string,
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: 'Bearer ' + token,
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    let message = text;
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } };
      message = parsed.error?.message || text;
    } catch {
      // Keep the original response text for diagnostics.
    }
    throw new Error('Google Drive API: ' + (message || response.statusText));
  }
  return (text ? JSON.parse(text) : {}) as T;
}

async function listDriveFiles(token: string, query: string): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: query,
      pageSize: '1000',
      fields: 'files(id,name,mimeType,modifiedTime,size,appProperties),nextPageToken',
      spaces: 'drive',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const result = await driveRequest<{ files?: DriveFile[]; nextPageToken?: string }>(
      token,
      DRIVE_API + '/files?' + params.toString()
    );
    files.push(...(result.files || []));
    pageToken = result.nextPageToken;
  } while (pageToken);
  return files;
}

async function getOrCreateFolder(
  token: string,
  name: string,
  parentId?: string
): Promise<string> {
  const parentClause = parentId ? " and '" + quoteDriveQuery(parentId) + "' in parents" : '';
  const query = "mimeType = '" + FOLDER_MIME + "' and name = '" + quoteDriveQuery(name)
    + "' and trashed = false" + parentClause;
  const existing = await listDriveFiles(token, query);
  if (existing[0]?.id) return existing[0].id;

  const metadata: Record<string, unknown> = { name, mimeType: FOLDER_MIME };
  if (parentId) metadata.parents = [parentId];
  const created = await driveRequest<{ id: string }>(
    token,
    DRIVE_API + '/files?fields=id',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
    }
  );
  return created.id;
}

function getWeekOfMonth(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  const firstDayOffset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  return Math.floor((day + firstDayOffset - 1) / 7) + 1;
}

async function getDailyFolder(token: string, dateKey: string): Promise<string> {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('تاريخ النسخة الاحتياطية غير صالح.');
  const [, year, month] = match;
  const root = await getOrCreateFolder(token, 'Matjark Backups');
  const yearFolder = await getOrCreateFolder(token, year, root);
  const monthFolder = await getOrCreateFolder(token, year + '-' + month, yearFolder);
  const weekFolder = await getOrCreateFolder(
    token,
    'Week-' + String(getWeekOfMonth(dateKey)).padStart(2, '0'),
    monthFolder
  );
  return getOrCreateFolder(token, dateKey, weekFolder);
}

async function findDailyBackup(
  token: string,
  parentId: string,
  name: string
): Promise<DriveFile | undefined> {
  const query = "'" + quoteDriveQuery(parentId) + "' in parents and name = '"
    + quoteDriveQuery(name) + "' and trashed = false";
  return (await listDriveFiles(token, query))[0];
}

async function uploadDailyBackup(envelope: unknown): Promise<{
  fileId: string;
  modifiedTime: string;
}> {
  const candidate = envelope as {
    format?: string;
    formatVersion?: number;
    dateKey?: string;
    database?: { products?: unknown[] };
    auditEntries?: unknown[];
  };
  if (
    candidate?.format !== 'matjark-backup'
    || candidate.formatVersion !== 1
    || !candidate.dateKey
    || !Array.isArray(candidate.database?.products)
    || !Array.isArray(candidate.auditEntries)
  ) {
    throw new Error('صيغة النسخة الاحتياطية المرسلة غير صالحة.');
  }

  const token = await getAccessToken();
  const dayFolder = await getDailyFolder(token, candidate.dateKey);
  const fileName = 'matjark-backup_' + candidate.dateKey + '.json';
  const payload = JSON.stringify(envelope);
  const existing = await findDailyBackup(token, dayFolder, fileName);
  let result: DriveFile;

  if (existing?.id) {
    result = await driveRequest<DriveFile>(
      token,
      DRIVE_UPLOAD_API + '/files/' + encodeURIComponent(existing.id)
        + '?uploadType=media&fields=id,name,modifiedTime,size',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: payload,
      }
    );
  } else {
    const boundary = 'matjark_' + randomBytes(12).toString('hex');
    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: [dayFolder],
      appProperties: { matjarkBackup: 'daily', dateKey: candidate.dateKey },
    };
    const body = [
      '--' + boundary,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      '--' + boundary,
      'Content-Type: application/json; charset=UTF-8',
      '',
      payload,
      '--' + boundary + '--',
      '',
    ].join('\r\n');
    result = await driveRequest<DriveFile>(
      token,
      DRIVE_UPLOAD_API + '/files?uploadType=multipart&fields=id,name,modifiedTime,size',
      {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
        body,
      }
    );
  }

  const credentials = await readCredentials();
  if (credentials) await saveCredentials({ ...credentials, lastUploadAt: Date.now() });
  return {
    fileId: result.id || existing?.id || '',
    modifiedTime: result.modifiedTime || new Date().toISOString(),
  };
}

async function listDailyBackups(): Promise<Array<{
  id: string;
  name: string;
  dateKey: string;
  modifiedTime: string;
  size: number;
}>> {
  const token = await getAccessToken();
  const query = "appProperties has { key='matjarkBackup' and value='daily' } and trashed = false";
  const files = await listDriveFiles(token, query);
  return files
    .map((file) => {
      const dateKey = file.appProperties?.dateKey
        || file.name.match(/^matjark-backup_(\d{4}-\d{2}-\d{2})\.json$/)?.[1]
        || '';
      return {
        id: file.id,
        name: file.name,
        dateKey,
        modifiedTime: file.modifiedTime || '',
        size: Number(file.size || 0),
      };
    })
    .filter((file) => Boolean(file.dateKey))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

async function downloadDailyBackup(fileId: string): Promise<unknown> {
  if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) throw new Error('معرّف النسخة غير صالح.');
  const token = await getAccessToken();
  const response = await fetch(
    DRIVE_API + '/files/' + encodeURIComponent(fileId) + '?alt=media',
    { headers: { Authorization: 'Bearer ' + token } }
  );
  if (!response.ok) throw new Error('تعذر تنزيل النسخة من Google Drive.');
  return response.json();
}

function isConfigured(): boolean {
  return getDriveConfig().configured;
}

app.get('/api/drive/status', async (_request, response) => {
  try {
    if (!isConfigured()) {
      response.json({
        configured: false,
        connected: false,
        lastUploadAt: null,
        message: 'يلزم إعداد بيانات Google Cloud على الخادم أولًا.',
      });
      return;
    }
    const credentials = await readCredentials();
    response.json({
      configured: true,
      connected: Boolean(credentials?.refreshToken),
      lastUploadAt: credentials?.lastUploadAt ?? null,
    });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : 'تعذر قراءة حالة Google Drive.' });
  }
});

app.get('/api/drive/connect', (_request, response) => {
  const config = getDriveConfig();
  if (!config.configured || !config.clientId || !config.redirectUri) {
    response.status(503).send('إعداد Google Drive غير مكتمل على الخادم. راجع ملف .env.example.');
    return;
  }

  const state = randomBytes(24).toString('hex');
  response.cookie(tokenCookieName, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.redirectUri.startsWith('https://'),
    maxAge: 10 * 60 * 1000,
    path: '/api/drive/oauth',
  });
  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizationUrl.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  }).toString();
  response.redirect(authorizationUrl.toString());
});

app.get('/api/drive/oauth/callback', async (request, response) => {
  const config = getDriveConfig();
  const expectedState = readCookie(request, tokenCookieName);
  const returnedState = typeof request.query.state === 'string' ? request.query.state : '';
  response.clearCookie(tokenCookieName, { path: '/api/drive/oauth' });

  if (!expectedState || !returnedState || expectedState !== returnedState) {
    response.status(400).send('تعذر التحقق من طلب ربط Google. ارجع إلى متجرك وحاول مرة أخرى.');
    return;
  }
  if (typeof request.query.error === 'string') {
    response.redirect(appOrigin + '/?drive=cancelled');
    return;
  }
  if (typeof request.query.code !== 'string' || !config.configured) {
    response.redirect(appOrigin + '/?drive=not-configured');
    return;
  }

  try {
    const tokenResponse = await exchangeAuthorizationCode(request.query.code);
    const existing = await readCredentials();
    const refreshToken = tokenResponse.refresh_token || existing?.refreshToken;
    if (!refreshToken) {
      throw new Error('لم تُصدر Google رمز تجديد. افصل التطبيق من حساب Google ثم أعد الربط.');
    }
    await saveCredentials({
      refreshToken,
      createdAt: existing?.createdAt ?? Date.now(),
      lastUploadAt: existing?.lastUploadAt ?? null,
    });
    response.redirect(appOrigin + '/?drive=connected');
  } catch (error) {
    console.error('Matjark Google Drive OAuth callback failed:', error);
    response.redirect(appOrigin + '/?drive=error');
  }
});

app.post('/api/drive/disconnect', requireSameOrigin, async (_request, response) => {
  try {
    const credentials = await readCredentials();
    if (credentials?.refreshToken) {
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: credentials.refreshToken }),
      }).catch(() => undefined);
    }
    await unlink(credentialsPath).catch(() => undefined);
    cachedAccessToken = '';
    cachedAccessTokenExpiresAt = 0;
    response.json({ disconnected: true });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : 'تعذر فصل حساب Google.' });
  }
});

app.get('/api/drive/backups', async (_request, response) => {
  try {
    if (!isConfigured()) {
      response.status(503).json({ error: 'إعداد Google Drive غير مكتمل على الخادم.' });
      return;
    }
    response.json({ files: await listDailyBackups() });
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : 'تعذر قراءة النسخ السحابية.' });
  }
});

app.post('/api/drive/backups', requireSameOrigin, async (request, response) => {
  try {
    if (!isConfigured()) {
      response.status(503).json({ error: 'إعداد Google Drive غير مكتمل على الخادم.' });
      return;
    }
    const result = await uploadDailyBackup(request.body?.envelope);
    response.json(result);
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : 'فشل رفع النسخة إلى Google Drive.' });
  }
});

app.get('/api/drive/backups/:fileId', async (request, response) => {
  try {
    if (!isConfigured()) {
      response.status(503).json({ error: 'إعداد Google Drive غير مكتمل على الخادم.' });
      return;
    }
    response.json(await downloadDailyBackup(request.params.fileId));
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : 'تعذر استعادة النسخة من Google Drive.' });
  }
});

if (process.env.NODE_ENV === 'production') {
  const distDirectory = path.resolve('dist');
  app.use(express.static(distDirectory));
  app.get('*', (_request, response) => {
    response.sendFile(path.join(distDirectory, 'index.html'));
  });
}

app.listen(port, host, () => {
  console.log('Matjark API listening on http://' + host + ':' + port);
});
