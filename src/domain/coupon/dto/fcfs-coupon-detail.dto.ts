export class FcfsCouponDetailResponse {
    id: number; // 선착순 쿠폰의 고유 ID
    couponId: number; // 쿠폰의 원본 ID
    totalQuantity: number; // 전체 발급 가능 수량
    stockQuantity: number; // 남은 수량
    startDate: Date; // 쿠폰 시작 날짜
    endDate: Date; // 쿠폰 종료 날짜
    createdAt: Date; // 쿠폰 생성 날짜
}
