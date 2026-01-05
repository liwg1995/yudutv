import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

/**
 * POST - 获取支付二维码
 * 根据订单ID和支付方式调用虎皮椒API获取二维码
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId, paymentType } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { code: 400, message: '订单ID不能为空' },
        { status: 400 }
      );
    }

    if (!paymentType || !['wechat', 'alipay'].includes(paymentType)) {
      return NextResponse.json(
        { code: 400, message: '请选择支付方式（wechat 或 alipay）' },
        { status: 400 }
      );
    }

    // 获取订单
    const order = await db.getOrder(orderId);
    if (!order) {
      return NextResponse.json(
        { code: 404, message: '订单不存在' },
        { status: 404 }
      );
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { code: 400, message: '订单状态不正确' },
        { status: 400 }
      );
    }

    // 获取支付配置
    const paymentConfig = await db.getPaymentConfig();
    if (!paymentConfig || !paymentConfig.enabled || !paymentConfig.xorpay) {
      return NextResponse.json(
        { code: 400, message: '支付功能未启用' },
        { status: 400 }
      );
    }

    const { appId, appSecret, notifyUrl } = paymentConfig.xorpay;
    
    // 验证必要的配置
    if (!appId || !appSecret) {
      console.error('虎皮椒配置不完整:', { hasAppId: !!appId, hasAppSecret: !!appSecret });
      return NextResponse.json(
        { code: 400, message: '支付配置不完整，请检查虎皮椒 AppId 和 AppSecret' },
        { status: 400 }
      );
    }
    
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

    // 生成随机字符串和时间戳
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // 构建支付参数
    const signData: Record<string, string> = {
      version: '1.1',
      appid: appId,
      trade_order_id: order.orderId,
      total_fee: order.amount.toString(),
      title: `会员购买`,
      time: timestamp,
      notify_url: notifyUrl || `${siteUrl}/api/payment/callback/xorpay`,
      return_url: `${siteUrl}/purchase?order_id=${order.orderId}&status=success`,
      nonce_str: nonceStr,
      type: paymentType === 'wechat' ? 'wechat' : 'alipay',
    };

    // 生成签名
    const signStr = Object.keys(signData)
      .sort()
      .filter(key => signData[key] !== '')
      .map(key => `${key}=${signData[key]}`)
      .join('&') + appSecret;

    const hash = crypto.createHash('md5').update(signStr).digest('hex');

    // 调用虎皮椒API获取二维码
    const formData = new URLSearchParams();
    Object.entries(signData).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append('hash', hash);

    console.log('调用虎皮椒支付API:', {
      orderId: order.orderId,
      amount: order.amount,
      paymentType,
    });

    const response = await fetch('https://api.xunhupay.com/payment/do.html', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    // 检查响应状态
    if (!response.ok) {
      console.error('虎皮椒API请求失败:', response.status, response.statusText);
      return NextResponse.json(
        { code: 400, message: `支付接口请求失败: ${response.status}` },
        { status: 400 }
      );
    }

    const responseText = await response.text();
    console.log('虎皮椒API原始返回:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('虎皮椒API返回解析失败:', parseError);
      return NextResponse.json(
        { code: 400, message: '支付接口返回格式错误' },
        { status: 400 }
      );
    }
    
    console.log('虎皮椒API返回:', result);

    if (result.errcode !== 0) {
      return NextResponse.json(
        { code: 400, message: result.errmsg || '获取支付二维码失败' },
        { status: 400 }
      );
    }

    // 更新订单支付方式
    await db.updateOrder(order.orderId, {
      paymentMethod: paymentType === 'wechat' ? 'xorpay_wechat' : 'xorpay_alipay',
    });

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        qrcode: result.url_qrcode, // PC端二维码URL
        url: result.url, // 手机端跳转URL
        orderId: order.orderId,
        amount: order.amount,
        paymentType,
      },
    });
  } catch (error: any) {
    console.error('获取支付二维码失败:', error?.message || error);
    return NextResponse.json(
      { code: 500, message: error?.message || '服务器错误' },
      { status: 500 }
    );
  }
}
