import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { PaymentConfig } from '@/lib/types';

/**
 * GET - 获取支付配置（仅管理员）
 */
export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    
    // 验证管理员权限
    if (!authInfo || authInfo.username !== process.env.USERNAME) {
      return NextResponse.json(
        { code: 403, message: '无权限' },
        { status: 403 }
      );
    }

    const config = await db.getPaymentConfig();
    
    return NextResponse.json({
      code: 200,
      message: 'success',
      data: config || {
        enabled: false,
        method: 'xorpay_wechat' as const,
      },
    });
  } catch (error) {
    console.error('获取支付配置失败:', error);
    return NextResponse.json(
      { code: 500, message: '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * POST - 更新支付配置（仅管理员）
 */
export async function POST(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    
    // 验证管理员权限
    if (!authInfo || authInfo.username !== process.env.USERNAME) {
      return NextResponse.json(
        { code: 403, message: '无权限' },
        { status: 403 }
      );
    }

    const config: PaymentConfig = await request.json();

    // 基本验证
    if (typeof config.enabled !== 'boolean') {
      return NextResponse.json(
        { code: 400, message: 'enabled 字段必须是布尔值' },
        { status: 400 }
      );
    }

    // 根据支付方式验证必填字段
    if (config.enabled) {
      if (config.method === 'wechat_official') {
        if (!config.wechatOfficial?.appId || !config.wechatOfficial?.mchId || !config.wechatOfficial?.apiKey) {
          return NextResponse.json(
            { code: 400, message: '微信官方支付配置不完整' },
            { status: 400 }
          );
        }
      } else if (config.method === 'alipay_official') {
        if (!config.alipayOfficial?.appId || !config.alipayOfficial?.privateKey || !config.alipayOfficial?.publicKey) {
          return NextResponse.json(
            { code: 400, message: '支付宝官方支付配置不完整' },
            { status: 400 }
          );
        }
      } else if (config.method === 'xorpay_wechat' || config.method === 'xorpay_alipay') {
        if (!config.xorpay?.appId || !config.xorpay?.appSecret) {
          return NextResponse.json(
            { code: 400, message: '虎皮椒支付配置不完整' },
            { status: 400 }
          );
        }
      }
    }

    // 保存配置
    await db.setPaymentConfig(config);

    return NextResponse.json({
      code: 200,
      message: '支付配置更新成功',
    });
  } catch (error) {
    console.error('更新支付配置失败:', error);
    return NextResponse.json(
      { code: 500, message: '服务器错误' },
      { status: 500 }
    );
  }
}
