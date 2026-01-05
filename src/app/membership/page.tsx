/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Clock, CheckCircle, XCircle, AlertCircle, ShoppingCart } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { UserMembership, DEFAULT_MEMBERSHIP_CONFIG } from '@/lib/types';
import { isMembershipActive, getMembershipRemainingDays, formatMembershipExpiry } from '@/lib/membership';

export default function MembershipPage() {
  const router = useRouter();
  const [membership, setMembership] = useState<UserMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string>('');

  // 加载会员信息
  useEffect(() => {
    const loadMembership = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/membership');
        const data = await response.json();
        
        if (data.code === 200) {
          setMembership(data.data.membership);
          setUsername(data.data.username);
        } else if (data.code === 401) {
          // 未登录，跳转到登录页
          router.push('/login?redirect=/membership');
        }
      } catch (error) {
        console.error('加载会员信息失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMembership();
  }, [router]);

  const isActive = isMembershipActive(membership);
  const remainingDays = getMembershipRemainingDays(membership);

  if (loading) {
    return (
      <PageLayout activePath="/membership">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePath="/membership">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            会员中心
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {username && `欢迎，${username}`}
          </p>
        </div>

        {/* 会员状态卡片 */}
        <div className={`rounded-2xl p-8 mb-8 ${
          isActive 
            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' 
            : 'bg-gray-100 dark:bg-gray-800'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-full ${
                isActive ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                <Crown className={`w-8 h-8 ${
                  isActive ? 'text-white' : 'text-gray-400'
                }`} />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${
                  isActive ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {isActive ? '会员已激活' : '未激活会员'}
                </h2>
                <p className={`text-sm ${
                  isActive ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {isActive ? '感谢您的支持' : '购买会员享受更多特权'}
                </p>
              </div>
            </div>
            {isActive ? (
              <CheckCircle className="w-12 h-12 text-white" />
            ) : (
              <XCircle className="w-12 h-12 text-gray-400" />
            )}
          </div>

          {/* 会员详情 */}
          {isActive && membership && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-white/80 text-sm mb-1">会员类型</div>
                <div className="text-white text-xl font-bold">
                  {membership.membershipType && DEFAULT_MEMBERSHIP_CONFIG[membership.membershipType]?.name}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-white/80 text-sm mb-1">剩余时间</div>
                <div className="text-white text-xl font-bold">
                  {remainingDays === -1 ? '永久' : `${remainingDays} 天`}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-white/80 text-sm mb-1">到期时间</div>
                <div className="text-white text-xl font-bold">
                  {formatMembershipExpiry(membership)}
                </div>
              </div>
            </div>
          )}

          {/* 未激活提示 */}
          {!isActive && (
            <div className="mt-6">
              <button
                onClick={() => router.push('/purchase')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                立即购买会员
              </button>
            </div>
          )}
        </div>

        {/* 激活信息 */}
        {membership && membership.activatedBy && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-8 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              激活信息
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">激活邀请码</span>
                <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                  {membership.activatedBy}
                </span>
              </div>
              {membership.activatedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">激活时间</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {new Date(membership.activatedAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              )}
              {membership.startDate && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">开始时间</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {new Date(membership.startDate).toLocaleString('zh-CN')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 会员特权 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            会员特权
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">无广告观影</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">享受纯净的观影体验</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">高清画质</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">解锁1080P及以上画质</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">优先访问</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">高峰期优先连接</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">更多片源</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">访问更多独家资源</div>
              </div>
            </div>
          </div>
        </div>

        {/* 续费提示 */}
        {isActive && remainingDays > 0 && remainingDays <= 7 && (
          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <div>
                <div className="font-medium text-yellow-800 dark:text-yellow-200">
                  会员即将到期
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  您的会员将在 {remainingDays} 天后到期，请及时续费以继续享受会员特权
                </div>
              </div>
              <button
                onClick={() => router.push('/purchase')}
                className="ml-auto px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition-colors whitespace-nowrap"
              >
                立即续费
              </button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
