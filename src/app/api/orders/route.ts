import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { Order, MembershipType, DEFAULT_MEMBERSHIP_CONFIG } from '@/lib/types';
import crypto from 'crypto';

/**
 * 生成订单ID
 */
function generateOrderId(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD${timestamp}${random}`;
}

/**
 * POST - 创建订单
 */
export async function POST(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    const { membershipType, email } = await request.json();

    // 验证邮箱
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { code: 400, message: '请填写联系邮箱' },
        { status: 400 }
      );
    }

    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { code: 400, message: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 验证会员类型
    if (!['trial', 'monthly', 'quarterly', 'yearly', 'lifetime'].includes(membershipType)) {
      return NextResponse.json(
        { code: 400, message: '无效的会员类型' },
        { status: 400 }
      );
    }

    // 检查库存
    const allCodes = await db.getAllInviteCodes();
    const now = Date.now();
    const availableCodes = allCodes.filter(code => 
      code.membershipType === membershipType &&
      code.status === 'unused' &&
      (code.expiresAt === 0 || code.expiresAt > now)
    );

    if (availableCodes.length === 0) {
      return NextResponse.json(
        { code: 400, message: '该类型邀请码已售罄，请选择其他类型' },
        { status: 400 }
      );
    }

    // 体验会员购买限制检查
    if (membershipType === 'trial') {
      const limitConfig = await db.getPurchaseLimitConfig();
      const emailLower = email.trim().toLowerCase();
      
      // 检查该邮箱已购买的体验会员数量
      const emailPurchaseCount = await db.getTrialPurchaseCountByEmail(emailLower);
      if (limitConfig && emailPurchaseCount >= limitConfig.trialMaxPerEmail) {
        return NextResponse.json(
          { code: 400, message: `每个邮箱最多只能购买 ${limitConfig.trialMaxPerEmail} 次体验会员` },
          { status: 400 }
        );
      }

      // 检查今天已购买的体验会员总数
      const todayPurchaseCount = await db.getTodayTrialPurchaseCount();
      if (limitConfig && todayPurchaseCount >= limitConfig.trialMaxPerDay) {
        return NextResponse.json(
          { code: 400, message: '体验会员今日已售罄，请明天再来' },
          { status: 400 }
        );
      }
    }

    // 获取支付配置
    const paymentConfig = await db.getPaymentConfig();
    if (!paymentConfig || !paymentConfig.enabled) {
      return NextResponse.json(
        { code: 400, message: '支付功能未启用' },
        { status: 400 }
      );
    }

    // 获取会员配置
    const storedConfig = await db.getMembershipConfig();
    const membershipConfig = { ...DEFAULT_MEMBERSHIP_CONFIG, ...storedConfig };
    const config = membershipConfig[membershipType as MembershipType];

    // 检查会员类型是否启用
    if (config.enabled === false) {
      return NextResponse.json(
        { code: 400, message: '该会员类型已下架' },
        { status: 400 }
      );
    }

    // 计算实际价格（有折扣价用折扣价，否则用原价）
    const actualPrice = config.discountPrice && config.discountPrice > 0 && config.discountPrice < config.price
      ? config.discountPrice
      : config.price;

    // 创建订单
    const order: Order = {
      orderId: generateOrderId(),
      userId: authInfo?.username,
      email: email.trim().toLowerCase(),
      membershipType: membershipType as MembershipType,
      amount: actualPrice, // 使用实际价格
      paymentMethod: paymentConfig.method,
      status: 'pending',
      createdAt: Date.now(),
    };

    await db.createOrder(order);

    // 根据支付方式生成支付参数
    let paymentData: any = {};

    if (paymentConfig.method === 'xorpay_wechat' || paymentConfig.method === 'xorpay_alipay') {
      // 虎皮椒支付 - 调用API获取二维码
      const { appId, appSecret, notifyUrl } = paymentConfig.xorpay!;
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
      
      // 生成随机字符串
      const nonceStr = crypto.randomBytes(16).toString('hex');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      
      // 构建支付参数（根据官方文档）
      const signData: Record<string, string> = {
        version: '1.1',
        appid: appId,
        trade_order_id: order.orderId,
        total_fee: order.amount.toString(),
        title: `${config.name}购买`,
        time: timestamp,
        notify_url: notifyUrl || `${siteUrl}/api/payment/callback/xorpay`,
        return_url: `${siteUrl}/purchase?order_id=${order.orderId}&status=success`,
        nonce_str: nonceStr,
      };
      
      // 生成虎皮椒签名（按字母顺序排序，拼接后加上appSecret，再MD5）
      const signStr = Object.keys(signData)
        .sort()
        .filter(key => signData[key] !== '')
        .map(key => `${key}=${signData[key]}`)
        .join('&') + appSecret;
      
      const hash = crypto.createHash('md5').update(signStr).digest('hex');

      // 返回支付参数，让前端选择支付方式后调用
      paymentData = {
        type: 'xorpay',
        appId,
        appSecret,
        baseParams: signData,
        hash,
        gatewayUrl: 'https://api.xunhupay.com/payment/do.html',
      };
    } else if (paymentConfig.method === 'wechat_official') {
      // 微信官方支付（需要实现）
      paymentData = {
        message: '微信官方支付暂未实现，请使用虎皮椒支付',
      };
    } else if (paymentConfig.method === 'alipay_official') {
      // 支付宝官方支付（需要实现）
      paymentData = {
        message: '支付宝官方支付暂未实现，请使用虎皮椒支付',
      };
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        order,
        payment: paymentData,
      },
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    return NextResponse.json(
      { code: 500, message: '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * GET - 获取订单
 * - 指定 orderId 时：查询单个订单（不需要登录）
 * - 未指定 orderId 时：获取用户订单列表（需要登录）
 */
export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    // 查询单个订单（不需要登录，支持未登录用户查询支付结果）
    if (orderId) {
      const order = await db.getOrder(orderId);
      
      if (!order) {
        return NextResponse.json(
          { code: 404, message: '订单不存在' },
          { status: 404 }
        );
      }

      // 如果已登录，检查权限（只能查看自己的订单或管理员查看所有）
      if (authInfo && order.userId && order.userId !== authInfo.username && authInfo.username !== process.env.USERNAME) {
        return NextResponse.json(
          { code: 403, message: '无权限' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        code: 200,
        message: 'success',
        data: order,
      });
    }

    // 获取订单列表需要登录
    if (!authInfo) {
      return NextResponse.json(
        { code: 200, message: 'success', data: [] },
        { status: 200 }
      );
    }

    // 获取订单列表
    const allOrders = await db.getAllOrders();
    
    // 如果是管理员，返回所有订单
    if (authInfo.username === process.env.USERNAME) {
      return NextResponse.json({
        code: 200,
        message: 'success',
        data: allOrders.sort((a, b) => b.createdAt - a.createdAt),
      });
    }

    // 普通用户只返回自己的订单
    const userOrders = allOrders
      .filter(order => order.userId === authInfo.username)
      .sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: userOrders,
    });
  } catch (error) {
    console.error('获取订单失败:', error);
    return NextResponse.json(
      { code: 500, message: '服务器错误' },
      { status: 500 }
    );
  }
}
