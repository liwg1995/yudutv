/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingCart, Check, Crown, Clock, Sparkles, AlertCircle, Zap, Mail, Package, Copy, CheckCircle, AlertTriangle, X, QrCode, Smartphone } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { MembershipType, DEFAULT_MEMBERSHIP_CONFIG, Order } from '@/lib/types';

interface StockInfo {
  type: MembershipType;
  name: string;
  price: number;
  duration: number;
  description: string;
  stock: number;
  available: boolean;
}

export default function PurchasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedType, setSelectedType] = useState<MembershipType | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [stockInfo, setStockInfo] = useState<StockInfo[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // 支付成功弹窗
  const [showPaymentModal, setShowPaymentModal] = useState(false); // 支付方式选择弹窗
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null); // 当前订单ID
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null); // 二维码URL
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null); // 手机端支付URL
  const [selectedPayment, setSelectedPayment] = useState<'wechat' | 'alipay' | null>(null);
  const [loadingQrCode, setLoadingQrCode] = useState(false);

  // 检查支付是否启用
  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const response = await fetch('/api/payment/status');
        const data = await response.json();
        if (data.code === 200 && data.data) {
          setPaymentEnabled(data.data.enabled);
        }
      } catch (error) {
        console.error('检查支付状态失败:', error);
      } finally {
        setCheckingPayment(false);
      }
    };

    checkPaymentStatus();
  }, []);

  // 加载库存信息
  const loadStock = async () => {
    try {
      setLoadingStock(true);
      const response = await fetch('/api/invite-codes/stock');
      const data = await response.json();
      if (data.code === 200) {
        setStockInfo(data.data);
        // 默认选中第一个有库存的类型
        const firstAvailable = data.data.find((s: StockInfo) => s.available);
        if (firstAvailable && !selectedType) {
          setSelectedType(firstAvailable.type);
        }
      }
    } catch (error) {
      console.error('加载库存失败:', error);
    } finally {
      setLoadingStock(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, []);

  // 加载用户订单
  const loadOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      if (data.code === 200) {
        setOrders(data.data);
      }
    } catch (error) {
      console.error('加载订单失败:', error);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // 购买处理 - 创建订单后显示支付方式选择
  const handlePurchase = async () => {
    setError(null);

    if (!selectedType) {
      setError('请选择会员套餐');
      return;
    }

    if (!email.trim()) {
      setError('请填写联系邮箱');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('邮箱格式不正确');
      return;
    }

    try {
      setLoading(true);

      // 创建订单
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          membershipType: selectedType,
          email: email.trim().toLowerCase()
        }),
      });

      const data = await response.json();

      if (data.code !== 200) {
        setError(data.message || '创建订单失败');
        return;
      }

      // 保存订单ID，显示支付方式选择弹窗
      setCurrentOrderId(data.data.order.orderId);
      setSelectedPayment(null);
      setQrCodeUrl(null);
      setPaymentUrl(null);
      setShowPaymentModal(true);

      // 刷新库存
      await loadStock();
    } catch (error) {
      console.error('购买失败:', error);
      setError('购买失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取支付二维码
  const getPaymentQrCode = async (paymentType: 'wechat' | 'alipay') => {
    if (!currentOrderId) return;

    setLoadingQrCode(true);
    setSelectedPayment(paymentType);
    setError(null);

    try {
      const response = await fetch('/api/payment/qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: currentOrderId,
          paymentType,
        }),
      });

      const data = await response.json();

      if (data.code !== 200) {
        setError(data.message || '获取支付二维码失败');
        return;
      }

      setQrCodeUrl(data.data.qrcode);
      setPaymentUrl(data.data.url);
    } catch (error) {
      console.error('获取二维码失败:', error);
      setError('获取支付二维码失败，请重试');
    } finally {
      setLoadingQrCode(false);
    }
  };

  // 关闭支付弹窗
  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setCurrentOrderId(null);
    setQrCodeUrl(null);
    setPaymentUrl(null);
    setSelectedPayment(null);
  };

  // 查看订单详情
  const viewOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
    setCopied(false);
  };

  // 复制邀请码
  const copyInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 检查 URL 参数，如果支付成功则获取订单并显示
  useEffect(() => {
    const orderId = searchParams.get('order_id');
    const status = searchParams.get('status');
    if (orderId && status === 'success') {
      // 直接通过订单ID获取订单信息（不需要登录）
      const fetchOrder = async () => {
        try {
          const response = await fetch(`/api/orders?orderId=${orderId}`);
          const data = await response.json();
          if (data.code === 200 && data.data && data.data.status === 'completed') {
            setSelectedOrder(data.data);
            setShowSuccessModal(true);
          }
        } catch (error) {
          console.error('获取订单失败:', error);
        }
      };
      // 延迟执行，等待回调处理完成
      const timer = setTimeout(fetchOrder, 1500);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // 获取库存信息
  const getStockForType = (type: MembershipType): StockInfo | undefined => {
    return stockInfo.find(s => s.type === type);
  };

  // 会员套餐卡片
  const MembershipCard = ({ type }: { type: MembershipType }) => {
    const config = DEFAULT_MEMBERSHIP_CONFIG[type];
    const stock = getStockForType(type);
    const isSelected = selectedType === type;
    const isPopular = type === 'yearly';
    const isAvailable = stock?.available ?? false;
    const stockCount = stock?.stock ?? 0;

    return (
      <div
        onClick={() => isAvailable && setSelectedType(type)}
        className={`relative rounded-2xl p-6 transition-all duration-300 ${
          !isAvailable
            ? 'bg-gray-100 dark:bg-gray-800 opacity-60 cursor-not-allowed'
            : isSelected
            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-2xl scale-105 cursor-pointer'
            : 'bg-white dark:bg-gray-800 hover:shadow-xl hover:scale-102 cursor-pointer'
        }`}
      >
        {isPopular && isAvailable && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
            🔥 最受欢迎
          </div>
        )}

        {/* 库存标签 */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
          isAvailable
            ? isSelected
              ? 'bg-white/20 text-white'
              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          <Package className="w-3 h-3" />
          {isAvailable ? `库存 ${stockCount}` : '已售罄'}
        </div>

        <div className="text-center">
          <div className="mb-4">
            {type === 'trial' && <Zap className={`w-12 h-12 mx-auto ${isSelected ? 'text-yellow-300' : 'text-yellow-500'}`} />}
            {type === 'monthly' && <Clock className={`w-12 h-12 mx-auto ${isSelected ? 'text-blue-200' : 'text-blue-500'}`} />}
            {type === 'quarterly' && <Sparkles className={`w-12 h-12 mx-auto ${isSelected ? 'text-purple-200' : 'text-purple-500'}`} />}
            {type === 'yearly' && <Crown className={`w-12 h-12 mx-auto ${isSelected ? 'text-yellow-200' : 'text-yellow-600'}`} />}
            {type === 'lifetime' && <Crown className={`w-12 h-12 mx-auto ${isSelected ? 'text-yellow-200' : 'text-yellow-400'}`} />}
          </div>

          <h3 className={`text-2xl font-bold mb-2 ${isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
            {config.name}
          </h3>

          <div className="mb-4">
            <span className={`text-4xl font-extrabold ${isSelected ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>
              ¥{config.price}
            </span>
          </div>

          <p className={`text-sm mb-6 ${isSelected ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
            {config.duration === 0 ? '永久有效' : `有效期 ${config.duration} 天`}
          </p>

          {isSelected && isAvailable && (
            <div className="flex items-center justify-center gap-2 text-white">
              <Check className="w-5 h-5" />
              <span className="font-medium">已选择</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (checkingPayment || loadingStock) {
    return (
      <PageLayout activePath="/purchase">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </PageLayout>
    );
  }

  if (!paymentEnabled) {
    return (
      <PageLayout activePath="/purchase">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            支付功能未启用
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            管理员尚未配置支付功能，请联系管理员开通
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            返回首页
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePath="/purchase">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            选择您的会员套餐
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            购买成功后将自动生成邀请码，使用邀请码注册即可激活会员
          </p>
        </div>

        {/* 套餐卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <MembershipCard type="trial" />
          <MembershipCard type="monthly" />
          <MembershipCard type="quarterly" />
          <MembershipCard type="yearly" />
          <MembershipCard type="lifetime" />
        </div>

        {/* 购买表单 */}
        <div className="max-w-md mx-auto mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
              填写购买信息
            </h2>

            {/* 邮箱输入 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                联系邮箱 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入接收邀请码的邮箱"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                支付成功后，邀请码将发送至此邮箱
              </p>
            </div>

            {/* 已选套餐显示 */}
            {selectedType && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">已选套餐</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {DEFAULT_MEMBERSHIP_CONFIG[selectedType].name}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-700 dark:text-gray-300">支付金额</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ¥{DEFAULT_MEMBERSHIP_CONFIG[selectedType].price}
                  </span>
                </div>
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="text-red-600 dark:text-red-400 text-sm">{error}</span>
              </div>
            )}

            {/* 购买按钮 */}
            <button
              onClick={handlePurchase}
              disabled={loading || !selectedType || !email.trim()}
              className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-6 h-6" />
              {loading ? '处理中...' : '立即支付'}
            </button>
          </div>
        </div>

        {/* 我的订单 */}
        {orders.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              我的订单
            </h2>
            <div className="space-y-4">
              {orders.map(order => (
                <div
                  key={order.orderId}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      订单号: {order.orderId}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {DEFAULT_MEMBERSHIP_CONFIG[order.membershipType]?.name || order.membershipType} - ¥{order.amount}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {new Date(order.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === 'completed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {order.status === 'completed' && '已完成'}
                      {order.status === 'pending' && '待支付'}
                      {order.status === 'paid' && '已支付'}
                      {order.status === 'cancelled' && '已取消'}
                      {order.status === 'refunded' && '已退款'}
                    </span>
                    {order.status === 'completed' && (
                      <button
                        onClick={() => viewOrderDetail(order)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                      >
                        查看邀请码
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 订单详情弹窗 */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                订单详情
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">订单号</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{selectedOrder.orderId}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">会员类型</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {DEFAULT_MEMBERSHIP_CONFIG[selectedOrder.membershipType]?.name || selectedOrder.membershipType}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">金额</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">¥{selectedOrder.amount}</div>
                </div>
                {selectedOrder.inviteCode && (
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">邀请码</div>
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                      <div className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400 text-center tracking-wider mb-3">
                        {selectedOrder.inviteCode}
                      </div>
                      <button
                        onClick={() => copyInviteCode(selectedOrder.inviteCode!)}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                          copied
                            ? 'bg-green-500 text-white'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        {copied ? (
                          <><CheckCircle className="w-4 h-4" /> 已复制</>
                        ) : (
                          <><Copy className="w-4 h-4" /> 复制邀请码</>
                        )}
                      </button>
                    </div>
                    {/* 重要警告 */}
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                            重要提示：请复制并保存此邀请码！
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                            关闭此界面后，邀请码将不再显示。请在注册时使用此邀请码。
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {selectedOrder.email && (
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">联系邮箱</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{selectedOrder.email}</div>
                    {selectedOrder.emailSent && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> 邀请码已发送至邮箱
                      </p>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowOrderModal(false)}
                className="mt-6 w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        )}

        {/* 支付成功弹窗 */}
        {showSuccessModal && selectedOrder && selectedOrder.inviteCode && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  支付成功！
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  您已成功购买 {DEFAULT_MEMBERSHIP_CONFIG[selectedOrder.membershipType]?.name || selectedOrder.membershipType}
                </p>
              </div>
              
              <div className="mb-6">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 text-center">您的邀请码</div>
                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                  <div className="text-3xl font-mono font-bold text-blue-600 dark:text-blue-400 text-center tracking-wider mb-4">
                    {selectedOrder.inviteCode}
                  </div>
                  <button
                    onClick={() => copyInviteCode(selectedOrder.inviteCode!)}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {copied ? (
                      <><CheckCircle className="w-5 h-5" /> 已复制到剪贴板</>
                    ) : (
                      <><Copy className="w-5 h-5" /> 点击复制邀请码</>
                    )}
                  </button>
                </div>
              </div>

              {/* 重要警告 */}
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-800 dark:text-amber-300">
                      重要提示
                    </p>
                    <ul className="text-sm text-amber-700 dark:text-amber-400 mt-2 space-y-1">
                      <li>• 请立即复制并保存此邀请码</li>
                      <li>• 关闭此弹窗后邀请码将不再显示</li>
                      <li>• 每个邀请码只能使用一次</li>
                    </ul>
                  </div>
                </div>
              </div>

              {selectedOrder.emailSent && (
                <div className="text-center text-sm text-green-600 dark:text-green-400 mb-4 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  邀请码已发送至 {selectedOrder.email}
                </div>
              )}

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  // 清除 URL 参数
                  router.push('/purchase');
                }}
                className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
              >
                我已复制，关闭此弹窗
              </button>
            </div>
          </div>
        )}

        {/* 支付方式选择弹窗 */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              {/* 头部 */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {qrCodeUrl ? '扫码支付' : '选择支付方式'}
                </h3>
                <button
                  onClick={closePaymentModal}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* 订单信息 */}
              {currentOrderId && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">订单号</div>
                  <div className="font-mono text-gray-900 dark:text-gray-100">{currentOrderId}</div>
                </div>
              )}

              {/* 错误提示 */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* 支付方式选择 */}
              {!qrCodeUrl ? (
                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                    请选择支付方式
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => getPaymentQrCode('wechat')}
                      disabled={loadingQrCode}
                      className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                        selectedPayment === 'wechat' && loadingQrCode
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                    >
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor">
                          <path d="M8.69 12.94c-.35 0-.67-.04-.95-.11l-.12-.03-.98.49.28-.83-.08-.14c-.45-.63-.72-1.38-.72-2.17 0-2.24 2.13-4.06 4.75-4.06 2.3 0 4.38 1.47 4.66 3.47.05.29.07.58.07.87 0 .06 0 .11-.01.17h.01c-.01 2.24-2.13 4.06-4.74 4.06-.37 0-.72-.04-1.06-.11l-.1-.02-1.01.51zM6.19 16.07l.42-1.23-.13-.2c-.67-.93-1.07-2.04-1.07-3.23 0-3.32 3.16-6.01 7.05-6.01 3.45 0 6.49 2.18 6.98 5.14.07.42.11.85.11 1.29 0 3.32-3.16 6.01-7.05 6.01-.56 0-1.1-.06-1.63-.17l-.16-.04-1.45.73.42-1.23-.08-.12c-.13-.19-.25-.39-.36-.59z"/>
                        </svg>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">微信支付</span>
                      {selectedPayment === 'wechat' && loadingQrCode && (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent"></div>
                      )}
                    </button>

                    <button
                      onClick={() => getPaymentQrCode('alipay')}
                      disabled={loadingQrCode}
                      className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                        selectedPayment === 'alipay' && loadingQrCode
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                    >
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor">
                          <path d="M21.5 12c0 5.25-4.25 9.5-9.5 9.5S2.5 17.25 2.5 12 6.75 2.5 12 2.5s9.5 4.25 9.5 9.5zm-5.1 2.64c-.78-.28-1.64-.54-2.54-.77.46-.82.84-1.72 1.12-2.65h-2.37v-.95h2.95v-.57h-2.95v-1.3h-1.7c-.11.16-.24.31-.38.45v.85H7.58v.57h2.95v.95H8.16v.57h5.48c-.22.62-.49 1.21-.82 1.77-1.32-.22-2.58-.34-3.62-.34-1.75 0-2.79.47-2.79 1.37 0 .81.91 1.22 2.45 1.22 1.45 0 2.78-.45 3.92-1.19.63.38 1.19.82 1.64 1.3l1.11-1.11c-.51-.55-1.13-1.05-1.82-1.47z"/>
                        </svg>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">支付宝支付</span>
                      {selectedPayment === 'alipay' && loadingQrCode && (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* 二维码显示 */
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                      {selectedPayment === 'wechat' ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">微信支付</span>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">支付宝支付</span>
                      )}
                    </div>
                  </div>

                  {/* 二维码图片 */}
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-xl shadow-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrCodeUrl}
                        alt="支付二维码"
                        className="w-48 h-48"
                      />
                    </div>
                  </div>

                  <p className="text-center text-gray-600 dark:text-gray-400">
                    请使用{selectedPayment === 'wechat' ? '微信' : '支付宝'}扫码支付
                  </p>

                  {/* 手机端跳转按钮 */}
                  {paymentUrl && (
                    <a
                      href={paymentUrl}
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Smartphone className="w-5 h-5" />
                      手机端点击支付
                    </a>
                  )}

                  {/* 切换支付方式 */}
                  <button
                    onClick={() => {
                      setQrCodeUrl(null);
                      setPaymentUrl(null);
                      setSelectedPayment(null);
                    }}
                    className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    切换支付方式
                  </button>
                </div>
              )}

              {/* 支付提示 */}
              <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  支付完成后，页面将自动刷新显示邀请码。如果长时间未响应，请刷新页面或联系客服。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
