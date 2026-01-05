/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { InviteCode, MembershipType } from '@/lib/types';

// 生成随机邀请码
function generateInviteCode(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去除易混淆字符
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET - 获取所有邀请码
export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    // 检查是否是管理员
    if (authInfo.username !== process.env.USERNAME) {
      return NextResponse.json({ code: 403, message: '无权限' }, { status: 403 });
    }

    const inviteCodes = await db.getAllInviteCodes();

    // 按创建时间倒序排序
    inviteCodes.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({
      code: 200,
      message: '获取成功',
      data: inviteCodes,
    });
  } catch (error: any) {
    console.error('获取邀请码失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '获取邀请码失败' },
      { status: 500 }
    );
  }
}

// POST - 创建邀请码
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
    const { membershipType, count = 1, expiresIn = 0, note } = body;

    // 验证会员类型
    if (!['trial', 'monthly', 'quarterly', 'yearly', 'lifetime'].includes(membershipType)) {
      return NextResponse.json(
        { code: 400, message: '无效的会员类型' },
        { status: 400 }
      );
    }

    // 验证数量
    if (count < 1 || count > 100) {
      return NextResponse.json(
        { code: 400, message: '数量必须在1-100之间' },
        { status: 400 }
      );
    }

    const createdCodes: InviteCode[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      // 生成唯一邀请码
      let code = generateInviteCode();
      let existingCode = await db.getInviteCode(code);
      
      // 如果邀请码已存在，重新生成
      while (existingCode) {
        code = generateInviteCode();
        existingCode = await db.getInviteCode(code);
      }

      const inviteCode: InviteCode = {
        code,
        membershipType: membershipType as MembershipType,
        status: 'unused',
        createdAt: now,
        expiresAt: expiresIn > 0 ? now + expiresIn * 24 * 60 * 60 * 1000 : 0,
        createdBy: authInfo.username,
        note: note || undefined,
      };

      await db.createInviteCode(inviteCode);
      createdCodes.push(inviteCode);
    }

    return NextResponse.json({
      code: 200,
      message: `成功生成 ${count} 个邀请码`,
      data: createdCodes,
    });
  } catch (error: any) {
    console.error('创建邀请码失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '创建邀请码失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除邀请码
export async function DELETE(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    // 检查是否是管理员
    if (authInfo.username !== process.env.USERNAME) {
      return NextResponse.json({ code: 403, message: '无权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { code: 400, message: '缺少邀请码参数' },
        { status: 400 }
      );
    }

    const existingCode = await db.getInviteCode(code);

    if (!existingCode) {
      return NextResponse.json(
        { code: 404, message: '邀请码不存在' },
        { status: 404 }
      );
    }

    // 不允许删除已使用的邀请码
    if (existingCode.status === 'used') {
      return NextResponse.json(
        { code: 400, message: '不能删除已使用的邀请码' },
        { status: 400 }
      );
    }

    await db.deleteInviteCode(code);

    return NextResponse.json({
      code: 200,
      message: '删除成功',
    });
  } catch (error: any) {
    console.error('删除邀请码失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '删除邀请码失败' },
      { status: 500 }
    );
  }
}
