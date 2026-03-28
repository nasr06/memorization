import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text } from "react-native";
import { resolveMediaUrl } from "@/lib/mediaStore";

interface CardRendererProps {
  content: string;
  css?: string | null;
  deckId?: string;
  isActive?: boolean;
}

function containsHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

async function resolveMediaRefs(html: string, deckId: string): Promise<string> {
  const pattern = /src="([^"]+)"/g;
  const matches = [...html.matchAll(pattern)];
  let result = html;
  for (const match of matches) {
    const src = match[1];
    if (
      !src.startsWith("http") &&
      !src.startsWith("data:") &&
      !src.startsWith("blob:")
    ) {
      const url = await resolveMediaUrl(deckId, src);
      if (url) {
        result = result.replace(match[0], `src="${url}"`);
      }
    }
  }
  return result;
}

// Script injected into the iframe. Listens for postMessage to play/pause.
const AUDIO_SCRIPT = `
(function () {
  var PLAY = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
  var STOP = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>';

  var buttons = [];

  function setPlaying(btn, playing) {
    btn.innerHTML = playing ? STOP : PLAY;
    btn.classList.toggle('playing', playing);
  }

  function pauseAll() {
    document.querySelectorAll('audio').forEach(function (a) {
      a.pause();
      a.currentTime = 0;
    });
  }

  function playFirst() {
    var first = document.querySelector('audio');
    if (first) first.play().catch(function () {});
  }

  function initAudio() {
    var audios = document.querySelectorAll('audio');
    audios.forEach(function (audio) {
      audio.style.display = 'none';

      var btn = document.createElement('button');
      btn.className = 'audio-btn';
      btn.innerHTML = PLAY;
      btn.setAttribute('aria-label', 'Play audio');
      audio.parentNode.insertBefore(btn, audio.nextSibling);
      buttons.push({ audio: audio, btn: btn });

      audio.addEventListener('ended', function () { setPlaying(btn, false); });
      audio.addEventListener('pause', function () { setPlaying(btn, false); });
      audio.addEventListener('play', function () { setPlaying(btn, true); });

      btn.addEventListener('click', function () {
        if (audio.paused) {
          pauseAll();
          audio.play().catch(function () {});
        } else {
          audio.pause();
          audio.currentTime = 0;
        }
      });
    });
  }

  window.addEventListener('message', function (e) {
    if (!e.data || typeof e.data.type !== 'string') return;
    if (e.data.type === 'card-activate') playFirst();
    if (e.data.type === 'card-deactivate') pauseAll();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAudio);
  } else {
    initAudio();
  }
})();
`;

function buildHtml(content: string, css?: string | null): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: transparent; height: 100%; }
    body {
      color: #F0F0F5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 18px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100%;
      text-align: center;
      word-break: break-word;
    }
    .card { max-width: 100%; width: 100%; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    hr { border: none; border-top: 1px solid rgba(255,255,255,0.15); margin: 12px 0; }
    b, strong { font-weight: 700; }
    i, em { font-style: italic; }
    .audio-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1.5px solid rgba(108,99,255,0.5);
      background: rgba(108,99,255,0.15);
      color: #6C63FF;
      cursor: pointer;
      margin: 6px 4px;
      transition: background 0.15s;
    }
    .audio-btn:hover { background: rgba(108,99,255,0.3); }
    .audio-btn.playing { background: rgba(108,99,255,0.3); border-color: #6C63FF; }
    ${css ?? ""}
  </style>
</head>
<body>
  <div class="card">${content}</div>
  <script>${AUDIO_SCRIPT}</script>
</body>
</html>`;
}

export function CardRenderer({ content, css, deckId, isActive }: CardRendererProps) {
  const hasHtml = containsHtml(content);
  const [resolvedHtml, setResolvedHtml] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!hasHtml) return;
    let cancelled = false;
    async function resolve() {
      let resolved = content;
      if (deckId) resolved = await resolveMediaRefs(content, deckId);
      if (!cancelled) setResolvedHtml(buildHtml(resolved, css));
    }
    resolve();
    return () => { cancelled = true; };
  }, [content, css, deckId, hasHtml]);

  const postToIframe = useCallback((type: string) => {
    iframeRef.current?.contentWindow?.postMessage({ type }, "*");
  }, []);

  // When the iframe finishes loading, activate or deactivate immediately
  const handleLoad = useCallback(() => {
    postToIframe(isActive ? "card-activate" : "card-deactivate");
  }, [isActive, postToIframe]);

  // When isActive changes after load, notify the iframe
  useEffect(() => {
    if (!resolvedHtml) return;
    postToIframe(isActive ? "card-activate" : "card-deactivate");
  }, [isActive, resolvedHtml, postToIframe]);

  if (!hasHtml) {
    return (
      <Text className="text-text-primary text-xl font-semibold text-center leading-relaxed">
        {content}
      </Text>
    );
  }

  if (!resolvedHtml) return null;

  return (
    <View style={{ flex: 1, width: "100%" }}>
      <iframe
        ref={iframeRef}
        srcDoc={resolvedHtml}
        onLoad={handleLoad}
        allow="autoplay"
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          border: "none",
          backgroundColor: "transparent",
        }}
        sandbox="allow-same-origin allow-scripts"
      />
    </View>
  );
}
