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
    if (!paymentConfig || !paymentConfig.enabled) {
      return NextResponse.json(
        { code: 400, message: '支付功能未启用' },
        { status: 400 }
      );
    }

    // 根据支付类型获取对应的配置
    let appId: string | undefined;
    let appSecret: string | undefined;
    
    if (paymentType === 'wechat') {
      // 优先使用独立的微信配置
      if (paymentConfig.xorpayWechat?.appId && paymentConfig.xorpayWechat?.appSecret) {
        appId = paymentConfig.xorpayWechat.appId;
        appSecret = paymentConfig.xorpayWechat.appSecret;
      } else if (paymentConfig.xorpay?.appId && paymentConfig.xorpay?.appSecret) {
        // 向后兼容：使用通用配置
        appId = paymentConfig.xorpay.appId;
        appSecret = paymentConfig.xorpay.appSecret;
      }
    } else {
      // 优先使用独立的支付宝配置
      if (paymentConfig.xorpayAlipay?.appId && paymentConfig.xorpayAlipay?.appSecret) {
        appId = paymentConfig.xorpayAlipay.appId;
        appSecret = paymentConfig.xorpayAlipay.appSecret;
      } else if (paymentConfig.xorpay?.appId && paymentConfig.xorpay?.appSecret) {
        // 向后兼容：使用通用配置
        appId = paymentConfig.xorpay.appId;
        appSecret = paymentConfig.xorpay.appSecret;
      }
    }

    // 回调地址使用通用配置
    const notifyUrl = paymentConfig.xorpay?.notifyUrl || '';
    
    // 验证必要的配置
    if (!appId || !appSecret) {
      console.error('虎皮椒配置不完整:', { 
        paymentType,
        hasAppId: !!appId, 
        hasAppSecret: !!appSecret,
        hasWechatConfig: !!paymentConfig.xorpayWechat,
        hasAlipayConfig: !!paymentConfig.xorpayAlipay,
        hasGeneralConfig: !!paymentConfig.xorpay,
      });
      return NextResponse.json(
        { code: 400, message: `${paymentType === 'wechat' ? '微信' : '支付宝'}支付配置不完整，请检查 AppId 和 AppSecret` },
        { status: 400 }
      );
    }
    
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

    // 生成随机字符串和时间戳
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // 构建支付参数
    // title 不能超过127字符，不能有表情和%
    const orderTitle = `会员购买`.substring(0, 42);
    
    const signData: Record<string, string> = {
      version: '1.1',
      appid: appId,
      trade_order_id: order.orderId,
      total_fee: order.amount.toFixed(2), // 保留两位小数
      title: orderTitle,
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
      appId: appId.substring(0, 4) + '****', // 脱敏打印
    });

    // 虎皮椒 API 地址（主要 + 备用）
    const apiUrls = [
      'https://api.xunhupay.com/payment/do.html',
      'https://api.dpweixin.com/payment/do.html', // 备用地址
    ];

    let response;
    let lastError: Error | null = null;

    // 尝试所有 API 地址
    for (const apiUrl of apiUrls) {
      try {
        console.log('尝试连接虎皮椒API:', apiUrl);
        
        // 使用 AbortController 设置超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
        
        // 打印请求信息
        console.log('请求参数:', {
          url: apiUrl,
          method: 'POST',
          bodyLength: formData.toString().length,
        });
        
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'LunaTV/1.0',
            'Accept': '*/*',
          },
          body: formData.toString(),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // 请求成功，跳出循环
        console.log('虎皮椒API连接成功:', apiUrl, 'status:', response.status);
        break;
      } catch (fetchError: any) {
        lastError = fetchError;
        // 详细打印错误信息
        console.error(`虎皮椒API连接失败 (${apiUrl}):`, {
          name: fetchError?.name,
          message: fetchError?.message,
          code: fetchError?.code,
          cause: fetchError?.cause ? {
            name: fetchError.cause?.name,
            message: fetchError.cause?.message,
            code: fetchError.cause?.code,
            errno: fetchError.cause?.errno,
            syscall: fetchError.cause?.syscall,
            hostname: fetchError.cause?.hostname,
          } : undefined,
          stack: fetchError?.stack?.split('\n').slice(0, 3).join('\n'),
        });
        // 继续尝试下一个地址
        response = undefined;
      }
    }

    // 所有地址都失败
    if (!response) {
      const errorMsg = lastError?.name === 'AbortError' 
        ? '支付接口请求超时，请稍后重试'
        : `无法连接支付接口: ${lastError?.message || 'fetch failed'}`;
      
      console.error('所有虎皮椒API地址均失败:', {
        error: lastError?.message,
        name: lastError?.name,
      });
      
      return NextResponse.json(
        { code: 500, message: errorMsg },
        { status: 500 }
      );
    }

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
