/**
 * 邮件配置管理 API
 * GET /api/admin/email - 获取邮件配置
 * POST /api/admin/email - 保存邮件配置
 * POST /api/admin/email/test - 测试邮件配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminRoleFromRequest } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { EmailSettings } from '@/lib/types';
import { testEmailConfig, getEmailConfig } from '@/lib/email';

export const runtime = 'nodejs';

// 获取邮件配置
export async function GET(request: NextRequest) {
  // 验证管理员权限
  const role = await getAdminRoleFromRequest(request);
  if (!role) {
    return NextResponse.json({ code: 403, message: '需要管理员权限' }, { status: 403 });
  }

  try {
    // 获取数据库配置
    let config = await db.getEmailSettings();
    
    // 如果数据库没有配置，检查环境变量
    if (!config) {
      config = await getEmailConfig();
    }
    
    // 隐藏敏感信息
    if (config) {
      const safeConfig = {
        ...config,
        smtp: config.smtp ? {
          ...config.smtp,
          pass: config.smtp.pass ? '******' : '',
        } : undefined,
        resendApiKey: config.resendApiKey ? '******' : undefined,
      };
      return NextResponse.json({ code: 200, data: safeConfig });
    }
    
    // 返回默认配置
    return NextResponse.json({
      code: 200,
      data: {
        enabled: false,
        provider: 'smtp',
        smtp: {
          host: '',
          port: 465,
          secure: true,
          user: '',
          pass: '',
        },
        fromEmail: '',
        fromName: 'LunaTV',
      },
    });
  } catch (error) {
    console.error('获取邮件配置失败:', error);
    return NextResponse.json({ code: 500, message: '获取邮件配置失败' }, { status: 500 });
  }
}

// 保存邮件配置
export async function POST(request: NextRequest) {
  // 验证管理员权限
  const role = await getAdminRoleFromRequest(request);
  if (!role) {
    return NextResponse.json({ code: 403, message: '需要管理员权限' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, config: newConfig, testEmail } = body;

    // 测试邮件配置
    if (action === 'test') {
      if (!testEmail) {
        return NextResponse.json({ code: 400, message: '请填写测试邮箱' }, { status: 400 });
      }

      // 如果密码是 ****** 则从数据库获取真实密码
      let configToTest: EmailSettings = newConfig;
      if (newConfig.smtp?.pass === '******' || newConfig.resendApiKey === '******') {
        const existingConfig = await db.getEmailSettings();
        if (existingConfig) {
          configToTest = {
            ...newConfig,
            smtp: newConfig.smtp && newConfig.smtp.pass === '******' ? {
              ...newConfig.smtp,
              pass: existingConfig.smtp?.pass || '',
            } : newConfig.smtp,
            resendApiKey: newConfig.resendApiKey === '******' ? existingConfig.resendApiKey : newConfig.resendApiKey,
          };
        }
      }

      const result = await testEmailConfig(configToTest, testEmail);
      return NextResponse.json({
        code: result.success ? 200 : 500,
        message: result.message,
      });
    }

    // 保存配置
    const emailSettings: EmailSettings = {
      enabled: Boolean(newConfig.enabled),
      provider: newConfig.provider || 'smtp',
      fromEmail: newConfig.fromEmail || '',
      fromName: newConfig.fromName || 'LunaTV',
    };

    // 处理 SMTP 配置
    if (newConfig.provider === 'smtp' && newConfig.smtp) {
      // 如果密码是 ****** 则保留原来的密码
      let smtpPass = newConfig.smtp.pass;
      if (smtpPass === '******') {
        const existingConfig = await db.getEmailSettings();
        smtpPass = existingConfig?.smtp?.pass || '';
      }
      
      emailSettings.smtp = {
        host: newConfig.smtp.host || '',
        port: parseInt(newConfig.smtp.port) || 465,
        secure: Boolean(newConfig.smtp.secure),
        user: newConfig.smtp.user || '',
        pass: smtpPass,
      };
    }

    // 处理 Resend 配置
    if (newConfig.provider === 'resend') {
      let resendApiKey = newConfig.resendApiKey;
      if (resendApiKey === '******') {
        const existingConfig = await db.getEmailSettings();
        resendApiKey = existingConfig?.resendApiKey || '';
      }
      emailSettings.resendApiKey = resendApiKey;
    }

    await db.setEmailSettings(emailSettings);

    return NextResponse.json({
      code: 200,
      message: '保存成功',
    });
  } catch (error) {
    console.error('保存邮件配置失败:', error);
    return NextResponse.json({ code: 500, message: '保存失败' }, { status: 500 });
  }
}
