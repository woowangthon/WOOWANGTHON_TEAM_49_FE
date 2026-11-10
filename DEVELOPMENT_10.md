# 10차 개발 — 부분 구현

## 구현
질문 조회·빈/오류·조건/수기/문서 링크, 수동 문의 편집·복사, 보고서 명시 생성·202·중복 잠금·동일 body 재시도 키 유지, 이력·상세 polling·버전·참조·isCurrent·오류 표시를 추가했다. 결과 화면에 후속 진입 링크를 추가했다. 다운로드는 인증 Blob·MIME 검사·기본 파일명·Object URL 해제를 사용한다.

## 미완료
서버 문의 생성(409/503 포함), 상담기관 검색·필터, 선택 원본 ZIP, Content-Disposition 이름 활용, 전체 신규 RTL/MSW 사용자 여정 검증은 남아 있다. 기관 페이지는 준비 안내다. Mock은 원본 미선택 보고서만 READY 및 예시 PDF/ZIP을 제공한다. 원본 선택 시 명시적인 Mock 미지원 코드로 FAILED가 된다. 실제 보고서 엔진 구현이 아니다.

## 계약
P0 API_ENDPOINTS.md 경로·HTTP, 백엔드_API_명세_v1.pdf의 4개 생성 요청 필드·202·고정 스냅샷·Idempotency-Key·과거 결과 신규 생성 금지를 적용했다. useLatestAvailableResults=true, acknowledgeOutdatedResults=false. P4 referencedSnapshots 요청은 보내지 않는다.
P0가 생략한 질문·목록 DTO는 P4 v0.5 조건부 adapter이며 확정 계약이 아니다. 문의 tone/resultItemIds는 [제안]이므로 사용하지 않았다. 기관 region/category 예시는 P0에서 확인되지만 응답·페이지 정책은 미확정이다. DB PDF에는 상세 테이블이 없다. P1 P-12~14, P2 관련 화면, P3 14절을 참고했다. P4 과거 결과 제안보다 P0 금지를 우선했다.

## 일관성과 한계
Mock 생성 시 입력 버전·선택 ID·스냅샷 ID는 고정하고 isCurrent만 현재 버전과 비교한다. 실제 선택 원본 바이트 보존·삭제 원본 차단·전체 변경 이후 최신성 통합 검증은 미완료다. 기존 세션 generation Query key·인증·Case 제거 상태·문서 조회를 재사용했다.

## 검증
lint, typecheck, build, git diff --check 통과. 최초 전체 테스트는 빌드 동시 실행 중 6개 실패(시간 초과/비동기 조회), 이후 npm test -- --maxWorkers=2에서 29파일 372/372 통과(기존 367 + 신규 5). 신규는 adapter 및 예시 파일 검사이며 J항 전체 검증을 대체하지 않는다. 추가 중복 실행은 중단했다.
PyMuPDF로 예시 PDF 1페이지 열기·입력 버전 7·스냅샷 28 확인. Python zipfile CRC 검사 및 result-snapshot.json 추출 성공. 원본 없는 개발용 파일에 한정한다.
Edge 320/375/768/1280 여정·가로 넘침·콘솔·네트워크 계측은 미실시. 테스트 미처리 MSW 로그가 있어 전체 0건을 주장하지 않는다. 실제 백엔드 서버 실행/접속/OpenAPI·외부 LLM·기관 API 호출 없이 작업했다. main 유지, commit/push 없음.

## 파일
신규: src/features/case-support/{api.ts,schemas.ts,screens.tsx,contracts.test.ts}, src/app/(workspace)/cases/[caseId]/{questions,company-inquiry,reports}/page.tsx, src/app/(workspace)/consultation-centers/page.tsx, src/mocks/shared/{support-handlers.ts,report-files.ts}, DEVELOPMENT_10.md.
수정: src/features/results/result-screen.tsx, src/mocks/development.ts, README.md.

11차 전에 10차 잔여 구현과 브라우저 검증을 완료해야 한다.
