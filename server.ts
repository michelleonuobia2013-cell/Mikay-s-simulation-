import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';
import { createInitialPlayerState, isValidEmoteId, moderateChatMessage } from './src/game/rules';
import type { ChatMessage, OnlinePlayerPresence, PlayerSaveState } from './src/game/types';

interface AccountRecord {
  id: string;
  username: string;
  usernameLower: string;
  passwordHash: string;
  salt: string;
  recoveryHint: string;
  recoveryAnswerHash: string;
  createdAt: number;
  saveState: PlayerSaveState;
}

interface ReportRecord {
  id: string;
  reporterId: string;
  targetId: string;
  reason: string;
  createdAt: number;
}

interface DbSchema {
  accounts: Record<string, AccountRecord>;
  sessions: Record<string, string>; // token -> accountId
  reports: ReportRecord[];
  worldMessages: ChatMessage[];
}

const DATA_DIR = path.resolve(process.cwd(), '.mikay_data');
const DB_PATH = path.join(DATA_DIR, 'world_db.json');

function loadDb(): DbSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as DbSchema;
      return {
        accounts: parsed.accounts || {},
        sessions: parsed.sessions || {},
        reports: parsed.reports || [],
        worldMessages: parsed.worldMessages || [],
      };
    }
  } catch (err) {
    console.warn('[MikayServer] Initializing fresh database:', err);
  }
  return {
    accounts: {},
    sessions: {},
    reports: [],
    worldMessages: [
      {
        id: 'sys_welcome',
        channel: 'world',
        senderId: 'system',
        senderName: "Mikay's World Guide",
        senderIsNpc: true,
        text: 'Welcome to Mikay’s Simulation! Real online players appear here when connected. NPCs are always marked [NPC].',
        timestamp: Date.now(),
      },
    ],
  };
}

let db: DbSchema = loadDb();
let saveTimer: NodeJS.Timeout | null = null;

function persistDbSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    } catch (err) {
      console.error('[MikayServer] Failed to persist DB:', err);
    }
  }, 250);
}

function hashSecret(value: string, salt: string): string {
  return crypto.scryptSync(value, salt, 32).toString('hex');
}

