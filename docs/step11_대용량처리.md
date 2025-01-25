# 대용량 처리 및 동시성 제어 전략 분석 및 구현

## 프로젝트 개요
이커머스 시스템에서 발생할 수 있는 동시성 이슈를 식별하고, 각 도메인 특성에 맞는 최적의 해결방안을 적용했습니다.

## 1. 동시성 이슈 및 해결방안

### 1.1. 포인트(잔액) 관리 시스템
**문제점**
- 잔액 충전/사용 동시 요청 시 Race Condition 발생
- 잔액 부족 상태에서 동시 결제 시도

**해결방안: 비관적 락(Pessimistic Lock)**
```typescript
async deductBalance(userId: number, amount: number, tx: Prisma.TransactionClient) {
   const result = await tx.$queryRaw<UserBalance[]>`
       SELECT * FROM UserBalance 
       WHERE userId = ${userId}
       FOR UPDATE`;
       
   if (userBalance.balance.lessThan(amount)) {
       throw new BadRequestException('Insufficient balance');
   }

   return await tx.userBalance.update({
       where: { userId },
       data: { balance: { decrement: amount } }
   });
}
```
**선택 이유**
- 데이터 정합성이 매우 중요한 도메인 특성
- 충돌 빈도가 높지 않아 성능 영향 미미
- 트랜잭션 롤백으로 안전한 복구 가능

**다른 락 전략과의 비교**
- 낙관적 락(Optimistic Lock)을 사용했다면 충돌 빈도가 높은 환경에서는 롤백 비용 증가
- 성능을 고려했을 때 비관적 락이 데이터 정합성을 보장하는데 더 적합

### 1.2. 선착순 쿠폰 시스템
**문제점**
- 동시 요청으로 인한 쿠폰 초과 발급
- 이미 발급받은 사용자의 중복 발급
- 발급 가능 수량 체크 시점 경쟁

**해결방안: 비관적 락 + 유니크 제약조건**
```typescript
async issueFcfsCoupon(userId: number, fcfsCouponId: number) {
    return this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`
            SELECT * FROM FcfsCoupon 
            WHERE id = ? 
            AND stockQuantity > 0
            FOR UPDATE
        `, fcfsCouponId);

        const existingCoupon = await this.findExistingUserCoupon(userId, fcfsCoupon.couponId, tx);
        if (existingCoupon) throw new BadRequestException('이미 발급된 쿠폰입니다.');

        await this.decreaseFcfsCouponStock(fcfsCouponId, tx);
    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });
}
```
**선택 이유**
- 정확한 수량 제어 필요
- 짧은 시간 내 많은 동시 요청 예상
- DB 제약조건으로 중복 발급 이중 방지

**다른 락 전략과의 비교**
- 낙관적 락을 사용하면 초과 발급 가능성이 높아지므로 부적합
- 이벤트 소싱 방식을 활용하면 추적 가능하지만, 구현 복잡도가 증가

### 2. 성능 최적화 전략

### 2.1. 트랜잭션 관리
- 트랜잭션 범위 최소화
- 명시적 타임아웃 설정
- 격리수준 Serializable 적용

**구현 복잡도 및 성능 고려사항**
- 트랜잭션 격리 수준이 높을수록 성능에 영향을 미칠 수 있음
- 필요한 경우 Read Committed 수준으로 성능 최적화

### 2.2. 락 전략
- FOR UPDATE NOWAIT 사용
- 락 획득 순서 일관성 유지
- 불필요한 락 최소화

**다른 락 전략과의 비교**
- NOWAIT를 사용하면 데드락을 방지할 수 있지만, 재시도 로직이 필요할 수 있음
- SKIP LOCKED를 사용하면 실패 요청을 줄일 수 있으나 데이터 정합성이 저하될 수 있음

## 3. 결과 및 개선점

### 3.1. 도입 효과
- 데이터 정합성 확보
- 동시성 이슈 해결
- 안정적인 트랜잭션 처리

### 3.2. 개선 필요사항
- 분산 환경 고려
- 캐시 도입
