'use client';

import { useState, useEffect } from 'react';
import { MembershipConfig, MembershipType, DEFAULT_MEMBERSHIP_CONFIG } from '@/lib/types';

interface MembershipConfigManagerProps {
  onSave?: () => void;
}

export default function MembershipConfigManager({ onSave }: MembershipConfigManagerProps) {
  const [config, setConfig] = useState<Record<MembershipType, MembershipConfig>>(DEFAULT_MEMBERSHIP_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 会员类型顺序
  const membershipOrder: MembershipType[] = ['trial', 'monthly', 'quarterly', 'yearly', 'lifetime'];

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/membership/config');
      const data = await res.json();
      
      if (data.code === 200 && data.data) {
        // 合并默认配置和存储的配置
        setConfig({ ...DEFAULT_MEMBERSHIP_CONFIG, ...data.data });
      }
    } catch (error) {
      console.error('加载会员配置失败:', error);
      setMessage({ type: 'error', text: '加载配置失败' });
    } finally {
      setLoading(false);
    }
  };

  // 更新单个会员配置
  const updateMemberConfig = (type: MembershipType, field: keyof MembershipConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  // 计算实际价格（有折扣价用折扣价，否则用原价）
  const getActualPrice = (memberConfig: MembershipConfig): number => {
    if (memberConfig.discountPrice !== undefined && memberConfig.discountPrice > 0) {
      return memberConfig.discountPrice;
    }
    return memberConfig.price;
  };

  // 根据折扣百分比自动计算折扣价
  const calculateDiscountPrice = (price: number, discount: number): number => {
    if (discount <= 0 || discount >= 100) return price;
    return Math.round(price * (100 - discount)) / 100;
  };

  // 处理折扣变化，自动计算折扣价
  const handleDiscountChange = (type: MembershipType, discount: number) => {
    const memberConfig = config[type];
    const discountPrice = calculateDiscountPrice(memberConfig.price, discount);
    
    setConfig(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        discount,
        discountPrice: discount > 0 && discount < 100 ? discountPrice : undefined,
      },
    }));
  };

  // 清除折扣
  const clearDiscount = (type: MembershipType) => {
    setConfig(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        discount: undefined,
        discountPrice: undefined,
      },
    }));
  };

  // 保存配置
  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const res = await fetch('/api/membership/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      const data = await res.json();

      if (data.code === 200) {
        setMessage({ type: 'success', text: '保存成功' });
        onSave?.();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.message || '保存失败' });
      }
    } catch (error) {
      console.error('保存会员配置失败:', error);
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 消息提示 */}
      {message && (
        <div className={`p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* 会员配置列表 */}
      <div className="space-y-4">
        {membershipOrder.map((type) => {
          const memberConfig = config[type];
          const actualPrice = getActualPrice(memberConfig);
          const hasDiscount = memberConfig.discountPrice !== undefined && memberConfig.discountPrice > 0 && memberConfig.discountPrice < memberConfig.price;
          
          return (
            <div 
              key={type}
              className={`p-4 rounded-lg border transition-colors ${
                memberConfig.enabled === false 
                  ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 opacity-60' 
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* 头部：名称和启用开关 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {memberConfig.name}
                  </h4>
                  {hasDiscount && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                      {memberConfig.discount}% OFF
                    </span>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-gray-600 dark:text-gray-400">启用</span>
                  <input
                    type="checkbox"
                    checked={memberConfig.enabled !== false}
                    onChange={(e) => updateMemberConfig(type, 'enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              </div>

              {/* 配置表单 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 显示名称 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    显示名称
                  </label>
                  <input
                    type="text"
                    value={memberConfig.name}
                    onChange={(e) => updateMemberConfig(type, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="会员名称"
                  />
                </div>

                {/* 时长 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    时长（天）
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={memberConfig.duration}
                    onChange={(e) => updateMemberConfig(type, 'duration', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="0表示永久"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 表示永久</p>
                </div>

                {/* 原价 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    原价（元）
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={memberConfig.price}
                    onChange={(e) => {
                      const price = Number(e.target.value);
                      updateMemberConfig(type, 'price', price);
                      // 如果有折扣，重新计算折扣价
                      if (memberConfig.discount && memberConfig.discount > 0) {
                        const discountPrice = calculateDiscountPrice(price, memberConfig.discount);
                        updateMemberConfig(type, 'discountPrice', discountPrice);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="原价"
                  />
                </div>

                {/* 折扣设置 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    折扣（%）
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={memberConfig.discount || ''}
                      onChange={(e) => handleDiscountChange(type, Number(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="0-99"
                    />
                    {memberConfig.discount && memberConfig.discount > 0 && (
                      <button
                        onClick={() => clearDiscount(type)}
                        className="px-2 py-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                        title="清除折扣"
                      >
                        清除
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 折扣价显示 */}
              {hasDiscount && (
                <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">原价：</span>
                      <span className="text-sm line-through text-gray-500">¥{memberConfig.price}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">折扣价：</span>
                      <span className="text-lg font-bold text-red-600 dark:text-red-400">¥{memberConfig.discountPrice}</span>
                    </div>
                    <div>
                      <span className="text-sm text-green-600 dark:text-green-400">
                        节省 ¥{(memberConfig.price - (memberConfig.discountPrice || memberConfig.price)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 描述 */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  描述
                </label>
                <input
                  type="text"
                  value={memberConfig.description || ''}
                  onChange={(e) => updateMemberConfig(type, 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="会员描述"
                />
              </div>

              {/* 实际售价 */}
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">实际售价：</span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  ¥{actualPrice.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-2 rounded-lg font-medium text-white transition-colors ${
            saving 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {saving ? '保存中...' : '保存配置'}
        </button>
      </div>

      {/* 说明 */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">使用说明</h5>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• <strong>原价</strong>：会员的标准价格</li>
          <li>• <strong>折扣</strong>：设置折扣百分比（如 20 表示打 8 折），会自动计算折扣价</li>
          <li>• <strong>启用</strong>：关闭后该会员类型将不在购买页面显示</li>
          <li>• <strong>时长</strong>：会员有效期，0 表示永久会员</li>
          <li>• 用户购买时将按实际售价（折扣价或原价）计算</li>
        </ul>
      </div>
    </div>
  );
}
