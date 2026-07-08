import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type Section = 'ocarina' | 'kafra' | 'bee' | 'cuenta';
type Format = 'MP3' | 'MP4';
type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

type DownloadJob = {
  id: string;
  url: string;
  format: Format;
  status: JobStatus;
  fileName?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

type KafraEntry = {
  name: string;
  path: string;
  kind: 'file' | 'directory';
  sizeBytes?: number;
  modifiedAt?: string;
  isPublic?: boolean;
};

type KafraUsage = {
  usedBytes: number;
  maxBytes: number;
};

type UploadProgress = {
  fileName: string;
  loadedBytes: number;
  totalBytes: number;
  fileIndex: number;
  fileCount: number;
};

type BeeApplication = {
  id: string;
  company_name?: string;
  job_title?: string;
  source?: string;
  source_url?: string;
  location?: string;
  work_mode?: string;
  employment_type?: string;
  contract_type?: string;
  status?: string;
  stage?: string;
  published_at_text?: string;
  updated_at?: string;
  created_at?: string;
  salary?: {
    expected_amount?: number | null;
    offered_amount?: number | null;
    currency?: string;
    period?: string;
    type?: string;
    notes?: string;
  };
  technologies?: string[];
  notes?: string[];
  parse_notes?: string[];
};

const shaulaApiBase = import.meta.env.VITE_SHAULA_API_URL ?? '/shaula-api';
const ocarinaApiBase = import.meta.env.VITE_OCARINA_API_URL ?? '/ocarina-api';
const kafraApiBase = import.meta.env.VITE_KAFRA_API_URL ?? '/kafra-api';
const beeApiBase = import.meta.env.VITE_BEE_API_URL ?? '/bee-api';

function cleanBase(value: string) {
  return value.replace(/\/$/, '');
}

function joinPath(base: string, name: string) {
  const cleanBasePath = base.replace(/^\/+|\/+$/g, '');
  const cleanName = name.replace(/^\/+|\/+$/g, '');
  return [cleanBasePath, cleanName].filter(Boolean).join('/');
}

function parentPath(path: string) {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

function publicKafraUrl(path: string) {
  const publicPath = path.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return `${window.location.origin}/kafra-public/${publicPath}`;
}

function formatBytes(value = 0) {
  if (value < 1024) return `${value} B`;
  const units = ['KiB', 'MiB', 'GiB', 'TiB'];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unit]}`;
}

function formatSalary(app: BeeApplication) {
  const salary = app.salary;
  if (!salary) return 'Sueldo no informado';
  const amount = salary.offered_amount ?? salary.expected_amount;
  if (!amount) return 'Sueldo no informado';
  const label = salary.offered_amount ? 'Oferta' : 'Esperado';
  const currency = salary.currency ?? 'CLP';
  const period = salary.period ? ` ${salary.period}` : '';
  const type = salary.type ? ` ${salary.type}` : '';
  return `${label}: ${currency} ${amount.toLocaleString('es-CL')}${period}${type}`;
}

function App() {
  const [section, setSection] = useState<Section>('kafra');
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const shaulaApi = useMemo(() => cleanBase(shaulaApiBase), []);
  const ocarinaApi = useMemo(() => cleanBase(ocarinaApiBase), []);
  const kafraApi = useMemo(() => cleanBase(kafraApiBase), []);
  const beeApi = useMemo(() => cleanBase(beeApiBase), []);

  async function checkShaulaSession() {
    const response = await fetch(`${shaulaApi}/auth/me`, { credentials: 'include' });
    if (!response.ok) {
      setAuthenticated(false);
      setUsername('');
      return;
    }
    const data = await response.json();
    setAuthenticated(Boolean(data.authenticated));
    setUsername(data.username ?? 'danielulloa256@gmail.com');
  }

  async function logout() {
    await fetch(`${shaulaApi}/auth/logout`, { method: 'POST', credentials: 'include' });
    setAuthenticated(false);
    setUsername('');
  }

  useEffect(() => {
    checkShaulaSession().finally(() => setAuthChecking(false));
  }, []);

  if (authChecking) {
    return <LoadingScreen />;
  }

  if (!authenticated) {
    return <ShaulaLogin api={shaulaApi} onLoggedIn={async () => { await checkShaulaSession(); }} />;
  }

  function onUnauthorized() {
    setAuthenticated(false);
    setUsername('');
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">Jarvis</div>
        <p className="muted">Sesión Shaula activa: {username}</p>
        <button className={section === 'kafra' ? 'nav active' : 'nav'} onClick={() => setSection('kafra')}>
          <strong>Kafra Drive</strong>
          <span>Subir y administrar archivos</span>
        </button>
        <button className={section === 'ocarina' ? 'nav active' : 'nav'} onClick={() => setSection('ocarina')}>
          <strong>Ocarina · YouTube</strong>
          <span>Descargar MP4 / MP3</span>
        </button>
        <button className={section === 'bee' ? 'nav active' : 'nav'} onClick={() => setSection('bee')}>
          <strong>Bee</strong>
          <span>Ofertas y postulaciones</span>
        </button>
        <button className={section === 'cuenta' ? 'nav active' : 'nav'} onClick={() => setSection('cuenta')}>
          <strong>Cuenta Shaula</strong>
          <span>Cambiar clave</span>
        </button>
        <button className="ghost logout-button" onClick={() => void logout()}>Salir de Shaula</button>
      </aside>

      <section className="content">
        {section === 'cuenta' && <ShaulaSettings api={shaulaApi} username={username} onUnauthorized={onUnauthorized} />}
        {section === 'ocarina' && <OcarinaSection api={ocarinaApi} onUnauthorized={onUnauthorized} />}
        {section === 'kafra' && <KafraSection api={kafraApi} onUnauthorized={onUnauthorized} />}
        {section === 'bee' && <BeeSection api={beeApi} onUnauthorized={onUnauthorized} />}
      </section>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="auth-screen">
      <section className="card auth-card">
        <p className="eyebrow">Shaula</p>
        <h1>Verificando sesión...</h1>
      </section>
    </main>
  );
}

function ShaulaLogin({ api, onLoggedIn }: { api: string; onLoggedIn: () => Promise<void> }) {
  const [username, setUsername] = useState('danielulloa256@gmail.com');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('Entrando con Shaula...');
    try {
      const response = await fetch(`${api}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Login Shaula falló');
      }
      setPassword('');
      setMessage('Login correcto.');
      await onLoggedIn();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error login Shaula');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <form className="card auth-card" onSubmit={login}>
        <p className="eyebrow">shaula-sprintboot</p>
        <h1>Login universal</h1>
        <p className="muted">Entra una vez. Luego puedes abrir Jarvis, Kafra Drive y Ocarina.</p>
        <label>
          Usuario
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
        </label>
        <label>
          Clave
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
        </label>
        <button disabled={busy}>{busy ? 'Entrando...' : 'Entrar a Jarvis'}</button>
        {message && <p className="message">{message}</p>}
      </form>
    </main>
  );
}

