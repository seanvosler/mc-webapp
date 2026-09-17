import { Hono } from 'hono';
import { db, ensureSchema } from './lib/db.js';

ensureSchema();

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  if (!url.pathname.startsWith('/api/')) return next();

  const hono = new Hono();

  hono.get('/api/health', (c) =>
    c.json({ ok: true, ts: new Date().toISOString() })
  );

  hono.get('/api/notes', async (c) => {
    const rows = await db.execute('SELECT id, title, body, created_at, updated_at FROM notes ORDER BY id DESC');
    return c.json({ notes: rows.rows });
  });

  hono.post('/api/notes', async (c) => {
    const form = await c.req.formData();
    const title = String(form.get('title') ?? '').trim().slice(0, 200);
    const body = String(form.get('body') ?? '').slice(0, 5000);
    if (!title) return c.json({ error: 'title required' }, 400);
    const res = await db.execute({
      sql: 'INSERT INTO notes (title, body) VALUES (?, ?)',
      args: [title, body],
    });
    return c.json({ ok: true, id: Number(res.lastInsertRowid) });
  });

  hono.put('/api/notes/:id', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isFinite(id)) return c.json({ error: 'bad id' }, 400);
    const form = await c.req.formData();
    const title = String(form.get('title') ?? '').trim().slice(0, 200);
    const body = String(form.get('body') ?? '').slice(0, 5000);
    if (!title) return c.json({ error: 'title required' }, 400);
    await db.execute({
      sql: 'UPDATE notes SET title = ?, body = ?, updated_at = datetime(\'now\') WHERE id = ?',
      args: [title, body, id],
    });
    return c.json({ ok: true });
  });

  hono.delete('/api/notes/:id', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isFinite(id)) return c.json({ error: 'bad id' }, 400);
    await db.execute({ sql: 'DELETE FROM notes WHERE id = ?', args: [id] });
    return c.json({ ok: true });
  });

  hono.get('/api/files', async (c) => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const dir = (process.env.UPLOADS_DIR ?? './data/uploads');
    let names: string[] = [];
    try {
      names = await fs.readdir(dir);
      names = names.filter((n) => !n.startsWith('.'));
    } catch {
      names = [];
    }
    const items = await Promise.all(
      names.map(async (n) => {
        const full = path.join(dir, n);
        const st = await fs.stat(full);
        return { name: n, size: st.size, mtime: st.mtime.toISOString() };
      })
    );
    items.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
    return c.json({ files: items });
  });

  hono.post('/api/files', async (c) => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const crypto = await import('node:crypto');
    const dir = (process.env.UPLOADS_DIR ?? './data/uploads');
    await fs.mkdir(dir, { recursive: true });
    const form = await c.req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return c.json({ error: 'file required' }, 400);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'upload.bin';
    const stamp = crypto.randomBytes(4).toString('hex');
    const final = `${stamp}-${safe}`;
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, final), buf);
    return c.json({ ok: true, name: final, size: buf.length });
  });

  hono.get('/api/files/:name', async (c) => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const name = c.req.param('name');
    if (name.includes('/') || name.includes('\\')) return c.json({ error: 'bad name' }, 400);
    const full = path.join(process.env.UPLOADS_DIR ?? './data/uploads', name);
    try {
      const data = await fs.readFile(full);
      const ext = path.extname(name).toLowerCase();
      const type =
        ext === '.png' ? 'image/png' :
        ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
        ext === '.gif' ? 'image/gif' :
        ext === '.txt' ? 'text/plain' :
        ext === '.html' ? 'text/html' :
        'application/octet-stream';
      return c.body(data, 200, { 'Content-Type': type });
    } catch {
      return c.json({ error: 'not found' }, 404);
    }
  });

  const res = await hono.fetch(context.request);
  return res;
});

import { defineMiddleware } from 'astro:middleware';
