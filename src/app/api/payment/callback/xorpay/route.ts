import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { InviteCode, DEFAULT_MEMBERSHIP_CONFIG } from '@/lib/types';
import { sendInviteCodeEmail } from '@/lib/email';
import crypto from 'crypto';

/**
 * 生成随机邀请码（12位，去除易混淆字符）
 */
function generateInviteCode(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * POST - 虎皮椒支付回调
 * 根据官方文档：https://www.xunhupay.com/doc/api/pay.html
 * 回调参数：
 * - trade_order_id: 商户订单号
 * - total_fee: 订单金额
 * - transaction_id: 交易号
 * - open_order_id: 虎皮椒内部订单号
 * - order_title: 订单标题
 * - status: 订单状态 (OD=已支付, CD=已退款, RD=退款中, UD=退款失败)
 * - hash: 签名
 */
export async function POST(request: NextRequest) {
  try {
    // 获取回调数据（虎皮椒使用form表单格式）
    const contentType = request.headers.get('content-type') || '';
    let data: Record<string, string>;
    
    if (contentType.includes('application/json')) {
      data = await request.json();
    } else {
      // form表单格式
      const formData = await request.formData();
      data = {};
      formData.forEach((value, key) => {
        data[key] = value.toString();
      });
    }
    
    console.log('虎皮椒支付回调:', data);

    const {
      trade_order_id, // 商户订单号
      open_order_id, // 虎皮椒内部订单号
      transaction_id, // 交易号
      total_fee, // 订单金额
      status, // 订单状态（OD:已支付，CD:已退款）
      hash, // 签名
    } = data;

    // 获取支付配置验证签名
    const paymentConfig = await db.getPaymentConfig();
    if (!paymentConfig || !paymentConfig.xorpay) {
      console.error('支付配置不存在');
      return new NextResponse('fail', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    // 验证签名（根据官方文档：过滤空值和hash，按字母顺序排序）
    const { appSecret } = paymentConfig.xorpay;
    const signStr = Object.keys(data)
      .filter(key => key !== 'hash' && data[key] !== '' && data[key] !== null && data[key] !== undefined)
      .sort()
      .map(key => `${key}=${data[key]}`)
      .join('&') + appSecret;
    
    const expectedHash = crypto.createHash('md5').update(signStr).digest('hex');
    
    if (hash !== expectedHash) {
      console.error('签名验证失败, 期望:', expectedHash, '实际:', hash);
      return new NextResponse('fail', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    // 获取订单
    const order = await db.getOrder(trade_order_id);
    if (!order) {
      console.error('订单不存在:', trade_order_id);
      return new NextResponse('fail', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    // 如果订单已处理，直接返回成功
    if (order.status === 'completed') {
      return new NextResponse('success', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    // 只处理支付成功的回调（OD = 已支付）
    if (status === 'OD') {
      const now = Date.now();

      // 生成唯一邀请码
      let inviteCodeStr = generateInviteCode();
      let existingCode = await db.getInviteCode(inviteCodeStr);
      
      while (existingCode) {
        inviteCodeStr = generateInviteCode();
        existingCode = await db.getInviteCode(inviteCodeStr);
      }

      // 创建邀请码
      const inviteCode: InviteCode = {
        code: inviteCodeStr,
        membershipType: order.membershipType,
        status: 'unused',
        createdAt: now,
        expiresAt: 0, // 永不过期
        createdBy: 'system',
        note: `订单 ${order.orderId} 自动生成`,
      };

      await db.createInviteCode(inviteCode);

      // 获取站点名称
      const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'LunaTV';
      const membershipConfig = DEFAULT_MEMBERSHIP_CONFIG[order.membershipType];

      // 发送邮件
      let emailSent = false;
      if (order.email) {
        try {
          emailSent = await sendInviteCodeEmail(
            order.email,
            inviteCodeStr,
            order.membershipType,
            membershipConfig.name,
            siteName
          );
          console.log('邮件发送结果:', emailSent ? '成功' : '失败');
        } catch (emailError) {
          console.error('发送邮件失败:', emailError);
        }
      }

      // 更新订单状态
      await db.updateOrder(order.orderId, {
        status: 'completed',
        paidAt: now,
        completedAt: now,
        inviteCode: inviteCodeStr,
        transactionId: transaction_id || open_order_id,
        notifyData: data,
        emailSent,
      });

      console.log('订单支付成功，生成邀请码:', inviteCodeStr, '邮箱:', order.email);
    }

    // 返回 success 表示回调已收到
    return new NextResponse('success', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('处理支付回调失败:', error);
    // 返回200状态码，内容为fail，虎皮椒会重试回调
    return new NextResponse('fail', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/**
 * GET - 查询回调（用于测试）
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    code: 200,
    message: '虎皮椒支付回调接口',
    note: '请使用 POST 方法提交回调数据',
  });
}
