# 会员邀请码系统实现方案

## 概述

为 LunaTV 添加完整的会员邀请码购买系统，支持多种支付方式和会员等级管理。

## 已完成

✅ 1. 类型定义添加完成 (`src/lib/types.ts`)

- InviteCode、Order、UserMembership 等核心类型
- PaymentConfig 支付配置
- MembershipConfig 会员配置
- 默认价格配置（月25元、季60元、年199元、永久399元）

## 待实现步骤

### 步骤 1: 扩展数据库层 (高优先级)

需要修改以下文件:

- `src/lib/db.ts` - 在 DbManager 类中添加邀请码相关方法
- `src/lib/redis-base.db.ts` - 实现 Redis 存储的邀请码方法
- `src/lib/upstash.db.ts` - 实现 Upstash 存储的邀请码方法
- `src/lib/kvrocks.db.ts` - 实现 Kvrocks 存储的邀请码方法

关键方法:

```typescript
// 邀请码管理
createInviteCode(code: InviteCode): Promise<void>
getInviteCode(code: string): Promise<InviteCode | null>
getAllInviteCodes(): Promise<InviteCode[]>
updateInviteCode(code: string, updates: Partial<InviteCode>): Promise<void>
deleteInviteCode(code: string): Promise<void>

// 订单管理
createOrder(order: Order): Promise<void>
getOrder(orderId: string): Promise<Order | null>
getAllOrders(): Promise<Order[]>
updateOrder(orderId: string, updates: Partial<Order>): Promise<void>

// 用户会员管理
getUserMembership(username: string): Promise<UserMembership | null>
setUserMembership(membership: UserMembership): Promise<void>

// 配置管理
getPaymentConfig(): Promise<PaymentConfig | null>
setPaymentConfig(config: PaymentConfig): Promise<void>
getMembershipConfig(): Promise<Record<MembershipType, MembershipConfig> | null>
setMembershipConfig(config: Record<MembershipType, MembershipConfig>): Promise<void>
```

### 步骤 2: 创建 API 路由

创建以下 API 文件:

1. **`src/app/api/invite-codes/route.ts`** (已创建，需修复)
   - GET: 获取所有邀请码（管理员）
   - POST: 生成邀请码（管理员）
   - DELETE: 删除邀请码（管理员）

2. **`src/app/api/invite-codes/verify/route.ts`**
   - POST: 验证邀请码有效性

3. **`src/app/api/orders/route.ts`**
   - GET: 获取订单列表
   - POST: 创建新订单

4. **`src/app/api/orders/[orderId]/route.ts`**
   - GET: 获取订单详情
   - PATCH: 更新订单状态

5. **`src/app/api/payment/config/route.ts`**
   - GET: 获取支付配置
   - POST: 保存支付配置（管理员）

6. **`src/app/api/payment/notify/route.ts`**
   - POST: 支付回调接口（处理微信/支付宝/虎皮椒回调）

7. **`src/app/api/membership/route.ts`**
   - GET: 获取当前用户会员信息
   - POST: 激活邀请码

8. **`src/app/api/membership/config/route.ts`**
   - GET: 获取会员配置
   - POST: 保存会员配置（管理员）

### 步骤 3: 修改注册接口

修改 `src/app/api/register/route.ts`:

- 添加邀请码验证逻辑
- 验证邀请码有效性和状态
- 注册成功后标记邀请码为已使用
- 设置用户会员信息

关键逻辑:

```typescript
// 1. 验证邀请码
const inviteCode = await db.getInviteCode(code);
if (!inviteCode || inviteCode.status !== 'unused') {
  return error('邀请码无效或已使用');
}

// 2. 检查是否过期
if (inviteCode.expiresAt > 0 && inviteCode.expiresAt < Date.now()) {
  return error('邀请码已过期');
}

// 3. 注册用户
await db.registerUser(username, password);

// 4. 设置会员信息
const membershipConfig = await db.getMembershipConfig();
const config = membershipConfig[inviteCode.membershipType];
const now = Date.now();
await db.setUserMembership({
  username,
  membershipType: inviteCode.membershipType,
  startDate: now,
  expiryDate:
    config.duration === 0 ? 0 : now + config.duration * 24 * 60 * 60 * 1000,
  isActive: true,
  activatedBy: code,
  activatedAt: now,
});

// 5. 标记邀请码为已使用
await db.updateInviteCode(code, {
  status: 'used',
  usedAt: now,
  usedBy: username,
});
```

### 步骤 4: 创建前端页面

1. **邀请码购买页面** (`src/app/invite-purchase/page.tsx`)
   - 显示所有会员套餐
   - 选择支付方式
   - 生成订单并跳转支付

