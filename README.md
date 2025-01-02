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
<br/><br/>

## ERD Diagram
![alt text](<images/erd.png>)
- Edit URL: https://dbdiagram.io/d/6776be0e5406798ef7207566

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
- 시간 남으면 추가
### 상품 관련
#### 상품 정보 조회
![alt text](<images/sequence diagram-7.png>)
#### 상품 주문 생성
![alt text](<images/sequence diagram-8_2.png>)
#### 상품 결제 진행
![alt text](<images/sequence diagram-9.png>)