function getAccountByToken(token: string | undefined): AccountRecord | null {
  if (!token) return null;
  const accountId = db.sessions[token];
  if (!accountId) return null;
  return db.accounts[accountId] || null;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  // Live WebSocket room tracking (only real connected sockets)
  interface ClientMeta {
    ws: WebSocket;
    sessionId: string;
    roomId: string;
    presence: OnlinePlayerPresence | null;
  }
  const clients = new Map<string, ClientMeta>();

  function broadcastToRoom(roomId: string, payload: unknown, excludeSessionId?: string) {
    const encoded = JSON.stringify(payload);
    for (const client of clients.values()) {
      if (client.roomId === roomId && client.sessionId !== excludeSessionId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(encoded);
      }
    }
  }

  function getRoomRoster(roomId: string): OnlinePlayerPresence[] {
    const roster: OnlinePlayerPresence[] = [];
    for (const client of clients.values()) {
      if (client.roomId === roomId && client.presence) {
        roster.push(client.presence);
      }
    }
    return roster;
  }

  wss.on('connection', (ws) => {
    const sessionId = `ws_${crypto.randomUUID().slice(0, 8)}`;
    const meta: ClientMeta = {
      ws,
      sessionId,
      roomId: 'public-world',
      presence: null,
    };
    clients.set(sessionId, meta);

    ws.send(
      JSON.stringify({
        type: 'connected',
        sessionId,
        roomId: meta.roomId,
        roster: getRoomRoster(meta.roomId),
        recentMessages: db.worldMessages.slice(-25),
      }),
    );

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === 'join') {
          const prevRoom = meta.roomId;
          const nextRoom = typeof msg.roomId === 'string' && msg.roomId.trim() ? msg.roomId.trim().slice(0, 48) : 'public-world';
          if (prevRoom !== nextRoom) {
            broadcastToRoom(prevRoom, { type: 'player:leave', sessionId }, sessionId);
            meta.roomId = nextRoom;
          }
          meta.presence = {
            sessionId,
            username: String(msg.username || 'Resident').slice(0, 28),
            characterName: String(msg.characterName || 'Resident').slice(0, 28),
            district: msg.district || 'city',
            pos: Array.isArray(msg.pos) && msg.pos.length === 3 ? msg.pos : [0, 0, 14],
            rotY: Number(msg.rotY) || 0,
            moving: false,
            inVehicle: false,
            appearance: msg.appearance,
            vipTier: String(msg.vipTier || 'Resident'),
            isNpc: false,
          };
          ws.send(
            JSON.stringify({
              type: 'room:state',
              roomId: meta.roomId,
              roster: getRoomRoster(meta.roomId),
              recentMessages: db.worldMessages.slice(-25),
            }),
          );
          broadcastToRoom(meta.roomId, { type: 'player:join', player: meta.presence }, sessionId);
        } else if (msg.type === 'move' && meta.presence) {
          meta.presence.pos = Array.isArray(msg.pos) && msg.pos.length === 3 ? msg.pos : meta.presence.pos;
          meta.presence.rotY = Number(msg.rotY) || 0;
          meta.presence.district = msg.district || meta.presence.district;
          meta.presence.moving = Boolean(msg.moving);
          meta.presence.inVehicle = Boolean(msg.inVehicle);
          meta.presence.vehicleColor = typeof msg.vehicleColor === 'string' ? msg.vehicleColor : undefined;
          if (meta.presence.moving || meta.presence.inVehicle) {
            meta.presence.activeEmote = null;
          }
          if (msg.appearance) {
            meta.presence.appearance = msg.appearance;
          }
          broadcastToRoom(
            meta.roomId,
            {
              type: 'player:move',
              sessionId,
              pos: meta.presence.pos,
              rotY: meta.presence.rotY,
              district: meta.presence.district,
              moving: meta.presence.moving,
              inVehicle: meta.presence.inVehicle,
              vehicleColor: meta.presence.vehicleColor,
              appearance: meta.presence.appearance,
            },
            sessionId,
          );
        } else if (msg.type === 'emote' && meta.presence) {
          if (!isValidEmoteId(msg.emoteId)) return;
          const startedAt = Date.now();
          meta.presence.activeEmote = msg.emoteId;
          meta.presence.emoteStartedAt = startedAt;
          broadcastToRoom(
            meta.roomId,
            {
              type: 'player:emote',
              sessionId,
              characterName: meta.presence.characterName,
              emoteId: msg.emoteId,
              startedAt,
              pos: meta.presence.pos,
            },
            sessionId,
          );
        } else if (msg.type === 'chat' && meta.presence) {
          const mod = moderateChatMessage(String(msg.text || ''));
          if (!mod.allowed) return;
          const chatMsg: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            channel: msg.channel === 'dm' ? 'dm' : msg.channel === 'party' ? 'party' : 'world',
            senderId: sessionId,
            senderName: meta.presence.characterName,
            senderIsNpc: false,
            recipientId: typeof msg.recipientId === 'string' ? msg.recipientId : undefined,
            text: mod.cleaned,
            moderated: mod.flagged,
            timestamp: Date.now(),
          };
          if (chatMsg.channel === 'dm' && chatMsg.recipientId) {
            const target = clients.get(chatMsg.recipientId);
            if (target && target.ws.readyState === WebSocket.OPEN) {
              target.ws.send(JSON.stringify({ type: 'chat:message', message: chatMsg }));
            }
            ws.send(JSON.stringify({ type: 'chat:message', message: chatMsg }));
          } else {
            db.worldMessages = [...db.worldMessages.slice(-49), chatMsg];
            persistDbSoon();
            broadcastToRoom(meta.roomId, { type: 'chat:message', message: chatMsg });
          }
        } else if (msg.type === 'invite' && meta.presence) {
          const target = clients.get(String(msg.targetSessionId || ''));
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(
              JSON.stringify({
                type: 'invite:received',
                fromSessionId: sessionId,
                fromName: meta.presence.characterName,
                district: msg.district || meta.presence.district,
                locationLabel: String(msg.locationLabel || "Mikay's City"),
              }),
            );
          }
        }
      } catch (err) {
        console.warn('[MikayServer] Invalid WS message:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(sessionId);
      broadcastToRoom(meta.roomId, { type: 'player:leave', sessionId });
    });
  });

  // --- REST API Routes ---
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, onlinePlayers: clients.size });
  });

  app.post('/api/auth/register', (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    const characterName = String(req.body?.characterName || username).trim();
    const recoveryHint = String(req.body?.recoveryHint || 'Favorite city').trim();
    const recoveryAnswer = String(req.body?.recoveryAnswer || '').trim().toLowerCase();

    if (username.length < 3 || username.length > 24) {
      res.status(400).json({ error: 'Username must be 3 to 24 characters.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }
    const usernameLower = username.toLowerCase();
    const exists = Object.values(db.accounts).some((a) => a.usernameLower === usernameLower);
    if (exists) {
      res.status(409).json({ error: 'Username is already taken.' });
      return;
    }

    const id = `acc_${crypto.randomUUID().slice(0, 10)}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashSecret(password, salt);
    const recoveryAnswerHash = hashSecret(recoveryAnswer || 'mikay', salt);

    const baseSave = req.body?.initialSaveState
      ? {
          ...createInitialPlayerState({ accountId: id, isGuest: false, username, characterName }),
          ...req.body.initialSaveState,
          accountId: id,
          isGuest: false,
          username,
          characterName: characterName || username,
        }
      : createInitialPlayerState({ accountId: id, isGuest: false, username, characterName });

    const account: AccountRecord = {
      id,
      username,
      usernameLower,
      passwordHash,
      salt,
      recoveryHint,
      recoveryAnswerHash,
      createdAt: Date.now(),
      saveState: baseSave,
    };

    const token = crypto.randomBytes(24).toString('hex');
    db.accounts[id] = account;
    db.sessions[token] = id;
    persistDbSoon();

    res.json({ token, saveState: account.saveState });
  });

  app.post('/api/auth/login', (req, res) => {
    const usernameLower = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const account = Object.values(db.accounts).find((a) => a.usernameLower === usernameLower);
    if (!account) {
      res.status(401).json({ error: 'Account not found.' });
      return;
    }
    const hash = hashSecret(password, account.salt);
    if (hash !== account.passwordHash) {
      res.status(401).json({ error: 'Incorrect password.' });
      return;
    }
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = account.id;
    persistDbSoon();
    res.json({ token, saveState: account.saveState });
  });

  app.post('/api/auth/recover', (req, res) => {
    const usernameLower = String(req.body?.username || '').trim().toLowerCase();
    const recoveryAnswer = String(req.body?.recoveryAnswer || '').trim().toLowerCase();
    const newPassword = String(req.body?.newPassword || '');
    const account = Object.values(db.accounts).find((a) => a.usernameLower === usernameLower);
    if (!account) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    if (!recoveryAnswer && !newPassword) {
      res.json({ hint: account.recoveryHint });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }
    const ansHash = hashSecret(recoveryAnswer, account.salt);
    if (ansHash !== account.recoveryAnswerHash) {
      res.status(403).json({ error: 'Recovery answer does not match.' });
      return;
    }
    account.passwordHash = hashSecret(newPassword, account.salt);
    persistDbSoon();
    res.json({ ok: true, message: 'Password updated! You can now log in.' });
  });

  app.get('/api/auth/me', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const account = getAccountByToken(token);
    if (!account) {
      res.status(401).json({ error: 'Invalid or expired session.' });
      return;
    }
    res.json({ saveState: account.saveState });
  });

  app.post('/api/save', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const account = getAccountByToken(token);
    if (!account) {
      res.status(401).json({ error: 'Sign in to sync cloud progress.' });
      return;
    }
    const incoming = req.body?.saveState as PlayerSaveState | undefined;
    if (!incoming) {
      res.status(400).json({ error: 'Missing saveState payload.' });
      return;
    }
    // Server-side guardrails on currency & identity
    account.saveState = {
      ...incoming,
      accountId: account.id,
      isGuest: false,
      username: account.username,
      velorCoins: Math.max(0, Math.min(9999999, Number(incoming.velorCoins) || 0)),
    };
    persistDbSoon();
    res.json({ ok: true, savedAt: Date.now() });
  });

  app.post('/api/social/report', (req, res) => {
    const targetId = String(req.body?.targetId || '').trim();
    const reason = String(req.body?.reason || '').trim().slice(0, 300);
    const reporterId = String(req.body?.reporterId || 'anonymous');
    if (!targetId || !reason) {
      res.status(400).json({ error: 'Target and reason required.' });
      return;
    }
    db.reports.push({
      id: `rep_${Date.now()}`,
      reporterId,
      targetId,
      reason,
      createdAt: Date.now(),
    });
    persistDbSoon();
    res.json({ ok: true, message: 'Safety report logged for moderation review.' });
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Mikay's Simulation] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
