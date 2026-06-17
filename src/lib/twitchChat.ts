// Cliente anónimo de Twitch chat (SOLO LECTURA) vía WebSocket IRC.
// No requiere credenciales ni OAuth: se conecta con un nick anónimo "justinfan*",
// hace JOIN al canal y emite cada mensaje. Ideal para un overlay de OBS que
// cuenta votos del chat en tiempo real sin backend.

export type ChatMessage = { user: string; text: string };
export type ChatStatus = 'connecting' | 'open' | 'closed';

export function connectTwitchChat(
  channel: string,
  onMessage: (m: ChatMessage) => void,
  onStatus?: (s: ChatStatus) => void,
) {
  const ch = channel.toLowerCase().replace(/^#/, '').trim();
  let ws: WebSocket | null = null;
  let closed = false;
  let retry: ReturnType<typeof setTimeout> | null = null;

  const open = () => {
    onStatus?.('connecting');
    ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

    ws.onopen = () => {
      const nick = 'justinfan' + Math.floor(Math.random() * 999999);
      ws!.send('CAP REQ :twitch.tv/tags'); // para recibir display-name
      ws!.send('PASS SCHMOOPIIE');
      ws!.send(`NICK ${nick}`);
      ws!.send(`JOIN #${ch}`);
      onStatus?.('open');
    };

    ws.onmessage = (ev) => {
      const raw = String(ev.data);
      for (const line of raw.split('\r\n')) {
        if (!line) continue;
        if (line.startsWith('PING')) {
          ws!.send('PONG :tmi.twitch.tv');
          continue;
        }
        if (line.indexOf('PRIVMSG') === -1) continue;

        // Formato: [@tags ]:nick!nick@nick.tmi.twitch.tv PRIVMSG #canal :mensaje
        let rest = line;
        let tags = '';
        if (line.startsWith('@')) {
          const sp = line.indexOf(' ');
          tags = line.slice(1, sp);
          rest = line.slice(sp + 1);
        }
        const displayName = /display-name=([^;]*)/.exec(tags)?.[1];
        const nick = /^:([^!]+)!/.exec(rest)?.[1];
        const user = (displayName && displayName.trim()) || nick || 'anon';

        const pm = rest.indexOf('PRIVMSG');
        const colon = rest.indexOf(':', pm);
        const text = colon !== -1 ? rest.slice(colon + 1) : '';
        onMessage({ user, text });
      }
    };

    ws.onclose = () => {
      onStatus?.('closed');
      if (!closed) retry = setTimeout(open, 2500);
    };
    ws.onerror = () => {
      try { ws?.close(); } catch { /* noop */ }
    };
  };

  open();

  return {
    close: () => {
      closed = true;
      if (retry) clearTimeout(retry);
      try { ws?.close(); } catch { /* noop */ }
    },
  };
}
