/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { DEFAULT_MEMBERSHIP_CONFIG, MembershipConfig, MembershipType } from '@/lib/types';

// GET - 获取会员配置（公开）
export async function GET() {
  try {
    const storedConfig = await db.getMembershipConfig();
    // 合并存储的配置和默认配置，确保所有类型都存在
    const config = { ...DEFAULT_MEMBERSHIP_CONFIG, ...storedConfig };
    
    return NextResponse.json({
      code: 200,
      message: '获取成功',
      data: config,
    });
  } catch (error: any) {
    console.error('获取会员配置失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '获取会员配置失败' },
      { status: 500 }
    );
  }
}

// POST - 保存会员配置（管理员）
export async function POST(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    // 检查是否是管理员
    if (authInfo.username !== process.env.USERNAME) {
      return NextResponse.json({ code: 403, message: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { config } = body;

    if (!config || typeof config !== 'object') {
      return NextResponse.json(
        { code: 400, message: '无效的配置数据' },
        { status: 400 }
      );
    }

    // 验证配置格式
    const validTypes: MembershipType[] = ['trial', 'monthly', 'quarterly', 'yearly', 'lifetime'];
    for (const type of validTypes) {
      if (!config[type]) {
        return NextResponse.json(
          { code: 400, message: `缺少 ${type} 配置` },
          { status: 400 }
        );
      }
      
      const item = config[type] as MembershipConfig;
      if (typeof item.price !== 'number' || item.price < 0) {
        return NextResponse.json(
          { code: 400, message: `${type} 价格必须为非负数` },
          { status: 400 }
        );
      }
      
      if (typeof item.duration !== 'number' || item.duration < 0) {
        return NextResponse.json(
          { code: 400, message: `${type} 时长必须为非负数` },
          { status: 400 }
        );
      }
    }

    await db.setMembershipConfig(config);

    return NextResponse.json({
      code: 200,
      message: '保存成功',
      data: config,
    });
  } catch (error: any) {
    console.error('保存会员配置失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '保存会员配置失败' },
      { status: 500 }
    );
  }
}