2. **订单支付页面** (`src/app/order/[orderId]/page.tsx`)
   - 显示订单信息
   - 展示支付二维码（微信/支付宝）
   - 轮询订单状态
   - 支付成功后显示邀请码

3. **后台邀请码管理** (在 `src/app/admin/page.tsx` 中添加)
   - 邀请码列表（状态、类型、使用情况）
   - 批量生成邀请码
   - 设置有效期
   - 删除未使用的邀请码

4. **后台支付配置** (在 `src/app/admin/page.tsx` 中添加)
   - 配置微信支付参数
   - 配置支付宝参数
   - 配置虎皮椒参数
   - 测试支付功能

5. **后台会员配置** (在 `src/app/admin/page.tsx` 中添加)
   - 设置各等级价格
   - 设置会员时长
   - 设置特权描述

6. **修改注册页面** (`src/app/register/page.tsx`)
   - 添加邀请码输入框（必填）
   - 实时验证邀请码
   - 显示邀请码对应的会员类型

### 步骤 5: 实现支付集成

创建支付处理模块 `src/lib/payment/`:

1. **`wechat-official.ts`** - 官方微信支付

   ```typescript
   -createOrder() - // 创建支付订单
     verifyNotify() - // 验证支付回调
     queryOrder(); // 查询订单状态
   ```

2. **`alipay-official.ts`** - 官方支付宝

   ```typescript
   -createOrder() - verifyNotify() - queryOrder();
   ```

3. **`xorpay.ts`** - 虎皮椒支付（同时支持微信和支付宝）
   ```typescript
   -createOrder() - verifyNotify() - queryOrder();
   ```

### 步骤 6: 实现会员权限控制

在需要权限控制的地方添加会员检查:

1. **中间件检查** (`src/middleware.ts`)
   - 检查用户会员状态
   - 验证会员是否过期
   - 限制非会员访问特定功能

2. **API 权限控制**
   - 在受保护的 API 中添加会员检查
   - 返回 403 如果非会员访问

3. **前端权限显示**
   - 显示会员徽章
   - 显示会员到期时间
   - 限制非会员功能入口

## 数据库 Schema (Redis Keys)

```
# 邀请码
invite_code:{code} -> InviteCode JSON

# 所有邀请码列表
invite_codes:all -> Set<code>

# 订单
order:{orderId} -> Order JSON

# 所有订单列表
orders:all -> Set<orderId>

# 用户会员信息
user:{username}:membership -> UserMembership JSON

# 支付配置
payment:config -> PaymentConfig JSON

# 会员配置
membership:config -> Record<MembershipType, MembershipConfig> JSON
```

## 测试计划

1. **邀请码生成测试**
   - 生成单个邀请码
   - 批量生成邀请码
   - 设置有效期
   - 验证唯一性

2. **注册流程测试**
   - 使用有效邀请码注册
   - 使用无效邀请码注册
   - 使用过期邀请码注册
   - 验证会员信息设置

3. **购买流程测试**
   - 选择套餐创建订单
   - 模拟支付回调
   - 验证邀请码生成
   - 验证订单状态更新

4. **会员系统测试**
   - 验证会员权限
   - 测试会员过期
   - 测试永久会员
   - 测试会员续费

5. **支付集成测试**
   - 微信支付测试
   - 支付宝支付测试
   - 虎皮椒支付测试
   - 回调验证测试

## 安全注意事项

1. **邀请码安全**
   - 使用强随机生成器
   - 避免易混淆字符
   - 设置合理有效期

2. **支付安全**
   - 验证回调签名
   - 防止重复通知
   - 金额二次验证
   - 敏感信息加密存储

3. **权限控制**
   - 管理员权限验证
   - 用户会员状态验证
   - API 访问限制

4. **数据验证**
   - 输入参数验证
   - 金额范围检查
   - 订单状态机控制

## 后续优化

1. **功能增强**
   - 邀请奖励机制
   - 会员升级/降级
   - 会员续费提醒
   - 推广统计

2. **性能优化**
   - 邀请码缓存
   - 订单查询索引
   - 会员状态缓存

3. **用户体验**
   - 支付页面美化
   - 订单状态实时推送
   - 会员中心页面
   - 购买历史查询

## 估算工作量

- 数据库层实现: 4-6 小时
- API 路由实现: 6-8 小时
- 支付集成: 8-10 小时
- 前端页面: 10-12 小时
- 测试和调试: 6-8 小时

**总计: 约 34-44 小时**

## 建议实施顺序

1. 先实现数据库层（最基础）
2. 实现邀请码管理 API
3. 修改注册接口添加验证
4. 实现后台管理界面
5. 实现购买流程（先用虚拟支付测试）
6. 最后集成真实支付接口

---

**注意**: 由于涉及支付功能，建议在测试环境充分测试后再上线生产环境。同时需要注意遵守相关支付平台的接入规范和法律法规。
