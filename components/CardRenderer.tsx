import { Text, View } from "react-native";
import WebView from "react-native-webview";
import { getMediaBaseUrl } from "@/lib/mediaUtils";

interface CardRendererProps {
  content: string;
  css?: string | null;
  deckId?: string;
  isActive?: boolean;
}

function containsHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

function buildHtml(
  content: string,
  css?: string | null,
  mediaBaseUrl?: string
): string {
  const baseTag = mediaBaseUrl
    ? `<base href="${mediaBaseUrl}">`
    : "";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  ${baseTag}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: transparent;
      height: 100%;
    }
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
    audio { width: 100%; margin: 8px 0; }
    hr { border: none; border-top: 1px solid rgba(255,255,255,0.15); margin: 12px 0; }
    b, strong { font-weight: 700; }
    i, em { font-style: italic; }
    ${css ?? ""}
  </style>
</head>
<body>
  <div class="card">${content}</div>
</body>
</html>`;
}

export function CardRenderer({ content, css, deckId }: CardRendererProps) {
  const hasHtml = containsHtml(content);

  if (!hasHtml) {
    return (
      <Text className="text-text-primary text-xl font-semibold text-center leading-relaxed">
        {content}
      </Text>
    );
  }

  const mediaBaseUrl = deckId ? getMediaBaseUrl(deckId) : undefined;

  const html = buildHtml(content, css, mediaBaseUrl);

  return (
    <View className="flex-1 w-full">
      <WebView
        source={{ html, baseUrl: mediaBaseUrl }}
        style={{ flex: 1, backgroundColor: "transparent" }}
        scrollEnabled
        originWhitelist={["*"]}
        allowFileAccess={!!mediaBaseUrl}
        allowFileAccessFromFileURLs={!!mediaBaseUrl}
        allowUniversalAccessFromFileURLs={!!mediaBaseUrl}
        mixedContentMode="always"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}
