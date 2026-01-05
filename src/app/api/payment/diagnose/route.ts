import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '@/lib/admin-auth';
import dns from 'dns';
import { promisify } from 'util';

const dnsResolve = promisify(dns.resolve);

/**
 * GET - 诊断支付接口网络连接
 * 仅管理员可访问
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    await ensureAdmin(request);

    const results: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };

    // 测试 DNS 解析
    const domains = ['api.xunhupay.com', 'api.dpweixin.com'];
    results.dns = {};
    
    for (const domain of domains) {
      try {
        const addresses = await dnsResolve(domain);
        (results.dns as Record<string, unknown>)[domain] = {
          success: true,
          addresses,
        };
      } catch (error: unknown) {
        const err = error as Error & { code?: string };
        (results.dns as Record<string, unknown>)[domain] = {
          success: false,
          error: err.message,
          code: err.code,
        };
      }
    }

    // 测试 HTTPS 连接
    const testUrls = [
      'https://api.xunhupay.com/payment/do.html',
      'https://api.dpweixin.com/payment/do.html',
    ];
    
    results.https = {};
    
    for (const url of testUrls) {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, {
          method: 'GET', // 使用 GET 测试连接
          headers: {
            'User-Agent': 'LunaTV/1.0 (Connection Test)',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        (results.https as Record<string, unknown>)[url] = {
          success: true,
          status: response.status,
          statusText: response.statusText,
          duration: Date.now() - startTime,
        };
      } catch (error: unknown) {
        const err = error as Error & { code?: string; cause?: { code?: string; errno?: number; syscall?: string } };
        (results.https as Record<string, unknown>)[url] = {
          success: false,
          error: err.message,
          name: err.name,
          code: err.code,
          cause: err.cause ? {
            code: err.cause.code,
            errno: err.cause.errno,
            syscall: err.cause.syscall,
          } : undefined,
          duration: Date.now() - startTime,
        };
      }
    }

    // 测试简单的外网连接
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://httpbin.org/ip', {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        results.externalIp = data.origin;
      }
    } catch (error: unknown) {
      const err = error as Error;
      results.externalIp = `Error: ${err.message}`;
    }

    return NextResponse.json({
      code: 200,
      message: 'Diagnosis complete',
      data: results,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('诊断失败:', err);
    return NextResponse.json(
      { code: 500, message: err.message || '诊断失败' },
      { status: 500 }
    );
  }
}
