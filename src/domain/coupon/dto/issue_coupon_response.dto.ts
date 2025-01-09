export class IssueCouponResponse {
    id: number; // 발급된 쿠폰의 ID
    userId: number; // 쿠폰을 받은 사용자 ID
    couponId: number; // 발급된 쿠폰의 원본 ID
    status: string; // 쿠폰 상태 (예: AVAILABLE, USED 등)
    expiryDate: Date; // 쿠폰 만료 날짜
    createdAt: Date; // 쿠폰 발급 날짜
    usedAt: Date | null; // 사용된 날짜 (사용하지 않았다면 null)
}
