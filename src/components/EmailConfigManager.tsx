/**
 * 邮件配置管理组件
 * 支持 SMTP 和 Resend 两种方式
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Server, Key, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

interface EmailConfig {
  enabled: boolean;
  provider: 'smtp' | 'resend';
  smtp?: SMTPConfig;
  resendApiKey?: string;
  fromEmail: string;
  fromName: string;
}

interface EmailConfigManagerProps {
  onAlert?: (alert: { type: 'success' | 'error'; title: string; message: string }) => void;
}

export default function EmailConfigManager({ onAlert }: EmailConfigManagerProps) {
  const [config, setConfig] = useState<EmailConfig>({
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
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/admin/email');
        const data = await response.json();
        if (data.code === 200 && data.data) {
          setConfig(data.data);
        }
      } catch (error) {
        console.error('加载邮件配置失败:', error);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  // 保存配置
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = await response.json();
      
      if (data.code === 200) {
        onAlert?.({ type: 'success', title: '保存成功', message: '邮件配置已保存' });
      } else {
        onAlert?.({ type: 'error', title: '保存失败', message: data.message || '保存失败' });
      }
    } catch (error) {
      onAlert?.({ type: 'error', title: '保存失败', message: '网络错误，请重试' });
    } finally {
      setSaving(false);
    }
  };

  // 测试配置
  const handleTest = async () => {
    if (!testEmail) {
      onAlert?.({ type: 'error', title: '请填写测试邮箱', message: '请输入接收测试邮件的邮箱地址' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          config,
          testEmail,
        }),
      });
      const data = await response.json();
      
      setTestResult({
        success: data.code === 200,
        message: data.message,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: '网络错误，请重试',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 启用开关 */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-blue-500" />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">启用邮件服务</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              开启后可发送邀请码、订阅更新等邮件通知
            </div>
          </div>
        </div>
        <button
          onClick={() => setConfig({ ...config, enabled: !config.enabled })}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
            config.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              config.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {config.enabled && (
        <>
          {/* 提供商选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              邮件服务提供商
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setConfig({ ...config, provider: 'smtp' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  config.provider === 'smtp'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <Server className={`w-6 h-6 mb-2 ${config.provider === 'smtp' ? 'text-blue-500' : 'text-gray-400'}`} />
                <div className={`font-medium ${config.provider === 'smtp' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  SMTP
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  使用自有邮箱服务器
                </div>
              </button>
              <button
                onClick={() => setConfig({ ...config, provider: 'resend' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  config.provider === 'resend'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <Key className={`w-6 h-6 mb-2 ${config.provider === 'resend' ? 'text-blue-500' : 'text-gray-400'}`} />
                <div className={`font-medium ${config.provider === 'resend' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  Resend
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  使用 Resend API
                </div>
              </button>
            </div>
          </div>

          {/* SMTP 配置 */}
          {config.provider === 'smtp' && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Server className="w-4 h-4" />
                SMTP 配置
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">SMTP 服务器</label>
                  <input
                    type="text"
                    value={config.smtp?.host || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      smtp: { ...config.smtp!, host: e.target.value },
                    })}
                    placeholder="smtp.example.com"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">端口</label>
                  <input
                    type="number"
                    value={config.smtp?.port || 465}
                    onChange={(e) => setConfig({
                      ...config,
                      smtp: { ...config.smtp!, port: parseInt(e.target.value) || 465 },
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">用户名</label>
                  <input
                    type="text"
                    value={config.smtp?.user || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      smtp: { ...config.smtp!, user: e.target.value },
                    })}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">密码</label>
                  <input
                    type="password"
                    value={config.smtp?.pass || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      smtp: { ...config.smtp!, pass: e.target.value },
                    })}
                    placeholder="授权码或密码"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="smtp-secure"
                  checked={config.smtp?.secure ?? true}
                  onChange={(e) => setConfig({
                    ...config,
                    smtp: { ...config.smtp!, secure: e.target.checked },
                  })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="smtp-secure" className="text-sm text-gray-600 dark:text-gray-400">
                  使用 SSL/TLS 加密（端口 465 建议开启）
                </label>
              </div>
            </div>
          )}

          {/* Resend 配置 */}
          {config.provider === 'resend' && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Key className="w-4 h-4" />
                Resend 配置
              </h4>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">API Key</label>
                <input
                  type="password"
                  value={config.resendApiKey || ''}
                  onChange={(e) => setConfig({ ...config, resendApiKey: e.target.value })}
                  placeholder="re_xxxxxxxxxx"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  在 <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">resend.com</a> 获取 API Key
                </p>
              </div>
            </div>
          )}

          {/* 发件人信息 */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">发件人信息</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">发件人名称</label>
                <input
                  type="text"
                  value={config.fromName}
                  onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                  placeholder="LunaTV"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">发件人邮箱</label>
                <input
                  type="email"
                  value={config.fromEmail}
                  onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                  placeholder="noreply@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* 测试发送 */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">测试邮件</h4>
            <div className="flex gap-4">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="输入测试邮箱"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={handleTest}
                disabled={testing}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                发送测试
              </button>
            </div>
            
            {testResult && (
              <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                testResult.success
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
              }`}>
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                {testResult.message}
              </div>
            )}
          </div>
        </>
      )}

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          保存配置
        </button>
      </div>
    </div>
  );
}
