import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CharacterAppearance,
  ChatMessage,
  DistrictId,
  EmoteId,
  GameNotification,
  OnlinePlayerPresence,
} from '../game/types';

export type ConnectionStatus = 'connecting' | 'online' | 'offline';

interface UseMultiplayerOptions {
  enabled: boolean;
  roomId: string;
  username: string;
  characterName: string;
  district: DistrictId;
  pos: [number, number, number];
  appearance: CharacterAppearance;
  vipTier: string;
  blockedUsers: string[];
  onNotification: (notif: GameNotification) => void;
  onPlayerEmote?: (evt: {
    sessionId: string;
    characterName: string;
    emoteId: EmoteId;
    pos: [number, number, number];
  }) => void;
}

export function useMultiplayer(opts: UseMultiplayerOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('offline');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayerPresence[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!opts.enabled) {
      wsRef.current?.close();
      wsRef.current = null;
      setStatus('offline');
      setOnlinePlayers([]);
      return;
    }

    let closedByCleanup = false;
    let reconnectTimer: number | null = null;

    function connect() {
      if (closedByCleanup) return;
      setStatus('connecting');
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('online');
        const cur = optsRef.current;
        ws.send(
          JSON.stringify({
            type: 'join',
            roomId: cur.roomId,
            username: cur.username,
            characterName: cur.characterName,
            district: cur.district,
            pos: cur.pos,
            appearance: cur.appearance,
            vipTier: cur.vipTier,
          }),
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data));
          if (data.type === 'connected') {
            setSessionId(data.sessionId);
            if (Array.isArray(data.recentMessages)) {
              setMessages(data.recentMessages);
            }
          } else if (data.type === 'room:state') {
            const selfId = sessionId;
            const list = (data.roster || []) as OnlinePlayerPresence[];
            setOnlinePlayers(list.filter((p) => p.sessionId !== selfId));
            if (Array.isArray(data.recentMessages)) {
              setMessages(data.recentMessages);
            }
          } else if (data.type === 'player:join') {
            const p = data.player as OnlinePlayerPresence;
            setOnlinePlayers((prev) => {
              if (prev.some((x) => x.sessionId === p.sessionId)) return prev;
              return [...prev, p];
            });
          } else if (data.type === 'player:leave') {
            setOnlinePlayers((prev) => prev.filter((p) => p.sessionId !== data.sessionId));
          } else if (data.type === 'player:move') {
            setOnlinePlayers((prev) =>
              prev.map((p) =>
                p.sessionId === data.sessionId
                  ? {
                      ...p,
                      pos: data.pos,
                      rotY: data.rotY,
                      district: data.district,
                      moving: data.moving,
                      inVehicle: data.inVehicle,
                      vehicleColor: data.vehicleColor,
                      appearance: data.appearance || p.appearance,
                      activeEmote: data.moving || data.inVehicle ? null : p.activeEmote,
                    }
                  : p,
              ),
            );
          } else if (data.type === 'player:emote') {
            const emoteId = data.emoteId as EmoteId;
            setOnlinePlayers((prev) =>
              prev.map((p) =>
                p.sessionId === data.sessionId
                  ? { ...p, activeEmote: emoteId, emoteStartedAt: Number(data.startedAt) || Date.now() }
                  : p,
              ),
            );
            optsRef.current.onPlayerEmote?.({
              sessionId: String(data.sessionId),
              characterName: String(data.characterName || 'Resident'),
              emoteId,
              pos: Array.isArray(data.pos) && data.pos.length === 3 ? data.pos : [0, 0, 0],
            });
          } else if (data.type === 'chat:message') {
            const msg = data.message as ChatMessage;
            if (!optsRef.current.blockedUsers.includes(msg.senderName)) {
              setMessages((prev) => [...prev.slice(-60), msg]);
            }
          } else if (data.type === 'invite:received') {
            optsRef.current.onNotification({
              id: `inv_${Date.now()}`,
              title: `Invitation from ${data.fromName}`,
              body: `Come join me at ${data.locationLabel}`,
              type: 'invite',
              timestamp: Date.now(),
              actionDistrict: data.district,
              read: false,
            });
          }
        } catch {
          // ignore malformed packet
        }
      };

      ws.onclose = () => {
        setStatus('offline');
        if (!closedByCleanup) {
          reconnectTimer = window.setTimeout(connect, 3500);
        }
      };
      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      closedByCleanup = true;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [opts.enabled, opts.roomId]);

  const sendMove = useCallback(
    (pos: [number, number, number], rotY: number, district: DistrictId, moving: boolean, inVehicle: boolean) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'move',
            pos,
            rotY,
            district,
            moving,
            inVehicle,
            appearance: optsRef.current.appearance,
          }),
        );
      }
    },
    [],
  );

  const sendChat = useCallback((text: string, channel: 'world' | 'dm' | 'party' = 'world', recipientId?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat', text, channel, recipientId }));
      return true;
    }
    return false;
  }, []);

  const sendInvite = useCallback((targetSessionId: string, district: DistrictId, locationLabel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'invite', targetSessionId, district, locationLabel }));
      return true;
    }
    return false;
  }, []);

  const sendEmote = useCallback((emoteId: EmoteId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'emote', emoteId }));
      return true;
    }
    return false;
  }, []);

  return {
    status,
    sessionId,
    onlinePlayers: onlinePlayers.filter((p) => p.sessionId !== sessionId && !opts.blockedUsers.includes(p.username)),
    messages,
    sendMove,
    sendChat,
    sendInvite,
    sendEmote,
  };
}
