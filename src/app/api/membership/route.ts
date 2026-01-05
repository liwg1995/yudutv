/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthInfoFromCookie } from '@/lib/auth';

// GET - 获取当前用户会员信息
export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    const membership = await db.getUserMembership(authInfo.username);

    if (!membership) {
      return NextResponse.json({
        code: 200,
        message: '当前为非会员用户',
        data: null,
      });
    }

    return NextResponse.json({
      code: 200,
      message: '获取成功',
      data: membership,
    });
  } catch (error: any) {
    console.error('获取会员信息失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '获取会员信息失败' },
      { status: 500 }
    );
  }
}
