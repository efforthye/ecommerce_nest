# interfaces

### 특징
- 외부와의 실제 통신을 담당한다.

### 폴더 구조
- controllers: API 엔드포인트 정의 및 도메인 서비스 호출, 실제 HTTP 요청/응답 처리
- dto: 입력 데이터 검증 및 API 요청/응답 데이터 구조 정의 (외부 API 통신 용도)

### 추후 추가될 수 있는 폴더 구조
- middleware: 요청 전처리/후처리 정의
- pipes: 데이터 변환 및 검증
- guards: 인증/권한 검사
- interceptors: 요청/응답 로깅, 에러 처리 추가
- filters: 예외 처리 정의
- decorators: 컨트롤러/메소드 데코레이터 정의
- validators: 입력 데이터 유효성 검사 추가