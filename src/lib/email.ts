/**
 * 邮件发送工具
 * 支持 SMTP 和 Resend API 两种方式
 * 配置从数据库读取，支持后台管理
 */

import nodemailer from 'nodemailer';
import { EmailSettings } from './types';
import { db } from './db';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * 获取邮件配置（优先从数据库读取，fallback 到环境变量）
 */
export async function getEmailConfig(): Promise<EmailSettings | null> {
  // 优先从数据库读取配置
  try {
    const dbConfig = await db.getEmailSettings();
    if (dbConfig && dbConfig.enabled) {
      return dbConfig;
    }
  } catch (e) {
    console.log('从数据库读取邮件配置失败，尝试使用环境变量');
  }

  // Fallback 到环境变量（兼容旧配置）
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    return {
      enabled: true,
      provider: 'resend',
      resendApiKey,
      fromEmail: process.env.EMAIL_FROM || 'noreply@example.com',
      fromName: process.env.EMAIL_FROM_NAME || 'LunaTV',
    };
  }

  // 检查 SMTP 环境变量
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpHost && smtpUser && smtpPass) {
    return {
      enabled: true,
      provider: 'smtp',
      smtp: {
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: process.env.SMTP_SECURE !== 'false',
        user: smtpUser,
        pass: smtpPass,
      },
      fromEmail: process.env.EMAIL_FROM || smtpUser,
      fromName: process.env.EMAIL_FROM_NAME || 'LunaTV',
    };
  }

  return null;
}

/**
 * 通过 SMTP 发送邮件
 */
async function sendViaSMTP(config: EmailSettings, params: SendEmailParams): Promise<boolean> {
  if (!config.smtp) {
    console.error('SMTP 配置缺失');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    return true;
  } catch (error) {
    console.error('SMTP 发送失败:', error);
    return false;
  }
}

/**
 * 通过 Resend API 发送邮件
 */
async function sendViaResend(config: EmailSettings, params: SendEmailParams): Promise<boolean> {
  if (!config.resendApiKey) {
    console.error('Resend API Key 缺失');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend API 错误:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Resend 发送失败:', error);
    return false;
  }
}

/**
 * 发送邮件（自动选择发送方式）
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const config = await getEmailConfig();
  
  if (!config || !config.enabled) {
    console.log('邮件服务未启用（请在后台配置邮件设置或配置环境变量）');
    return false;
  }

  if (config.provider === 'smtp') {
    return sendViaSMTP(config, params);
  } else {
    return sendViaResend(config, params);
  }
}

/**
 * 发送邀请码邮件
 */
