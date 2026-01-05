/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { PaymentConfig, XorpayMethod } from '@/lib/types';

export default function PaymentConfigManager() {
  const [config, setConfig] = useState<PaymentConfig>({
    enabled: false,
    method: 'xorpay_wechat',
    enabledMethods: ['wechat', 'alipay'], // 默认两种都启用
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 加载支付配置
  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payment/config');
      const data = await response.json();
      if (data.code === 200 && data.data) {
        // 向后兼容：如果没有 enabledMethods，根据 method 推断
        const loadedConfig = data.data;
        if (!loadedConfig.enabledMethods) {
          if (loadedConfig.method === 'xorpay_wechat') {
            loadedConfig.enabledMethods = ['wechat'];
          } else if (loadedConfig.method === 'xorpay_alipay') {
            loadedConfig.enabledMethods = ['alipay'];
          } else {
            loadedConfig.enabledMethods = ['wechat', 'alipay'];
          }
        }
        setConfig(loadedConfig);
      }
    } catch (error) {
      console.error('加载支付配置失败:', error);
      alert('加载支付配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // 切换支付方式
  const togglePaymentMethod = (method: XorpayMethod) => {
    const current = config.enabledMethods || [];
    let newMethods: XorpayMethod[];
    
    if (current.includes(method)) {
      // 移除，但至少保留一个
      newMethods = current.filter(m => m !== method);
      if (newMethods.length === 0) {
        alert('至少需要启用一种支付方式');
        return;
      }
    } else {
      // 添加
      newMethods = [...current, method];
    }
    
    setConfig({ ...config, enabledMethods: newMethods });
  };

  // 保存配置
  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/payment/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      if (data.code === 200) {
        alert('支付配置保存成功');
      } else {
        alert(data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存支付配置失败:', error);
      alert('保存支付配置失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  const enabledMethods = config.enabledMethods || [];

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          支付配置
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          配置虎皮椒支付，支持微信和支付宝同时启用
        </p>
      </div>

      {/* 启用开关 */}
      <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            启用支付功能
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            开启后用户可以通过支付购买邀请码
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfig({ ...config, enabled: !config.enabled })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            config.enabled ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ease-in-out ${
              config.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* 支付方式选择 - 复选框 */}
      {config.enabled && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            启用的支付方式
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            可以同时启用微信和支付宝，用户在支付时可以自由选择
          </p>
          <div className="flex gap-6">
            {/* 微信支付 */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enabledMethods.includes('wechat')}
                onChange={() => togglePaymentMethod('wechat')}
                className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
                </svg>
                <span className="font-medium text-gray-900 dark:text-gray-100">微信支付</span>
              </div>
            </label>

            {/* 支付宝 */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enabledMethods.includes('alipay')}
                onChange={() => togglePaymentMethod('alipay')}
                className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.422 20.976c-.097-.002-9.814.007-9.814.007-2.899 0-5.26-.933-5.26-3.617V5.03c0-2.685 2.35-4.863 5.248-4.863h9.85c2.899 0 5.248 2.178 5.248 4.863v9.35c0 2.684-2.373 4.618-5.272 4.596zM20.75 5.03c0-1.61-1.374-2.915-3.064-2.915H7.83c-1.69 0-3.063 1.306-3.063 2.916v12.336c0 1.61 1.373 2.916 3.063 2.916h9.857c1.69 0 3.063-1.306 3.063-2.916V5.03zm-8.91 9.093h5.12c-.15.88-.78 2.32-2.02 3.66-1.67 1.82-3.77 2.96-6.54 2.96-4.11 0-7.43-3.32-7.43-7.43s3.32-7.43 7.43-7.43c2.41 0 4.05.87 5.39 2.16l-2.03 2.03c-.83-.8-1.99-1.49-3.36-1.49-2.54 0-4.59 2.19-4.59 4.73s2.05 4.73 4.59 4.73c2.26 0 3.57-1.47 3.89-2.92H11.84v-2.99z"/>
                </svg>
                <span className="font-medium text-gray-900 dark:text-gray-100">支付宝</span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* 微信支付配置 */}
      {config.enabled && enabledMethods.includes('wechat') && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
            </svg>
            微信支付配置
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                App ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.xorpayWechat?.appId || ''}
                onChange={(e) => setConfig({
                  ...config,
                  xorpayWechat: { appId: e.target.value, appSecret: config.xorpayWechat?.appSecret || '' }
                })}
                placeholder="请输入微信支付 App ID"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                App Secret <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={config.xorpayWechat?.appSecret || ''}
                onChange={(e) => setConfig({
                  ...config,
                  xorpayWechat: { appId: config.xorpayWechat?.appId || '', appSecret: e.target.value }
                })}
                placeholder="请输入微信支付 App Secret"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* 支付宝配置 */}
      {config.enabled && enabledMethods.includes('alipay') && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.422 20.976c-.097-.002-9.814.007-9.814.007-2.899 0-5.26-.933-5.26-3.617V5.03c0-2.685 2.35-4.863 5.248-4.863h9.85c2.899 0 5.248 2.178 5.248 4.863v9.35c0 2.684-2.373 4.618-5.272 4.596zM20.75 5.03c0-1.61-1.374-2.915-3.064-2.915H7.83c-1.69 0-3.063 1.306-3.063 2.916v12.336c0 1.61 1.373 2.916 3.063 2.916h9.857c1.69 0 3.063-1.306 3.063-2.916V5.03zm-8.91 9.093h5.12c-.15.88-.78 2.32-2.02 3.66-1.67 1.82-3.77 2.96-6.54 2.96-4.11 0-7.43-3.32-7.43-7.43s3.32-7.43 7.43-7.43c2.41 0 4.05.87 5.39 2.16l-2.03 2.03c-.83-.8-1.99-1.49-3.36-1.49-2.54 0-4.59 2.19-4.59 4.73s2.05 4.73 4.59 4.73c2.26 0 3.57-1.47 3.89-2.92H11.84v-2.99z"/>
            </svg>
            支付宝配置
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                App ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.xorpayAlipay?.appId || ''}
                onChange={(e) => setConfig({
                  ...config,
                  xorpayAlipay: { appId: e.target.value, appSecret: config.xorpayAlipay?.appSecret || '' }
                })}
                placeholder="请输入支付宝 App ID"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                App Secret <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={config.xorpayAlipay?.appSecret || ''}
                onChange={(e) => setConfig({
                  ...config,
                  xorpayAlipay: { appId: config.xorpayAlipay?.appId || '', appSecret: e.target.value }
                })}
                placeholder="请输入支付宝 App Secret"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* 回调地址配置 */}
      {config.enabled && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            回调地址配置
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              支付回调地址（可选）
            </label>
            <input
              type="text"
              value={config.xorpay?.notifyUrl || ''}
              onChange={(e) => setConfig({
                ...config,
                xorpay: { appId: config.xorpay?.appId || '', appSecret: config.xorpay?.appSecret || '', notifyUrl: e.target.value }
              })}
              placeholder="默认: /api/payment/callback/xorpay"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              留空则使用默认回调地址，微信和支付宝共用此回调地址
            </p>
          </div>
        </div>
      )}

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '保存中...' : '保存配置'}
        </button>
      </div>

      {/* 使用说明 */}
      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          使用说明
        </h3>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>1. 前往 <a href="https://www.xunhupay.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">迅虎支付官网</a> 注册账号</p>
          <p>2. 在迅虎支付后台获取 App ID 和 App Secret</p>
          <p>3. 在迅虎支付后台配置回调地址（默认为：您的域名/api/payment/callback/xorpay）</p>
          <p>4. 填写配置信息后点击保存</p>
          <p>5. 用户可以通过 /purchase 页面购买邀请码</p>
        </div>
      </div>
    </div>
  );
}
