import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';

// 强制动态路由，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// 服务端专用函数，直接调用外部API
async function getShortDramaCategoriesInternal() {
  const response = await fetch('https://api.r2afosne.dpdns.org/vod/categories', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const categories = data.categories || [];
  return categories.map((item: any) => ({
    type_id: item.type_id,
    type_name: item.type_name,
  }));
}

export async function GET() {
  try {
    const categories = await getShortDramaCategoriesInternal();

    // 强力禁用所有层级的缓存
    const response = NextResponse.json(categories);

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
    console.error('获取短剧分类失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}