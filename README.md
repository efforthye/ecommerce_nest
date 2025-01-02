# 이커머스 서비스 개발
## 프로젝트 개발 계획(Milestone)
![alt text](images/milestone2.png)
- URL: https://github.com/users/efforthye/projects/4/views/4?groupedBy%5BcolumnId%5D=158073164&sortedBy%5Bdirection%5D=desc&sortedBy%5BcolumnId%5D=Labels
<br/><br/>

# 이커머스 시스템 설계
## 목차
1. [ERD Diagram](#erd-diagram)
2. [플로우 차트 (Flow Chart)](#플로우-차트-flow-chart)
    - [플로우 차트 설명](#플로우-차트-설명)
3. [시퀀스 다이어그램](#시퀀스-다이어그램)
    - [쿠폰 관련](#쿠폰-관련)
    - [잔액 관련](#잔액-관련) 
    - [통계 관련](#통계-관련)
    - [장바구니 관련](#장바구니-관련)
    - [상품 관련](#상품-관련)
4. [Mock API 생성](#mock-api-생성)
5. [프로젝트 구조 및 실행 방법](#프로젝트-구조-및-실행-방법)
    - [프로젝트 구조](#프로젝트-구조)
    - [프로젝트 실행 방법](#프로젝트-실행-방법)
<br/><br/>

## ERD Diagram
![alt text](<images/erd.png>)
- Edit URL: https://dbdiagram.io/d/6776be0e5406798ef7207566
### 테이블 설계 상세 정의내역
```
/*
* 유저 관련 테이블
*/
// 유저 테이블 - 회원 기본 정보
Table users {
  id integer [primary key] // 유저 고유 아이디
  name varchar // 유저 이름
  email varchar // 유저 이메일
  // password varchar // 유저 비밀번호 (암호화)
  created_at timestamp // 가입 일시
  updated_at timestamp // 정보 수정 일시
}
// 유저 세션 테이블 - 로그인 세션 관리
Table user_sessions {
  id integer [primary key] // 세션 고유 아이디
  user_id integer // 유저 고유 아이디 (FK)
  access_token varchar // 엑세스 토큰
  refresh_token varchar // 리프레시 토큰
  expired_at timestamp // 세션 만료 시간
  created_at timestamp // 세션 생성 시간
}

/*
* 유저 잔액 관련 테이블
*/
// 유저 잔액 테이블 - 사용자별 잔액 관리
Table user_balance {
  id integer [primary key] // 잔액 정보 고유 아이디
  user_id integer // 유저 고유 아이디 (FK)
  balance decimal // 현재 잔액
  updated_at timestamp // 잔액 갱신 시간
}
// 잔액 변동 이력 테이블 - 모든 잔액 변동 내역 기록
Table balance_history {
  id integer [primary key] // 이력 고유 아이디 
  user_balance_id integer // 유저 잔액 아이디 (FK)
  balance_before decimal // 변동 전 잔액
  amount decimal // 변동 금액 (양수: 충전, 음수: 사용)
  balance_after decimal // 변동 후 잔액
  type varchar [note: '충전/사용/환불 등'] // 변동 유형
  created_at timestamp // 변동 발생 시간
}

/*
* 선착순 쿠폰 관련 테이블
*/
// 쿠폰 테이블 - 쿠폰 기본 정보
Table coupons {
  id integer [primary key] // 쿠폰 고유 아이디
  name varchar // 쿠폰명
  type varchar [note: '금액/비율 유형'] // 할인 유형
  amount decimal [note: '금액/비율 값'] // 할인 금액(정액) 또는 비율(정률)
  min_order_amount decimal [note: '최소 주문 금액'] // 최소 주문 금액
  valid_days integer [note: '발급일로부터 유효기간(일)'] // 유효 기간
  created_at timestamp // 쿠폰 생성 시간
}
// 선착순 쿠폰 테이블 - 선착순 발급 쿠폰 관리
Table fcfs_coupons {
  id integer [primary key] // 선착순 쿠폰 고유 아이디
  coupon_id integer // 쿠폰 고유 아이디 (FK)
  total_quantity integer // 총 발행량
  remaining_quantity integer // 잔여 발행량
  start_date timestamp // 발급 시작 일시
  end_date timestamp // 발급 종료 일시
  created_at timestamp // 등록 일시
}
// 유저별 보유 쿠폰 테이블 - 발급된 쿠폰 관리
Table user_coupons {
  id integer [primary key] // 유저 쿠폰 고유 아이디
  user_id integer // 유저 고유 아이디 (FK)
  coupon_id integer // 쿠폰 고유 아이디 (FK)
  status varchar [note: '사용가능/만료'] // 사용가능 여부
  expiry_date timestamp // 만료 일시
  created_at timestamp // 발급 일시
  used_at timestamp // 사용 일시
}
// 쿠폰 이력 테이블 - 쿠폰 상태 변경 이력 관리
Table coupon_history {
  id integer [primary key] // 이력 고유 아이디
  user_id integer // 유저 고유 아이디 (FK)
  coupon_id integer // 쿠폰 고유 아이디 (FK)
  action varchar [note: '발급/사용/복구/만료'] // 상태 변경 유형
  created_at timestamp // 이력 생성 시간
}

/*
* 상품 관련 테이블
*/
// 상품 테이블 - 상품 기본 정보
Table products {
  id integer [primary key] // 상품 고유 아이디
  name varchar // 상품명
  // images varchar // 상품 이미지
  base_price decimal // 기본 가격
  description text // 상품 설명
  is_active boolean [note: '판매/미판매'] // 판매 상태
  created_at timestamp // 등록 일시
  updated_at timestamp // 수정 일시
}
// 상품 이미지 테이블
Table product_images {
  id integer [primary key] // 상품 이미지 고유 아이디
  product_id integer // 상품 고유 아이디 (FK)
  image_url varchar // 이미지 URL
  is_main_image boolean // 메인 이미지 여부
  order integer // 이미지 정렬 순서
  created_at timestamp // 등록 일시
  updated_at timestamp // 수정 일시
}
// 상품별 옵션 테이블
Table product_options {
  id integer [primary key] // 옵션 고유 아이디
  product_id integer // 상품 고유 아이디 (FK)
  name varchar [note: '옵션명 (색상/사이즈 등)'] // 옵션명
  value varchar [note: '옵션값'] // 옵션 값
  created_at timestamp // 등록 일시
}
// 상품 옵션 조합 테이블 - 옵션 조합별 정보
Table option_combinations {
  id integer [primary key] // 조합 고유 아이디
  product_id integer // 상품 고유 아이디 (FK)
  combination_name varchar [note: '옵션 조합명 (빨강-L 등)'] // 조합명
  option_ids json [note: '옵션 아이디 배열'] // 조합 상세 정보
  additional_price decimal // 옵션 조합별 추가/감소 가격
  created_at timestamp // 등록 일시
}
// 상품 옵션 조합별 재고 관리 테이블
Table product_inventory {
  id integer [primary key] // 재고 정보 고유 아이디
  product_id integer // 상품 고유 아이디 (FK)
  combination_id integer // 옵션 조합 아이디 (FK)
  stock_quantity integer // 재고 수량
  final_price decimal // 최종 판매가
  updated_at timestamp // 재고 수정 일시
}

/*
* 주문 관련 테이블
*/
// 주문 테이블 - 주문 기본 정보
Table orders {
  id integer [primary key] // 주문 고유 아이디
  user_id integer // 유저 고유 아이디 (FK)
  coupon_id integer // 사용된 쿠폰 아이디 (FK)
  total_amount decimal [note: '총 주문금액'] // 총 주문 금액
  discount_amount decimal [note: '할인금액'] // 할인 금액
  final_amount decimal [note: '최종결제금액'] // 최종 결제 금액
  status varchar [note: '결제대기/결제완료/배송중/배송완료등'] // 주문 상태
  ordered_at timestamp // 주문 시간
  paid_at timestamp // 결제 완료 시간
}
// 주문 상품 상세 테이블 - 주문별 상품 정보
Table order_items {
  id integer [primary key] // 주문 상품 고유 아이디
  order_id integer // 주문 아이디 (FK)
  product_id integer // 상품 아이디 (FK)
  inventory_id integer // 재고 아이디 (FK)
  quantity integer // 주문 수량
  unit_price decimal // 단가
  total_price decimal // 총 금액
  created_at timestamp // 등록 시간
}

/*
* 장바구니 관련 테이블
*/
// 장바구니 테이블
Table carts {
  id integer [primary key] // 장바구니 고유 아이디
  user_id integer // 유저 아이디 (FK)
  product_id integer // 상품 아이디 (FK)
  combination_id integer // 옵션 조합 아이디 (FK)
  quantity integer // 수량
  price decimal // 장바구니 아이템 가격
  created_at timestamp // 등록 일시
  updated_at timestamp // 수정 일시
}


/*
* 테이블 FK 연결 사항들
*/
Ref: user_balance.user_id > users.id
Ref: balance_history.user_balance_id > user_balance.id

Ref: fcfs_coupons.coupon_id > coupons.id
Ref: coupon_history.user_id > users.id
Ref: coupon_history.coupon_id > coupons.id
Ref: user_coupons.user_id > users.id
Ref: user_coupons.coupon_id > coupons.id

Ref: product_images.product_id > products.id
Ref: product_options.product_id > products.id
Ref: product_inventory.product_id > products.id
Ref: product_inventory.combination_id > option_combinations.id
Ref: option_combinations.product_id > products.id

Ref: orders.user_id > users.id
Ref: orders.coupon_id > user_coupons.id
Ref: order_items.order_id > orders.id
Ref: order_items.product_id > products.id
Ref: order_items.inventory_id > product_inventory.id

Ref: carts.user_id > users.id
Ref: carts.product_id > products.id
Ref: carts.combination_id > option_combinations.id
```
<br/><br/>

## 플로우 차트 (Flow Chart)
![alt text](images/flowchart6.png)
- Edit URL: https://www.mermaidchart.com/app/projects/61b24fd9-39ad-4447-b860-aa6c8c03bb75/diagrams/4b2115c1-56fc-4503-ad0d-9919d4e41684/version/v0.1/edit

### 플로우 차트 설명
#### 노드 색상 별 설명
- 연녹색: 비로그인 접근 허용 영역
    - 초기 진입 장벽을 낮춰서 구매 결정 전까지 자유로운 탐색이 가능하도록 하였다.
- 보라색: 비관적 베타락 영역
    - 선착순 쿠폰 발급, 사용, 복구 혹은 잔액 변경 등 데이터 정확성이 핵심인 부분들은 동시 처리 중 오류 발생시 치명적으로 작용할 수 있기 때문에 비관적 베타락으로 데이터 일관성을 보장하도록 하였다.
- 분홍색: 비관적 공유락 영역
    - 재고 확인이나 쿠폰 사용가능 여부 확인 등 데이터 조회가 중요한 부분에서는 여러 사용자의 동시 읽기는 허용하되 읽는 도중 데이터 변경을 막기 위해 비관적 공유락을 사용하도록 하였다.

#### 프로세스 설명
- 결제 프로세스
    - 주문 진행 전 재고를 확인한 후 장바구니에 담을 수 있고, 주문 진행중 쿠폰 적용 및 할인 등의 프로세스를 거쳐 주문을 생성하고, 결제 직전 잔액 충분 여부와 재고를 최종적으로 확인하여 결제 실패를 최소화하고 주문 상태 및 결제 상태를 변경할 수 있도록 설계하였다.
- 쿠폰 시스템
    - 선착순 쿠폰의 경우 정확한 수량 관리와 중복 발급 방지를 위해 엄격한 락 전략을 적용하도록 했고, 주문 시 쿠폰을 적용하면 쿠폰 사용 히스토리에 남기고 쿠폰을 차감하도록 했고, 결제 진행 중 결제 실패를 하면 쿠폰 사용 상태를 복구 및 쿠폰 히스토리를 저장할 수 있게 설계했다. 
- 재고 관리
    - 재고 확인 시 공유락을 활용하고 차감 시에는 베타락을 활용하여 동시 주문 상황에서 초과 판매를 방지하고 정확한 재고 관리를 할 수 있도록 설계했다.
- 데이터 분석
    - 주문 완료된 데이터를 실시간으로 전송하여 실시간 순위 반영 및 3일 단위 인기 순위를 집계해 인기 상품을 메인에 노출시킬 수 있도록 설계 했다.
<br/><br/>


## 시퀀스 다이어그램
- Edit URL: https://www.mermaidchart.com/app/projects/61b24fd9-39ad-4447-b860-aa6c8c03bb75/diagrams/f1c3fc0d-60a4-4c0e-b8c4-992ad4f90d77/version/v0.1/edit
### 쿠폰 관련
#### 선착순 쿠폰 조회
![alt text](<images/sequence diagram-1.png>)
#### 선착순 쿠폰 발급
![alt text](<images/sequence diagram-2_1.png>)
#### 유저의 쿠폰 목록 조회
![alt text](<images/sequence diagram-3.png>)
### 잔액 관련
#### 유저 잔액 조회
![alt text](<images/sequence diagram-5.png>)
#### 유저 잔액 충전
![alt text](<images/sequence diagram-4_1.png>)
### 통계 관련
#### 인기 상품 조회
![alt text](<images/sequence diagram-6.png>)
### 장바구니 관련
#### 유저 장바구니 조회
![alt text](<images/sequence diagram-10.png>)
#### 유저 장바구니 상품 추가
![alt text](<images/sequence diagram-11.png>)
#### 유저 장바구니 상품 수량 변경
![alt text](<images/sequence diagram-12.png>)
#### 유저 장바구니 상품 삭제
![alt text](<images/sequence diagram-13.png>)
#### 유저 장바구니 상품 주문
![alt text](<images/sequence diagram-14.png>)
### 상품 관련
#### 상품 정보 조회
![alt text](<images/sequence diagram-7.png>)
#### 상품 주문 생성
![alt text](<images/sequence diagram-8_2.png>)
#### 상품 결제 진행
![alt text](<images/sequence diagram-9.png>)

## Mock API 생성
### Swagger API Docs
![alt text](images/swagger_mock.png)
<br/><br/>

## 프로젝트 구조 및 실행 방법
### 프로젝트 구조
```
src/
├── main.ts
├── app.module.ts
├── common/
│   ├── interceptors/
│   ├── filters/
│   └── decorators/
├── domain/
│   ├── coupon/
│   │   ├── entities/
│   │   │   └── coupon.entity.ts
│   │   └── interfaces/
│   │       └── coupon.repository.interface.ts
│   ├── order/
│   │   ├── entities/
│   │   │   └── order.entity.ts
│   │   └── interfaces/
│   │       └── order.repository.interface.ts
│   └── user/
├── infrastructure/
│   ├── database/
│   │   └── mysql.config.ts
│   └── repositories/
│       ├── coupon.repository.ts  
│       └── order.repository.ts
├── application/
│   ├── facades/
│   │   ├── coupon.facade.ts
│   │   └── order.facade.ts
│   ├── services/
│   │   ├── coupon.service.ts
│   │   └── order.service.ts
│   └── dtos/
└── interface/
    └── controllers/
        ├── coupon.controller.ts
        └── order.controller.ts

```

### 프로젝트 실행 방법
