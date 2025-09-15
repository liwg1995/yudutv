import { NextRequest, NextResponse } from 'next/server';

// 强制动态路由，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// 服务端专用函数，直接调用外部API
async function searchShortDramasInternal(
  query: string,
  page = 1,
  size = 20
) {
  const response = await fetch(
    `https://api.r2afosne.dpdns.org/vod/search?name=${encodeURIComponent(query)}&page=${page}&size=${size}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const items = data.list || [];
  const list = items.map((item: any) => ({
    id: item.id,
    name: item.name,
    cover: item.cover,
    update_time: item.update_time || new Date().toISOString(),
    score: item.score || 0,
    episode_count: 1, // 搜索API没有集数信息，ShortDramaCard会自动获取
    description: item.description || '',
  }));

  return {
    list,
    hasMore: data.currentPage < data.totalPages,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get('query');
    const page = searchParams.get('page');
    const size = searchParams.get('size');

    if (!query) {
      return NextResponse.json(
        { error: '缺少必要参数: query' },
        { status: 400 }
      );
    }

    const pageNum = page ? parseInt(page) : 1;
    const pageSize = size ? parseInt(size) : 20;

    if (isNaN(pageNum) || isNaN(pageSize)) {
      return NextResponse.json(
        { error: '参数格式错误' },
        { status: 400 }
      );
    }

    const result = await searchShortDramasInternal(query, pageNum, pageSize);

    // 强力禁用所有层级的缓存
    const response = NextResponse.json(result);

    // 标准HTTP缓存控制
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    // 移动端特定缓存控制
    response.headers.set('Surrogate-Control', 'no-store');
    response.headers.set('X-Accel-Expires', '0');

    // 防止代理缓存
    response.headers.set('Vary', 'Accept-Encoding, User-Agent');

    // 强制刷新标识
    response.headers.set('X-Cache-Status', 'MISS');
    response.headers.set('X-Debug-Timestamp', new Date().toISOString());
    response.headers.set('X-Force-Refresh', 'true');

    return response;
  } catch (error) {
    console.error('搜索短剧失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}