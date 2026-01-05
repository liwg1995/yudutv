import { UserMembership } from './types';

/**
 * 检查用户会员是否有效
 */
export function isMembershipActive(membership: UserMembership | null): boolean {
  if (!membership || !membership.isActive) {
    return false;
  }

  // 永久会员（expiryDate = 0）
  if (membership.expiryDate === 0) {
    return true;
  }

  // 检查是否过期
  const now = Date.now();
  return membership.expiryDate ? membership.expiryDate > now : false;
}

/**
 * 获取会员剩余天数
 */
export function getMembershipRemainingDays(membership: UserMembership | null): number {
  if (!membership || !membership.isActive) {
    return 0;
  }

  // 永久会员
  if (membership.expiryDate === 0) {
    return -1; // -1 表示永久
  }

  if (!membership.expiryDate) {
    return 0;
  }

  const now = Date.now();
  const remainingMs = membership.expiryDate - now;
  
  if (remainingMs <= 0) {
    return 0;
  }

  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}

/**
 * 格式化会员到期时间
 */
export function formatMembershipExpiry(membership: UserMembership | null): string {
  if (!membership || !membership.isActive) {
    return '未激活';
  }

  if (membership.expiryDate === 0) {
    return '永久有效';
  }

  if (!membership.expiryDate) {
    return '未知';
  }

  const remainingDays = getMembershipRemainingDays(membership);
  
  if (remainingDays <= 0) {
    return '已过期';
  }

  const expiryDate = new Date(membership.expiryDate);
  return `${expiryDate.toLocaleDateString('zh-CN')} (剩余${remainingDays}天)`;
}