export async function sendInviteCodeEmail(
  to: string,
  inviteCode: string,
  membershipType: string,
  membershipName: string,
  siteName: string
): Promise<boolean> {
  const subject = `【${siteName}】您的邀请码`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #4F46E5; }
        .header h1 { color: #4F46E5; margin: 0; }
        .content { padding: 30px 0; }
        .code-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0; }
        .code { font-size: 32px; font-weight: bold; color: #fff; letter-spacing: 4px; font-family: monospace; }
        .membership { background: #F3F4F6; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .membership-type { color: #4F46E5; font-weight: bold; }
        .footer { text-align: center; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 14px; }
        .warning { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 ${siteName}</h1>
        </div>
        <div class="content">
          <p>您好！</p>
          <p>感谢您的购买！以下是您的邀请码：</p>
          
          <div class="code-box">
            <div class="code">${inviteCode}</div>
          </div>
          
          <div class="membership">
            <p><strong>会员类型：</strong><span class="membership-type">${membershipName}</span></p>
          </div>
          
          <div class="warning">
            <p>⚠️ <strong>重要提示：</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>每个邀请码只能使用一次</li>
              <li>请妥善保管，不要泄露给他人</li>
              <li>如有问题，请联系客服</li>
            </ul>
          </div>
          
          <p>使用方法：</p>
          <ol>
            <li>访问网站注册页面</li>
            <li>填写用户名和密码</li>
            <li>输入上方邀请码</li>
            <li>完成注册，享受会员权益</li>
          </ol>
        </div>
        <div class="footer">
          <p>此邮件由系统自动发送，请勿直接回复</p>
          <p>&copy; ${new Date().getFullYear()} ${siteName}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
【${siteName}】您的邀请码

感谢您的购买！以下是您的邀请码：

${inviteCode}

会员类型：${membershipName}

重要提示：
- 每个邀请码只能使用一次
- 请妥善保管，不要泄露给他人
- 如有问题，请联系客服

使用方法：
1. 访问网站注册页面
2. 填写用户名和密码
3. 输入上方邀请码
4. 完成注册，享受会员权益

此邮件由系统自动发送，请勿直接回复
  `;

  return sendEmail({ to, subject, html, text });
}

/**
 * 发送影视更新提醒邮件
 */
export async function sendVideoUpdateEmail(
  to: string,
  title: string,
  currentEpisodes: number,
  newEpisodes: number,
  siteName: string,
  siteUrl: string
): Promise<boolean> {
  const subject = `【${siteName}】${title} 更新提醒`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #4F46E5; }
        .header h1 { color: #4F46E5; margin: 0; font-size: 24px; }
        .content { padding: 30px 0; }
        .update-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0; color: #fff; }
        .update-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .update-info { font-size: 18px; }
        .button { display: inline-block; background: #4F46E5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
        .footer { text-align: center; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📺 ${siteName}</h1>
        </div>
        <div class="content">
          <p>您好！</p>
          <p>您订阅的影视有新内容更新：</p>
          
          <div class="update-box">
            <div class="update-title">${title}</div>
            <div class="update-info">更新至第 ${newEpisodes} 集</div>
            <div class="update-info" style="font-size: 14px; margin-top: 10px;">（上次：第 ${currentEpisodes} 集）</div>
          </div>
          
          <p style="text-align: center;">
            <a href="${siteUrl}" class="button">立即观看</a>
          </p>
        </div>
        <div class="footer">
          <p>此邮件由系统自动发送，请勿直接回复</p>
          <p>如需取消订阅，请在网站个人中心管理您的订阅</p>
          <p>&copy; ${new Date().getFullYear()} ${siteName}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
【${siteName}】${title} 更新提醒

您好！

您订阅的影视有新内容更新：

${title}
更新至第 ${newEpisodes} 集（上次：第 ${currentEpisodes} 集）

立即观看：${siteUrl}

此邮件由系统自动发送，请勿直接回复
如需取消订阅，请在网站个人中心管理您的订阅
  `;

  return sendEmail({ to, subject, html, text });
}

/**
 * 测试邮件配置
 */
export async function testEmailConfig(config: EmailSettings, testEmail: string): Promise<{ success: boolean; message: string }> {
  try {
    const params: SendEmailParams = {
      to: testEmail,
      subject: '邮件配置测试',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>邮件配置测试</h2>
          <p>如果您收到此邮件，说明邮件配置正确！</p>
          <p>配置详情：</p>
          <ul>
            <li>提供商：${config.provider === 'smtp' ? 'SMTP' : 'Resend'}</li>
            <li>发件人：${config.fromName} &lt;${config.fromEmail}&gt;</li>
            ${config.provider === 'smtp' && config.smtp ? `<li>SMTP服务器：${config.smtp.host}:${config.smtp.port}</li>` : ''}
          </ul>
        </div>
      `,
      text: `邮件配置测试

如果您收到此邮件，说明邮件配置正确！

提供商：${config.provider === 'smtp' ? 'SMTP' : 'Resend'}
发件人：${config.fromName} <${config.fromEmail}>`,
    };

    let success = false;
    if (config.provider === 'smtp') {
      success = await sendViaSMTP(config, params);
    } else {
      success = await sendViaResend(config, params);
    }

    return {
      success,
      message: success ? '测试邮件发送成功' : '测试邮件发送失败',
    };
  } catch (error) {
    return {
      success: false,
      message: `发送失败：${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}
