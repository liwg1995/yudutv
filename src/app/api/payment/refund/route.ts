import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureAdmin } from '@/lib/admin-auth';
import crypto from 'crypto';

/**
 * 生成虎皮椒签名
 * 根据官方文档：https://www.xunhupay.com/doc/api/refund.html
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
 * POST - 发起退款（管理员接口）
 * 调用虎皮椒退款接口
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    try {
      await ensureAdmin(request);
    } catch {
      return NextResponse.json(
        { code: 401, message: '未授权访问' },
        { status: 401 }
      );
    }

    const { orderId, reason } = await request.json();

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

    // 只能退款已完成的订单
    if (order.status !== 'completed') {
      return NextResponse.json(
        { code: 400, message: '只能退款已支付的订单' },
        { status: 400 }
      );
    }

    // 检查是否已退款
    if (order.refundStatus === 'refunded') {
      return NextResponse.json(
        { code: 400, message: '订单已退款' },
        { status: 400 }
      );
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

    // 构建退款参数
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const refundData: Record<string, string> = {
      appid: appId,
      trade_order_id: order.orderId,
      time: timestamp,
      nonce_str: nonceStr,
    };

    // 可选：退款原因
    if (reason) {
      // 退款原因不超过80字符
      refundData.reason = reason.substring(0, 80);
    }

    // 生成签名
    const hash = generateHash(refundData, appSecret);
    refundData.hash = hash;

    // 调用虎皮椒退款接口
    const formData = new URLSearchParams();
    Object.entries(refundData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    console.log('调用虎皮椒退款API:', { orderId: order.orderId, reason });

    const response = await fetch('https://api.xunhupay.com/payment/refund.html', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const responseText = await response.text();
    console.log('虎皮椒退款API返回:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { code: 400, message: '退款接口返回格式错误' },
        { status: 400 }
      );
    }

    if (result.errcode !== 0) {
      return NextResponse.json(
        { code: 400, message: result.errmsg || '退款请求失败' },
        { status: 400 }
      );
    }

    // 退款状态：OD已支付，CD已退款，RD退款中，UD退款失败
    const refundStatus = result.refund_status;
    
    // 更新本地订单状态
    await db.updateOrder(order.orderId, {
      refundStatus: refundStatus === 'CD' ? 'refunded' : 
                    refundStatus === 'RD' ? 'refunding' : 
                    refundStatus === 'UD' ? 'refund_failed' : 'refunding',
      refundAt: Date.now(),
      refundReason: reason || '',
      refundNo: result.out_refund_no,
      refundFee: result.refund_fee,
    });

    // 如果退款成功，禁用相关邀请码
    if (refundStatus === 'CD' && order.inviteCode) {
      const inviteCode = await db.getInviteCode(order.inviteCode);
      if (inviteCode) {
        await db.updateInviteCode(order.inviteCode, {
          status: 'disabled',
          note: `${inviteCode.note || ''} [订单退款已禁用]`,
        });
      }
    }

    return NextResponse.json({
      code: 200,
      message: '退款请求已提交',
      data: {
        orderId: order.orderId,
        refundStatus,
        refundNo: result.out_refund_no,
        refundFee: result.refund_fee,
        refundTime: result.refund_time,
      },
    });
  } catch (error: any) {
    console.error('退款失败:', error?.message || error);
    return NextResponse.json(
      { code: 500, message: error?.message || '服务器错误' },
      { status: 500 }
    );
  }
}
