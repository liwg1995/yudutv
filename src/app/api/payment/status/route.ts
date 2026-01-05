import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { XorpayMethod } from '@/lib/types';

/**
 * GET - 获取支付状态（公开接口，不需要登录）
 * 返回是否启用和启用的支付方式
 */
export async function GET() {
  try {
    const config = await db.getPaymentConfig();
    
    // 默认启用两种支付方式
    let enabledMethods: XorpayMethod[] = ['wechat', 'alipay'];
    
    if (config?.enabledMethods && config.enabledMethods.length > 0) {
      enabledMethods = config.enabledMethods;
    } else if (config?.method) {
      // 向后兼容：根据旧的 method 字段推断
      if (config.method === 'xorpay_wechat') {
        enabledMethods = ['wechat'];
      } else if (config.method === 'xorpay_alipay') {
        enabledMethods = ['alipay'];
      }
    }
    
    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        enabled: config?.enabled || false,
        enabledMethods,
      },
    });
  } catch (error) {
    console.error('获取支付状态失败:', error);
    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        enabled: false,
        enabledMethods: [],
      },
    });
  }
}
