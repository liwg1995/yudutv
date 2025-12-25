import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * M3U8 代理接口
 * 用于外部播放器访问,会执行去广告逻辑并处理相对链接
 * GET /api/proxy-m3u8?url=<原始m3u8地址>&source=<播放源>
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const m3u8Url = searchParams.get('url');
    const source = searchParams.get('source') || '';

    if (!m3u8Url) {
      return NextResponse.json(
        { error: '缺少必要参数: url' },
        { status: 400 }
      );
    }

    // 获取当前请求的 origin
    const requestUrl = new URL(request.url);
    const origin = `${requestUrl.protocol}//${requestUrl.host}`;

    // 获取原始 m3u8 内容
    const response = await fetch(m3u8Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: '获取 m3u8 文件失败' },
        { status: response.status }
      );
    }

    let m3u8Content = await response.text();

    // 执行去广告逻辑（默认规则）
    m3u8Content = filterAdsFromM3U8Default(source, m3u8Content);

    // 处理 m3u8 中的相对链接
    m3u8Content = resolveM3u8Links(m3u8Content, m3u8Url, source, origin);

    // 返回处理后的 m3u8 内容
    return new NextResponse(m3u8Content, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('代理 m3u8 失败:', error);
    return NextResponse.json(
      { error: '代理失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 默认去广告规则
 */
function filterAdsFromM3U8Default(source: string, m3u8Content: string): string {
  if (!m3u8Content) return '';

  // 按行分割M3U8内容
  const lines = m3u8Content.split('\n');
  const filteredLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 只过滤#EXT-X-DISCONTINUITY标识
    if (!line.includes('#EXT-X-DISCONTINUITY')) {
      filteredLines.push(line);
    }
  }

  return filteredLines.join('\n');
}

/**
 * 处理 m3u8 中的相对链接
 * 将相对链接转换为绝对链接
 */
function resolveM3u8Links(
  m3u8Content: string,
  m3u8Url: string,
  source: string,
  origin: string
): string {
  const lines = m3u8Content.split('\n');
  const resolvedLines: string[] = [];

  // 获取 m3u8 的基础 URL（用于解析相对路径）
  const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 处理 URI 属性（如 EXT-X-KEY, EXT-X-MAP 等）
    if (trimmedLine.startsWith('#EXT-X-KEY:') || trimmedLine.startsWith('#EXT-X-MAP:')) {
      const uriMatch = trimmedLine.match(/URI="([^"]+)"/);
      if (uriMatch) {
        const uri = uriMatch[1];
        const absoluteUri = resolveUrl(baseUrl, uri);
        resolvedLines.push(trimmedLine.replace(uri, absoluteUri));
        continue;
      }
    }

    // 处理嵌套的 m3u8 文件（多码率）
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      // 可能是 ts 片段或嵌套 m3u8
      if (trimmedLine.endsWith('.m3u8') || trimmedLine.includes('.m3u8?')) {
        // 嵌套 m3u8，需要通过代理
        const absoluteUrl = resolveUrl(baseUrl, trimmedLine);
        const proxyUrl = `${origin}/api/proxy-m3u8?url=${encodeURIComponent(absoluteUrl)}&source=${encodeURIComponent(source)}`;
        resolvedLines.push(proxyUrl);
      } else {
        // ts 片段，转换为绝对路径
        const absoluteUrl = resolveUrl(baseUrl, trimmedLine);
        resolvedLines.push(absoluteUrl);
      }
      continue;
    }

    // 其他行保持不变
    resolvedLines.push(line);
  }

  return resolvedLines.join('\n');
}

/**
 * 将相对 URL 转换为绝对 URL
 */
function resolveUrl(baseUrl: string, relativeUrl: string): string {
  // 如果已经是绝对 URL，直接返回
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl;
  }

  // 如果是协议相对 URL（以 // 开头）
  if (relativeUrl.startsWith('//')) {
    const baseProtocol = baseUrl.startsWith('https') ? 'https:' : 'http:';
    return baseProtocol + relativeUrl;
  }

  // 如果是根相对 URL（以 / 开头）
  if (relativeUrl.startsWith('/')) {
    const urlObj = new URL(baseUrl);
    return `${urlObj.protocol}//${urlObj.host}${relativeUrl}`;
  }

  // 相对路径
  return baseUrl + relativeUrl;
}
