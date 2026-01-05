/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { InviteCode, MembershipType, DEFAULT_MEMBERSHIP_CONFIG } from '@/lib/types';

export default function InviteCodeManager() {
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [membershipType, setMembershipType] = useState<MembershipType>('monthly');
  const [count, setCount] = useState(1);
  const [expiresIn, setExpiresIn] = useState(0); // 0表示永不过期
  const [note, setNote] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unused' | 'used' | 'expired'>('all');

  // 加载邀请码列表
  const loadInviteCodes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/invite-codes');
      const data = await response.json();
      if (data.code === 200) {
        setInviteCodes(data.data);
      }
    } catch (error) {
      console.error('加载邀请码失败:', error);
      alert('加载邀请码失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInviteCodes();
  }, []);

  // 生成邀请码
  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const response = await fetch('/api/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipType,
          count,
          expiresIn,
          note: note.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (data.code === 200) {
        alert(`成功生成 ${count} 个邀请码`);
        setNote('');
        await loadInviteCodes();
      } else {
        alert(data.message || '生成失败');
      }
    } catch (error) {
      console.error('生成邀请码失败:', error);
      alert('生成邀请码失败');
    } finally {
      setGenerating(false);
    }
  };

  // 删除邀请码
  const handleDelete = async (code: string) => {
    if (!confirm(`确定要删除邀请码 ${code} 吗？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/invite-codes?code=${code}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.code === 200) {
        alert('删除成功');
        await loadInviteCodes();
      } else {
        alert(data.message || '删除失败');
      }
    } catch (error) {
      console.error('删除邀请码失败:', error);
      alert('删除邀请码失败');
    }
  };

  // 格式化时间
  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return '永不过期';
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 过滤邀请码
  const filteredCodes = inviteCodes.filter(code => {
    if (filterStatus === 'all') return true;
    return code.status === filterStatus;
  });

  // 统计信息
  const stats = {
    total: inviteCodes.length,
    unused: inviteCodes.filter(c => c.status === 'unused').length,
    used: inviteCodes.filter(c => c.status === 'used').length,
    expired: inviteCodes.filter(c => c.status === 'expired').length,
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          邀请码管理
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          生成和管理注册邀请码
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="text-sm text-blue-600 dark:text-blue-400">总数</div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="text-sm text-green-600 dark:text-green-400">未使用</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.unused}</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">已使用</div>
          <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats.used}</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <div className="text-sm text-red-600 dark:text-red-400">已过期</div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.expired}</div>
        </div>
      </div>

      {/* 生成邀请码表单 */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          生成新邀请码
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              会员类型
            </label>
            <select
              value={membershipType}
              onChange={(e) => setMembershipType(e.target.value as MembershipType)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="trial">{DEFAULT_MEMBERSHIP_CONFIG.trial.name} - ¥{DEFAULT_MEMBERSHIP_CONFIG.trial.price}</option>
              <option value="monthly">{DEFAULT_MEMBERSHIP_CONFIG.monthly.name} - ¥{DEFAULT_MEMBERSHIP_CONFIG.monthly.price}</option>
              <option value="quarterly">{DEFAULT_MEMBERSHIP_CONFIG.quarterly.name} - ¥{DEFAULT_MEMBERSHIP_CONFIG.quarterly.price}</option>
              <option value="yearly">{DEFAULT_MEMBERSHIP_CONFIG.yearly.name} - ¥{DEFAULT_MEMBERSHIP_CONFIG.yearly.price}</option>
              <option value="lifetime">{DEFAULT_MEMBERSHIP_CONFIG.lifetime.name} - ¥{DEFAULT_MEMBERSHIP_CONFIG.lifetime.price}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              生成数量
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              有效期（天）
            </label>
            <input
              type="number"
              min="0"
              value={expiresIn}
              onChange={(e) => setExpiresIn(Number(e.target.value))}
              placeholder="0=永不过期"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              备注（可选）
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="如：测试用"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
        >
          {generating ? '生成中...' : '生成邀请码'}
        </button>
      </div>

      {/* 邀请码列表 */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            邀请码列表
          </h3>
          <div className="flex gap-2">
            {(['all', 'unused', 'used', 'expired'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {status === 'all' ? '全部' : status === 'unused' ? '未使用' : status === 'used' ? '已使用' : '已过期'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : filteredCodes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无邀请码</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">邀请码</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">会员类型</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">创建时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">过期时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">使用者</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">备注</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredCodes.map((code) => (
                  <tr key={code.code} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                      {code.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {DEFAULT_MEMBERSHIP_CONFIG[code.membershipType]?.name || `未知类型(${code.membershipType})`}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        code.status === 'unused' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                        code.status === 'used' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {code.status === 'unused' ? '未使用' : code.status === 'used' ? '已使用' : '已过期'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(code.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(code.expiresAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {code.usedBy || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {code.note || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {code.status === 'unused' && (
                        <button
                          onClick={() => handleDelete(code.code)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                        >
                          删除
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
