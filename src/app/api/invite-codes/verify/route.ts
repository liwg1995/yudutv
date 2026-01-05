/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_MEMBERSHIP_CONFIG } from '@/lib/types';

// POST - 验证邀请码
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { code: 400, message: '请输入邀请码' },
        { status: 400 }
      );
    }

    const inviteCode = await db.getInviteCode(code.trim().toUpperCase());

    if (!inviteCode) {
      return NextResponse.json(
        { code: 404, message: '邀请码不存在', valid: false },
        { status: 200 }
      );
    }

    // 检查状态
    if (inviteCode.status === 'used') {
      return NextResponse.json(
        { code: 400, message: '邀请码已被使用', valid: false },
        { status: 200 }
      );
    }

    if (inviteCode.status === 'expired') {
      return NextResponse.json(
        { code: 400, message: '邀请码已过期', valid: false },
        { status: 200 }
      );
    }

    // 检查有效期
    if (inviteCode.expiresAt > 0 && inviteCode.expiresAt < Date.now()) {
      return NextResponse.json(
        { code: 400, message: '邀请码已过期', valid: false },
        { status: 200 }
      );
    }

    // 获取会员配置
    const storedConfig = await db.getMembershipConfig();
    const membershipConfig = { ...DEFAULT_MEMBERSHIP_CONFIG, ...storedConfig };
    const config = membershipConfig[inviteCode.membershipType];

    return NextResponse.json({
      code: 200,
      message: '邀请码有效',
      valid: true,
      data: {
        membershipType: inviteCode.membershipType,
        membershipName: config.name,
        duration: config.duration,
        price: config.price,
        description: config.description,
      },
    });
  } catch (error: any) {
    console.error('验证邀请码失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '验证失败' },
      { status: 500 }
    );
  }
}
