import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET - 获取支付状态（公开接口，不需要登录）
 * 只返回是否启用，不返回敏感配置信息
 */
export async function GET() {
  try {
    const config = await db.getPaymentConfig();
    
    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        enabled: config?.enabled || false,
      },
    });
  } catch (error) {
    console.error('获取支付状态失败:', error);
    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        enabled: false,
      },
    });
  }
}