function ShaulaSettings({ api, username, onUnauthorized }: { api: string; username: string; onUnauthorized: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setMessage('Las claves no coinciden.');
      return;
    }

    setBusy(true);
    setMessage('Cambiando clave...');
    try {
      const response = await fetch(`${api}/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmPassword }),
      });
      if (response.status === 401) {
        onUnauthorized();
        throw new Error('Sesión Shaula expirada');
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'No pude cambiar la clave');
      }
      setPassword('');
      setConfirmPassword('');
      setMessage('Clave Shaula cambiada.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error cambiando clave');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="hero">
        <p className="eyebrow">Cuenta Shaula</p>
        <h1>Seguridad de Jarvis</h1>
        <p>Usuario activo: <strong>{username}</strong>. Cambia tu clave escribiéndola dos veces.</p>
      </header>

      <form className="card password-form" onSubmit={changePassword}>
        <label>
          Nueva clave
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" minLength={8} required />
        </label>
        <label>
          Repetir nueva clave
          <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" minLength={8} required />
        </label>
        <button disabled={busy}>{busy ? 'Guardando...' : 'Cambiar clave'}</button>
        {message && <p className="message">{message}</p>}
      </form>
    </>
  );
}

function OcarinaSection({ api, onUnauthorized }: { api: string; onUnauthorized: () => void }) {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<Format>('MP4');
  const [saveToKafra, setSaveToKafra] = useState(false);
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function apiFetch(path: string, init?: RequestInit) {
    const response = await fetch(`${api}${path}`, { credentials: 'include', ...init });
    if (response.status === 401) {
      onUnauthorized();
      throw new Error('Sesión Shaula expirada');
    }
    return response;
  }

  async function loadJobs() {
    const response = await apiFetch('/api/downloads');
    if (!response.ok) throw new Error('No pude cargar jobs');
    setJobs(await response.json());
  }

  async function submitDownload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('Enviando a Kafka...');
    try {
      const response = await apiFetch('/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, format, save_to_kafra: saveToKafra }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error creando descarga');
      }
      setUrl('');
      setMessage('Job creado. El worker lo procesará.');
      await loadJobs();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs().catch((error) => setMessage(error.message));
    const timer = window.setInterval(() => {
      loadJobs().catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <header className="hero">
        <p className="eyebrow">Ocarina</p>
        <h1>Ocarina downloader</h1>
        <p>Descarga MP4/MP3 usando <strong>ocarina-sprintboot</strong>. Protegido por Shaula.</p>
      </header>

      <form className="card form" onSubmit={submitDownload}>
        <label>
          Link de YouTube
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." required />
        </label>

        <label>
          Formato
          <select value={format} onChange={(event) => setFormat(event.target.value as Format)}>
            <option value="MP4">MP4 video</option>
            <option value="MP3">MP3 audio</option>
          </select>
        </label>

        <label className="checkbox-label">
          <input type="checkbox" checked={saveToKafra} onChange={(event) => setSaveToKafra(event.target.checked)} />
          Guardar en Kafra Drive
        </label>

        <button disabled={loading}>{loading ? 'Enviando...' : 'Descargar'}</button>
        {message && <p className="message">{message}</p>}
      </form>

      <section className="card">
        <div className="card-title">
          <h2>Jobs</h2>
          <button className="ghost" onClick={() => loadJobs().catch((error) => setMessage(error.message))}>Refrescar</button>
        </div>

        <div className="jobs">
          {jobs.length === 0 && <p className="muted">Sin jobs todavía.</p>}
          {jobs.map((job) => (
            <article className="job" key={job.id}>
              <div>
                <span className={`pill ${job.status.toLowerCase()}`}>{job.status}</span>
                <span className="pill">{job.format}</span>
              </div>
              <p className="job-url">{job.url}</p>
              {job.error && <p className="error">{job.error}</p>}
              {job.status === 'COMPLETED' && (
                <a className="download" href={`${api}/api/downloads/${job.id}/file`}>Bajar archivo</a>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function BeeSection({ api, onUnauthorized }: { api: string; onUnauthorized: () => void }) {
  const [applications, setApplications] = useState<BeeApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function apiFetch(path: string, init?: RequestInit) {
    const response = await fetch(`${api}${path}`, { credentials: 'include', ...init });
    if (response.status === 401) {
      onUnauthorized();
      throw new Error('Sesión Shaula expirada');
    }
    return response;
  }

  async function loadApplications() {
    setLoading(true);
    try {
      const response = await apiFetch('/api/applications');
      if (!response.ok) throw new Error('No pude cargar Bee');
      const data = await response.json() as { applications: BeeApplication[] };
      setApplications(data.applications ?? []);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error cargando Bee');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApplications();
  }, []);

  return (
    <>
      <header className="hero bee-hero">
        <p className="eyebrow">Bee</p>
        <h1>Ofertas y postulaciones</h1>
        <p>Panel de seguimiento laboral. Lee las ofertas guardadas por Bee desde su propio túnel <strong>/bee-api</strong> en Shaula.</p>
      </header>

      <section className="card">
        <div className="card-title">
          <div>
            <h2>Postulaciones</h2>
            <p className="muted">{applications.length} oferta(s) guardadas.</p>
          </div>
          <button className="ghost" disabled={loading} onClick={() => void loadApplications()}>{loading ? 'Cargando...' : 'Refrescar'}</button>
        </div>
        {message && <p className="message">{message}</p>}

        <div className="bee-list">
          {applications.length === 0 && !loading && <p className="muted">Sin ofertas todavía.</p>}
          {applications.map((app) => (
            <article className="bee-card" key={app.id}>
              <div className="bee-card-header">
                <div>
                  <p className="eyebrow">{app.source || 'Fuente no informada'}</p>
                  <h3>{app.company_name || 'Empresa sin nombre'}</h3>
                  <p className="bee-title">{app.job_title || 'Cargo sin título'}</p>
                </div>
                <span className="pill completed">{app.status || 'guardada'}</span>
              </div>

              <div className="bee-meta">
                {app.stage && <span>{app.stage}</span>}
                {app.location && <span>{app.location}</span>}
                {app.work_mode && <span>{app.work_mode}</span>}
                {app.employment_type && <span>{app.employment_type}</span>}
                {app.published_at_text && <span>{app.published_at_text}</span>}
              </div>

              <p className="message">{formatSalary(app)}</p>

              {app.technologies && app.technologies.length > 0 && (
                <div className="tag-row">
                  {app.technologies.slice(0, 10).map((tech) => <span className="pill" key={tech}>{tech}</span>)}
                </div>
              )}

              {app.notes && app.notes.length > 0 && (
                <ul className="bee-notes">
                  {app.notes.slice(0, 3).map((note) => <li key={note}>{note}</li>)}
                </ul>
              )}

              {app.source_url && <a className="button secondary" href={app.source_url} target="_blank" rel="noreferrer">Abrir oferta</a>}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function KafraSection({ api, onUnauthorized }: { api: string; onUnauthorized: () => void }) {
  const [currentPath, setCurrentPath] = useState('');
  const [entries, setEntries] = useState<KafraEntry[]>([]);
  const [usage, setUsage] = useState<KafraUsage>({ usedBytes: 0, maxBytes: 1 });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  async function apiFetch(path: string, init?: RequestInit) {
    const response = await fetch(`${api}${path}`, { credentials: 'include', ...init });
    if (response.status === 401) {
      onUnauthorized();
      throw new Error('Sesión Shaula expirada');
    }
    return response;
  }

  async function refresh(path = currentPath) {
    const [listResponse, usageResponse] = await Promise.all([
      apiFetch(`/storage/list?path=${encodeURIComponent(path)}`),
      apiFetch('/storage/usage'),
    ]);

    if (!listResponse.ok) throw new Error('No pude listar Kafra');
    if (!usageResponse.ok) throw new Error('No pude leer uso de Kafra');

    const listBody = await listResponse.json() as { entries: KafraEntry[] };
    setEntries(listBody.entries);
    setUsage(await usageResponse.json());
  }

  function uploadOneFile(file: File, targetPath: string, completedBytes: number, totalBytes: number, fileIndex: number, fileCount: number) {
    return new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('PUT', `${api}/storage/upload?path=${encodeURIComponent(targetPath)}`);
      request.withCredentials = true;

      request.upload.onprogress = (event) => {
        const currentLoaded = event.lengthComputable ? event.loaded : Math.min(file.size, event.loaded);
        setUploadProgress({
          fileName: targetPath,
          loadedBytes: Math.min(totalBytes, completedBytes + currentLoaded),
          totalBytes,
          fileIndex,
          fileCount,
        });
      };

      request.onload = () => {
        if (request.status === 401) {
          onUnauthorized();
          reject(new Error('Sesión Shaula expirada'));
          return;
        }

        if (request.status < 200 || request.status >= 300) {
          let data: { error?: string } = {};
          try {
            data = request.responseText ? JSON.parse(request.responseText) as { error?: string } : {};
          } catch {
            data = {};
          }
          reject(new Error(data.error ?? `Error subiendo ${targetPath}`));
          return;
        }

        resolve();
      };

      request.onerror = () => reject(new Error(`Conexión perdida subiendo ${targetPath}`));
      request.send(file);
    });
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    const totalBytes = list.reduce((sum, file) => sum + file.size, 0);
    let completedBytes = 0;
    setBusy(true);
    setUploadProgress({ fileName: list[0].webkitRelativePath || list[0].name, loadedBytes: 0, totalBytes, fileIndex: 1, fileCount: list.length });

    try {
      for (const [index, file] of list.entries()) {
        const targetPath = joinPath(currentPath, file.webkitRelativePath || file.name);
        setMessage(`Subiendo ${targetPath}...`);
        setUploadProgress({ fileName: targetPath, loadedBytes: completedBytes, totalBytes, fileIndex: index + 1, fileCount: list.length });
        await uploadOneFile(file, targetPath, completedBytes, totalBytes, index + 1, list.length);
        completedBytes += file.size;
        setUploadProgress({ fileName: targetPath, loadedBytes: completedBytes, totalBytes, fileIndex: index + 1, fileCount: list.length });
      }
      setMessage(`Subidos ${list.length} archivo(s).`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error subiendo');
    } finally {
      setBusy(false);
    }
  }

  async function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    await uploadFiles(event.dataTransfer.files);
  }

  function stopDrag(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  async function removeEntry(entry: KafraEntry) {
    if (!confirm(`¿Eliminar ${entry.path}?`)) return;
    setBusy(true);
    try {
      const response = await apiFetch(`/storage?path=${encodeURIComponent(entry.path)}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'No pude eliminar');
      }
      setMessage(`Eliminado: ${entry.path}`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error eliminando');
    } finally {
      setBusy(false);
    }
  }

  async function setPublicEntry(entry: KafraEntry, isPublic: boolean) {
    setBusy(true);
    try {
      const response = await apiFetch(`/storage/public?path=${encodeURIComponent(entry.path)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string; publicPath?: string };
      if (!response.ok) throw new Error(data.error ?? 'No pude cambiar visibilidad');

      const link = `${window.location.origin}${data.publicPath ?? `/kafra-public/${entry.path}`}`;
      if (isPublic) await navigator.clipboard?.writeText(link).catch(() => undefined);
      setMessage(isPublic ? `Carpeta pública. Link copiado: ${link}` : `Carpeta privada: ${entry.path}`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error cambiando visibilidad');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh(currentPath).catch((error) => setMessage(error.message));
  }, [currentPath]);

  const usedPercent = Math.min(100, usage.usedBytes / usage.maxBytes * 100);

  return (
    <>
      <header className="hero drive-hero">
        <p className="eyebrow">Kafra Drive</p>
        <h1>Tu nube de archivos</h1>
        <p>Tipo Google Drive: sube archivos o carpetas, navega, descarga y elimina. Sin login Kafra separado: todo usa <strong>shaula-sprintboot</strong>.</p>
      </header>

      <section className="card upload-card">
        <div className="card-title">
          <div>
            <h2>Subir a Kafra</h2>
            <p className="muted">Ruta actual: /{currentPath || '.'}</p>
          </div>
        </div>

        <section
          className={`drop-zone ${isDragging ? 'is-dragging' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={stopDrag}
          onDrop={(event) => { void handleDrop(event); }}
        >
          <div>
            <strong>Suelta archivos aquí</strong>
            <p className="muted">O usa los botones para elegir archivos o una carpeta completa.</p>
          </div>
        </section>

        <div className="control-row">
          <label className="button" htmlFor="kafraFilePicker">Subir archivos</label>
          <input id="kafraFilePicker" type="file" multiple hidden onChange={(event) => {
            void uploadFiles(event.target.files ?? []).finally(() => { event.currentTarget.value = ''; });
          }} />

          <label className="button secondary" htmlFor="kafraFolderPicker">Subir carpeta</label>
          <input id="kafraFolderPicker" type="file" multiple hidden ref={(input) => input?.setAttribute('webkitdirectory', '')} onChange={(event) => {
            void uploadFiles(event.target.files ?? []).finally(() => { event.currentTarget.value = ''; });
          }} />

          <button className="ghost" disabled={busy} onClick={() => refresh().catch((error) => setMessage(error.message))}>Refrescar</button>
          <button className="ghost" disabled={!currentPath} onClick={() => setCurrentPath(parentPath(currentPath))}>Carpeta superior</button>
        </div>

        {uploadProgress && (
          <div className="upload-progress">
            <div className="progress-title">
              <strong>Subida {uploadProgress.fileIndex}/{uploadProgress.fileCount}</strong>
              <span>{Math.round(uploadProgress.loadedBytes / Math.max(uploadProgress.totalBytes, 1) * 100)}%</span>
            </div>
            <p className="muted">{uploadProgress.fileName}</p>
            <div className="bar"><span style={{ width: `${Math.min(100, uploadProgress.loadedBytes / Math.max(uploadProgress.totalBytes, 1) * 100)}%` }} /></div>
            <p className="muted">Subido {formatBytes(uploadProgress.loadedBytes)} de {formatBytes(uploadProgress.totalBytes)} · Falta {formatBytes(Math.max(0, uploadProgress.totalBytes - uploadProgress.loadedBytes))}</p>
          </div>
        )}

        <div className="usage-line">
          <span>{formatBytes(usage.usedBytes)} de {formatBytes(usage.maxBytes)}</span>
          <div className="bar"><span style={{ width: `${usedPercent}%` }} /></div>
        </div>
        {message && <p className="message">{message}</p>}
      </section>

      <section className="card">
        <div className="card-title">
          <h2>Mis archivos</h2>
          <span className="muted">{entries.length} items</span>
        </div>
        <div className="file-list">
          {entries.length === 0 && <p className="muted">Carpeta vacía.</p>}
          {entries.map((entry) => (
            <article className="file-row" key={entry.path}>
              <div>
                <strong>{entry.name}</strong>
                <p className="muted">
                  {entry.kind === 'directory' ? `carpeta${entry.isPublic ? ' · pública' : ''}` : formatBytes(entry.sizeBytes)}
                </p>
              </div>
              <div className="file-actions">
                {entry.kind === 'directory' && <button onClick={() => setCurrentPath(entry.path)}>Abrir</button>}
                {entry.kind === 'directory' && <button className="secondary" disabled={busy} onClick={() => void setPublicEntry(entry, !entry.isPublic)}>{entry.isPublic ? 'Quitar público' : 'Hacer público'}</button>}
                {entry.kind === 'directory' && entry.isPublic && <a className="button secondary" href={publicKafraUrl(entry.path)} target="_blank" rel="noreferrer">Ver público</a>}
                <a className="button secondary" href={`${api}/storage/download?path=${encodeURIComponent(entry.path)}`}>Descargar</a>
                <button className="danger" onClick={() => void removeEntry(entry)}>Eliminar</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
