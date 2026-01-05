/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { PaymentConfig, PaymentMethod } from '@/lib/types';

export default function PaymentConfigManager() {
  const [config, setConfig] = useState<PaymentConfig>({
    enabled: false,
    method: 'xorpay_wechat',
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
        setConfig(data.data);
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

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          支付配置
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          配置支付方式，支持微信、支付宝、虎皮椒
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

      {/* 支付方式选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          支付方式
        </label>
        <select
          value={config.method}
          onChange={(e) => setConfig({ ...config, method: e.target.value as PaymentMethod })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          disabled={!config.enabled}
        >
          <option value="xorpay_wechat">虎皮椒 - 微信支付</option>
          <option value="xorpay_alipay">虎皮椒 - 支付宝</option>
          <option value="wechat_official">官方微信支付（暂未实现）</option>
          <option value="alipay_official">官方支付宝（暂未实现）</option>
        </select>
      </div>

      {/* 虎皮椒配置 */}
      {config.enabled && (config.method === 'xorpay_wechat' || config.method === 'xorpay_alipay') && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            虎皮椒配置
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                App ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.xorpay?.appId || ''}
                onChange={(e) => setConfig({
                  ...config,
                  xorpay: { ...config.xorpay, appId: e.target.value, appSecret: config.xorpay?.appSecret || '', notifyUrl: config.xorpay?.notifyUrl || '' }
                })}
                placeholder="请输入虎皮椒 App ID"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                App Secret <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={config.xorpay?.appSecret || ''}
                onChange={(e) => setConfig({
                  ...config,
                  xorpay: { ...config.xorpay, appId: config.xorpay?.appId || '', appSecret: e.target.value, notifyUrl: config.xorpay?.notifyUrl || '' }
                })}
                placeholder="请输入虎皮椒 App Secret"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                回调地址（可选）
              </label>
              <input
                type="text"
                value={config.xorpay?.notifyUrl || ''}
                onChange={(e) => setConfig({
                  ...config,
                  xorpay: { ...config.xorpay, appId: config.xorpay?.appId || '', appSecret: config.xorpay?.appSecret || '', notifyUrl: e.target.value }
                })}
                placeholder="默认: /api/payment/callback/xorpay"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                留空则使用默认回调地址
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 官方微信支付配置 */}
      {config.enabled && config.method === 'wechat_official' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            官方微信支付配置
          </h3>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              官方微信支付暂未实现，请使用虎皮椒支付
            </p>
          </div>
        </div>
      )}

      {/* 官方支付宝配置 */}
      {config.enabled && config.method === 'alipay_official' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            官方支付宝配置
          </h3>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              官方支付宝暂未实现，请使用虎皮椒支付
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
