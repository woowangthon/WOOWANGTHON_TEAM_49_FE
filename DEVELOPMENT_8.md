# 8차 개발 진행 기록 (미완료)

## 적용 계약
API_ENDPOINTS의 POST 201, GET/PATCH 200, DELETE 204 적용.
백엔드_API_명세_v1.pdf의 거래/현금/배분 절 확인: 같은 근무지 배분,
명시적 0 허용, 음수 금지, 전체 배분 원금 초과 금지,
DUPLICATE_ALLOCATION, ALLOCATION_EXCEEDS_TRANSACTION,
TRANSACTION_HAS_ALLOCATIONS 및 confirm=true 삭제 정책.
백엔드 접속/OpenAPI 조회 및 commit/push는 수행하지 않음.

## 변경 파일
src/features/payments/{schemas,api,queries,payment-screen,payments.test}.ts(x)
src/features/{cases,workplaces}/components/*-detail-screen.tsx
src/features/case-inputs/queries.ts
src/mocks/shared/{input-handlers,payment-handlers}.ts
README.md, DEVELOPMENT_8.md

## 구현
근무지 상세 거래 목록/상세 조회/등록/수정/기본 삭제.
Case 상세의 동일 근무지 거래 배분 생성/수정/해제.
페이지 단위 거래 조회, 계좌/현금 구분, 서버 전체 배분/잔여 표시.
수기 DEPOSIT을 동일 Mock 거래 저장소로 생성.
배분 충돌, 원거래 감액/삭제 충돌 및 확인 삭제 Mock.
세션 Query 캐시 무효화, 변경 성공/실패 표시.

## 미확정 계약
P0에는 중복 후보의 세부 DTO가 없음. 후보 구조/선택 보관 정책 미확정.
거래 PATCH의 전체 허용 필드 및 confirmationStatus enum 목록 생략.
배분 PATCH/DELETE의 상세 버전 전달 규약과 거래 변경 응답 메타 생략.
DB PDF는 상세 테이블 대신 제목 자료임(기존 조사와 동일).

## 미완료 / 알려진 제약
입금 대조 API/화면/이력 및 결과 연결 미구현.
중복 후보 조회/선택 미구현. 임의 판정 없음.
삭제 충돌 후 affectedCaseIds 확인 UI 및 확인 삭제 재요청 미구현.
Mock 입금 변경의 검사 범위 분리, 스냅샷과 대조 연동 미구현.
Mock 기존 readiness의 DEPOSIT 상태는 신규 거래/배분 변경과 완전히 통합되지 않음.
다른 Case 공유 배분 샘플 미제공(테스트에서 공유 배분 검증).
배분 목록 pagination 미구현(현재 첫 20건).
원거래 편집은 USER_INPUT/USER_REPORTED로 입력해 추출 거래에 사용하면 안 됨.
전체 business 캐시 무효화는 영향 범위 최적화 필요.
Edge 320/375/768/1280 검증 미실시. RTL 신규 UI 흐름 검증 미구현.
8차 완료로 볼 수 없으며 9차 전 위 항목 보완 필요.

??: Vitest 20?? 332??? ??(?? 323 + ?? 9). lint/typecheck/build ??. ?? ??? ? Edge ???? ???.
