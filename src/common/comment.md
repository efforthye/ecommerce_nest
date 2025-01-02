# common

### 특징
- 여러 모듈에서 공통으로 사용하는 유틸리티를 포함시킨다.

### 폴더 구조
- interceptor: 로깅, 인증, 에러 처리, 요청 검증 등 요청/응답 처리 전후에 실행되는 공통 로직을 정의한다. (요청/응답 전후 로직 담당)

### 추후 추가될 수 있는 폴더 구조
- utils: 공통 유틸리티 함수들
- constants: 상수값 정의
- types: 공통 타입 정의
- filters: 요청/응답 필터
- decorators: 공통 데코레이터
- middleware: 공통 미들웨어
- exceptions: 예외 처리 클래스
- guards: 인증/인가 가드