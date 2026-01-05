import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

/**
 * 生成虎皮椒签名
 * 根据官方文档：https://www.xunhupay.com/doc/api/search.html
 */
function generateHash(data: Record<string, string>, appSecret: string): string {
  const signStr = Object.keys(data)
    .filter(key => key !== 'hash' && data[key] !== '' && data[key] !== null && data[key] !== undefined)
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('&') + appSecret;
  
  return crypto.createHash('md5').update(signStr).digest('hex');
}

/**
 * POST - 查询订单支付状态
 * 调用虎皮椒订单查询接口
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { code: 400, message: '订单ID不能为空' },
        { status: 400 }
      );
    }

    // 获取本地订单
    const order = await db.getOrder(orderId);
    if (!order) {
      return NextResponse.json(
        { code: 404, message: '订单不存在' },
        { status: 404 }
      );
    }

    // 如果订单已完成，直接返回
    if (order.status === 'completed') {
      return NextResponse.json({
        code: 200,
        data: {
          orderId: order.orderId,
          status: 'OD', // 已支付
          localStatus: order.status,
        },
      });
    }

    // 获取支付配置
    const paymentConfig = await db.getPaymentConfig();
    if (!paymentConfig || !paymentConfig.xorpay) {
      return NextResponse.json(
        { code: 400, message: '支付配置不存在' },
        { status: 400 }
      );
    }

    const { appId, appSecret } = paymentConfig.xorpay;
    
    if (!appId || !appSecret) {
      return NextResponse.json(
        { code: 400, message: '支付配置不完整' },
        { status: 400 }
      );
    }

    // 构建查询参数
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const queryData: Record<string, string> = {
      appid: appId,
      out_trade_order: order.orderId,
      time: timestamp,
      nonce_str: nonceStr,
    };

    // 生成签名
    const hash = generateHash(queryData, appSecret);
    queryData.hash = hash;

    // 调用虎皮椒查询接口
    const formData = new URLSearchParams();
    Object.entries(queryData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const response = await fetch('https://api.xunhupay.com/payment/query.html', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const responseText = await response.text();
    console.log('虎皮椒查询API返回:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { code: 400, message: '查询接口返回格式错误' },
        { status: 400 }
      );
    }

    if (result.errcode !== 0) {
      return NextResponse.json({
        code: 200,
        data: {
          orderId: order.orderId,
          status: 'WP', // 待支付
          localStatus: order.status,
          message: result.errmsg,
        },
      });
    }

    // 如果查询到已支付但本地未更新，更新本地订单
    if (result.data?.status === 'OD' && order.status === 'pending') {
      console.log('订单查询发现已支付，但本地未更新，等待回调处理');
    }

    return NextResponse.json({
      code: 200,
      data: {
        orderId: order.orderId,
        status: result.data?.status || 'WP',
        localStatus: order.status,
        openOrderId: result.data?.open_order_id,
      },
    });
  } catch (error: any) {
    console.error('查询订单失败:', error?.message || error);
    return NextResponse.json(
      { code: 500, message: error?.message || '服务器错误' },
      { status: 500 }
    );
  }
}
