/**
 * 邀请码库存查询 API
 * GET /api/invite-codes/stock - 获取各类型邀请码的库存数量
 */

import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { MembershipType, DEFAULT_MEMBERSHIP_CONFIG } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // 获取所有未使用的邀请码
    const allCodes = await db.getAllInviteCodes();
    
    // 统计各类型的库存数量
    const stock: Record<MembershipType, number> = {
      trial: 0,
      monthly: 0,
      quarterly: 0,
      yearly: 0,
      lifetime: 0,
    };

    const now = Date.now();
    
    allCodes.forEach(code => {
      // 只统计未使用且未过期的邀请码
      if (code.status === 'unused') {
        // 检查是否过期（expiresAt 为 0 表示永不过期）
        if (code.expiresAt === 0 || code.expiresAt > now) {
          if (stock[code.membershipType] !== undefined) {
            stock[code.membershipType]++;
          }
        }
      }
    });

    // 返回库存信息，包含价格和名称
    const stockInfo = Object.entries(stock).map(([type, count]) => {
      const config = DEFAULT_MEMBERSHIP_CONFIG[type as MembershipType];
      return {
        type: type as MembershipType,
        name: config.name,
        price: config.price,
        duration: config.duration,
        description: config.description,
        stock: count,
        available: count > 0,
      };
    });

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: stockInfo,
    });
  } catch (error) {
    console.error('获取邀请码库存失败:', error);
    return NextResponse.json(
      { code: 500, message: '服务器错误' },
      { status: 500 }
    );
  }
}
