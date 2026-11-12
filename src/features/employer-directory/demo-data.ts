import type { DirectoryEmployer, Disclosure } from "./models";

const pending: Disclosure = { status: "unverified", note: "공식 공표자료와 사업장 식별정보를 확인하기 전이에요." };
const unavailable: Disclosure = { status: "unavailable", note: "사업자등록번호와 사업장관리번호가 모두 확보되지 않아 조회할 수 없어요." };

// Fictitious companies and disclosure results, used only in development Mock mode.
export const demoEmployers: DirectoryEmployer[] = [
  {
    id: "demo-gimhae-metal", name: "예시 김해 금속공장 A", region: "경남 김해시",
    address: "경상남도 김해시 주촌면 · 예시 주소", industry: "금속가공", products: "금속 부품",
    foreignEmployees: "20~49명", referenceDate: "2026-09-01", sourceName: "김해시 공장기업 현황",
    sourceUrl: "https://www.data.go.kr/data/15126955/fileData.do",
    wageDisclosure: { status: "listed", note: "공식 명단공개 대상이 확인된 경우의 예시 화면이에요.", checkedOn: "2026-11-12", publicationPeriod: "2026-01-01 ~ 2028-12-31 (예시)" },
    safetyDisclosure: pending,
  },
  {
    id: "demo-chungbuk-plastic", name: "예시 충북 플라스틱공장 B", region: "충청북도",
    address: "충청북도 음성군 대소면 · 예시 주소", industry: "플라스틱 제조", products: "플라스틱 성형품",
    foreignEmployees: "10~19명", referenceDate: "2026-09", sourceName: "충청북도 공장기업 현황",
    sourceUrl: "https://www.data.go.kr/data/15109336/fileData.do",
    wageDisclosure: unavailable, safetyDisclosure: pending,
  },
  {
    id: "demo-chungnam-machine", name: "예시 아산 기계공장 C", region: "충청남도",
    address: "충청남도 아산시 둔포면 · 예시 주소", industry: "기계 제조", products: "산업용 기계",
    foreignEmployees: "5~9명", referenceDate: "2025", sourceName: "충청남도 제조업체 현황",
    sourceUrl: "https://www.data.go.kr/data/3039901/fileData.do",
    wageDisclosure: { status: "not-listed", note: "조회 시점에 명단공개 미대상으로 확인된 경우의 예시예요. 모든 신고·위반 이력을 조회한 결과는 아니에요.", checkedOn: "2026-11-12" },
    safetyDisclosure: { status: "listed", note: "2025년 산업재해 발생건수 등 공표자료에 포함된 경우의 예시예요. 실제 사업장의 공표 이력이 아니에요.", checkedOn: "2026-11-12", publicationPeriod: "공표일 2026-01-29 (자료 연도 2025)" },
  },
  {
    id: "demo-busan-metal", name: "예시 영도 금속공장 D", region: "부산 영도구",
    address: "부산광역시 영도구 청학동 · 예시 주소", industry: "금속가공", products: "선박용 부품",
    foreignEmployees: null, referenceDate: "2026-08-07", sourceName: "부산 영도구 공장제조업 등록현황",
    sourceUrl: "https://www.data.go.kr/data/15144218/fileData.do",
    wageDisclosure: { status: "error", note: "조회 요청이 완료되지 않은 경우의 예시예요. 공식 원문에서 직접 확인할 수 있어요." },
    safetyDisclosure: pending,
  },
  {
    id: "demo-gimhae-food", name: "예시 김해 식품공장 E", region: "경남 김해시",
    address: "경상남도 김해시 진례면 · 예시 주소", industry: "식품 제조", products: "가공식품",
    foreignEmployees: "1~4명", referenceDate: "2026-09-01", sourceName: "김해시 공장기업 현황",
    sourceUrl: "https://www.data.go.kr/data/15126955/fileData.do",
    wageDisclosure: pending, safetyDisclosure: pending,
  },
  {
    id: "demo-chungbuk-machine", name: "예시 충북 기계공장 F", region: "충청북도",
    address: "충청북도 진천군 덕산읍 · 예시 주소", industry: "기계 제조", products: "기계 부품",
    foreignEmployees: "0명", referenceDate: "2026-09", sourceName: "충청북도 공장기업 현황",
    sourceUrl: "https://www.data.go.kr/data/15109336/fileData.do",
    wageDisclosure: unavailable, safetyDisclosure: pending,
  },
];
