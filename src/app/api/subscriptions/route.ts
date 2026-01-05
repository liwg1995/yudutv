/**
 * 影视订阅 API
 * GET /api/subscriptions - 获取用户订阅列表
 * POST /api/subscriptions - 创建订阅
 * DELETE /api/subscriptions - 删除订阅
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { UserSubscription } from '@/lib/types';
import crypto from 'crypto';

export const runtime = 'nodejs';

// 生成唯一ID
function generateId(): string {
  return crypto.randomUUID();
}

// 获取订阅列表
export async function GET(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  
  if (!authInfo?.username) {
    return NextResponse.json(
      { code: 401, message: '请先登录' },
      { status: 401 }
    );
  }

  try {
    const subscriptions = await db.getUserSubscriptions(authInfo.username);
    
    return NextResponse.json({
      code: 200,
      data: subscriptions,
    });
  } catch (error) {
    console.error('获取订阅列表失败:', error);
    return NextResponse.json(
      { code: 500, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// 创建订阅
export async function POST(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  
  if (!authInfo?.username) {
    return NextResponse.json(
      { code: 401, message: '请先登录' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { title, sourceKey, currentEpisodes, email } = body;

    // 验证必填字段
    if (!title || !sourceKey) {
      return NextResponse.json(
        { code: 400, message: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 验证邮箱
    if (!email) {
      return NextResponse.json(
        { code: 400, message: '请填写接收通知的邮箱' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { code: 400, message: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 检查是否已订阅
    const existingSubscriptions = await db.getUserSubscriptions(authInfo.username);
    const alreadySubscribed = existingSubscriptions.find(s => s.sourceKey === sourceKey);
    
    if (alreadySubscribed) {
      return NextResponse.json(
        { code: 400, message: '您已订阅此影视' },
        { status: 400 }
      );
    }

    // 创建订阅
    const subscription: UserSubscription = {
      id: generateId(),
      username: authInfo.username,
      email: email.trim().toLowerCase(),
      title,
      sourceKey,
      currentEpisodes: currentEpisodes || 0,
      lastChecked: Date.now(),
      status: 'active',
      createdAt: Date.now(),
      notifiedEpisodes: currentEpisodes || 0,
    };

    await db.createSubscription(subscription);

    return NextResponse.json({
      code: 200,
      message: '订阅成功',
      data: subscription,
    });
  } catch (error) {
    console.error('创建订阅失败:', error);
    return NextResponse.json(
      { code: 500, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// 删除订阅
export async function DELETE(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  
  if (!authInfo?.username) {
    return NextResponse.json(
      { code: 401, message: '请先登录' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { code: 400, message: '缺少订阅ID' },
        { status: 400 }
      );
    }

    // 验证订阅是否属于当前用户
    const subscription = await db.getSubscription(id);
    if (!subscription) {
      return NextResponse.json(
        { code: 404, message: '订阅不存在' },
        { status: 404 }
      );
    }

    if (subscription.username !== authInfo.username) {
      return NextResponse.json(
        { code: 403, message: '无权限删除此订阅' },
        { status: 403 }
      );
    }

    await db.deleteSubscription(id);

    return NextResponse.json({
      code: 200,
      message: '取消订阅成功',
    });
  } catch (error) {
    console.error('删除订阅失败:', error);
    return NextResponse.json(
      { code: 500, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// 更新订阅状态（暂停/恢复）
export async function PATCH(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  
  if (!authInfo?.username) {
    return NextResponse.json(
      { code: 401, message: '请先登录' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { id, status, email } = body;

    if (!id) {
      return NextResponse.json(
        { code: 400, message: '缺少订阅ID' },
        { status: 400 }
      );
    }

    // 验证订阅是否属于当前用户
    const subscription = await db.getSubscription(id);
    if (!subscription) {
      return NextResponse.json(
        { code: 404, message: '订阅不存在' },
        { status: 404 }
      );
    }

    if (subscription.username !== authInfo.username) {
      return NextResponse.json(
        { code: 403, message: '无权限修改此订阅' },
        { status: 403 }
      );
    }

    const updates: Partial<UserSubscription> = {};
    
    if (status && (status === 'active' || status === 'paused')) {
      updates.status = status;
    }
    
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { code: 400, message: '邮箱格式不正确' },
          { status: 400 }
        );
      }
      updates.email = email.trim().toLowerCase();
    }

    await db.updateSubscription(id, updates);

    return NextResponse.json({
      code: 200,
      message: '更新成功',
    });
  } catch (error) {
    console.error('更新订阅失败:', error);
    return NextResponse.json(
      { code: 500, message: '服务器错误' },
      { status: 500 }
    );
  }
}
