# 최근 YouTube AI 웹 제작 방법 조사

조사일: 2026-09-23. 목표: 여러 프로젝트에서 재사용할 제작 환경, 디자인 완성도와 화면 구성 개선.

## 확인 범위

2026년 7~9월 영문 영상 4편의 YouTube 원문 제목·게시일·설명과 시간표시 자막을 직접 확인했다. 날짜는 YouTube 페이지 표시 기준이다. 자동 영어 자막은 도구명 등을 오인식할 수 있어 설치 판단에 필요한 내용은 공식 문서와 대조했다. 아래 내용은 영상 발언과 문서의 확인 결과이며, 전체 영상을 시각적으로 검수하거나 구현을 재현한 결과는 아니다. 시장 전체나 한국어 영상의 포괄적 조사도 아니다.

## 영상별 유용한 방법

### 1. AI LABS — 2026-07-18

[How To Use Codex To Build Insanely Beautiful Websites Using GPT 5.6 Sol](https://www.youtube.com/watch?v=pHstb0JGGhE)

- [02:39](https://www.youtube.com/watch?v=pHstb0JGGhE&t=159s): 대상 사용자, 페이지 목적, 방문자가 할 행동부터 정한다.
- [03:55](https://www.youtube.com/watch?v=pHstb0JGGhE&t=235s): 반복 작업 지침을 AGENTS.md에 기록한다.
- [09:40](https://www.youtube.com/watch?v=pHstb0JGGhE&t=580s): 브라우저 실행과 화면 크기별 검수를 작업에 포함한다.
- [11:41](https://www.youtube.com/watch?v=pHstb0JGGhE&t=701s): 공통 제작 스킬과 프로젝트의 브랜드 규칙을 구분하고 DESIGN.md로 후자를 전달한다.
- [18:47](https://www.youtube.com/watch?v=pHstb0JGGhE&t=1127s): 시각적 레퍼런스로 구도와 표현 방향을 구체화한다.
- [22:52](https://www.youtube.com/watch?v=pHstb0JGGhE&t=1372s): 변경 전 Git 체크포인트를 남긴다.

적용 판단: 공통 환경 구축에 가장 직접적으로 연결된다. 특정 디자인 스킬이 더 낫다는 주장은 제작자의 비교 의견이다. 영상의 GPT Taste 원본 저장소는 확정하지 못했으므로 설치 후보로 채택하지 않았다. 7월 영상의 스킬 평가는 현재 설치 버전의 성능 검증으로 볼 수 없다.

### 2. Chase AI — 2026-08-04

[The #1 Claude Code Design Skill Just Got a HUGE Upgrade](https://www.youtube.com/watch?v=RVeCbPg0liw)

- [05:53](https://www.youtube.com/watch?v=RVeCbPg0liw&t=353s): Impeccable로 여러 미적 방향을 제시하고 하나를 선택한다.
- [06:58](https://www.youtube.com/watch?v=RVeCbPg0liw&t=418s): 선택한 방향 안에서 변형을 비교한다.
- [09:31](https://www.youtube.com/watch?v=RVeCbPg0liw&t=571s): Live Mode에서 특정 요소를 선택하고 대안을 비교·반영한다.
- [12:24](https://www.youtube.com/watch?v=RVeCbPg0liw&t=744s): 세부 수정과 큰 구성 변경을 구분해 요청한다.

적용 판단: 디자인 완성도와 화면 구성이라는 우선순위에 가장 잘 맞는 추가 도구 후보다. 같은 콘텐츠와 브랜드 조건에서 한 섹션의 대안을 비교하는 실험을 권장한다. 영상 제목의 최상급 표현은 객관적 순위가 아니다. 현재 공식 Live Mode 문서에서도 요소 선택·대안 비교·소스 반영 흐름을 확인했다.

### 3. Create a Pro Website — 2026-09-10

[The EASY Way to Build a Beautiful Website with GPT-6 Astra (Full Tutorial)](https://www.youtube.com/watch?v=qbjsW6lvDwg)

- [04:16](https://www.youtube.com/watch?v=qbjsW6lvDwg&t=256s): 브랜드 색상·로고·섹션별 이미지 역할을 먼저 준비한다.
- [06:35](https://www.youtube.com/watch?v=qbjsW6lvDwg&t=395s): 레이아웃 참고 화면을 제공한다.
- [08:54](https://www.youtube.com/watch?v=qbjsW6lvDwg&t=534s): 목적·자료·레퍼런스·섹션을 함께 전달하고 부족한 정보를 질문하게 한다.
- [14:52](https://www.youtube.com/watch?v=qbjsW6lvDwg&t=892s): 스크롤 중 영상이 초반 프레임에 멈추는 문제를 구체적으로 설명하고 해당 부분만 수정 요청한다. 수정 후 다시 확인한다.

적용 판단: 이미지 준비와 수정 요청 방식이 유용하다. 최초 결과에서 실제 문제가 발생했다는 제작자의 설명도 있어 한 번의 생성으로 완성된다는 기대를 뒷받침하지 않는다. 설명란에 제휴 링크 고지가 있으며 Higgsfield·Hostinger 사용은 해당 튜토리얼의 선택이다.

### 4. Darrel Wilson — 2026-09-21

[How To (REALLY) Build A $10,000 Website With CHATGPT 6 Astra (MAX)](https://www.youtube.com/watch?v=dn6MDl86fRY)

- [10:16](https://www.youtube.com/watch?v=dn6MDl86fRY&t=616s): 브랜드 자료와 사이트 목적을 구체적으로 전달한다.
- [12:49](https://www.youtube.com/watch?v=dn6MDl86fRY&t=769s): 첫 결과의 스크롤 영상 지연을 지적한다.
- [13:36](https://www.youtube.com/watch?v=dn6MDl86fRY&t=816s): 문제와 원하는 동작을 연결해 수정 요청한다.
- [15:55](https://www.youtube.com/watch?v=dn6MDl86fRY&t=955s): 모바일 화면을 별도로 확인하고 배치와 밀도를 다시 조정한다.

적용 판단: 모바일을 별도 검수하는 과정이 유용하다. 제목의 금액은 실제 거래액·사업 성과로 검증되지 않았다. MAX 설정이나 특정 유료 서비스의 필요성도 비교 실험으로 입증된 것은 아니다. 외부로 제공하는 프롬프트 파일 자체는 이번에 검토하지 않았다.

## 공식 문서 대조

| 영상의 제안 | 현재 확인한 내용 | 도입 판단 |
| --- | --- | --- |
| 지속적인 작업 지침 | Codex는 AGENTS.md를 작업 지침으로 읽는다. [공식 문서](https://learn.chatgpt.com/docs/agent-configuration/agents-md) | 공통 작업 절차와 프로젝트 규칙을 간결하게 기록 |
| DESIGN.md로 디자인 방향 전달 | Google Labs의 공개 형식은 브랜드 정체성, 토큰, 적용 이유를 텍스트로 표현한다. [명세](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md) | 프로젝트별 색상·서체·간격·구성 원칙 기록. 파일을 만들기만 하면 자동 적용된다고 가정하지 않고 작업 지침에서 참조 |
| Impeccable의 화면 대안 비교 | 실행 중인 로컬 페이지에서 요소 선택, 변형 비교, 선택 결과 소스 반영을 지원한다. [Live Mode 문서](https://impeccable.style/tutorials/iterate-live/) | 다음 실험 후보. 설치와 실제 호환성 확인은 아직 수행하지 않음 |
| 별도 이미지 생성 서비스 연결 | Impeccable은 사용 가능한 에이전트 내장 이미지 도구를 우선 사용한다. Codex 경로에는 별도 OpenAI API 키가 필요 없다고 안내한다. [이미지 생성 문서](https://impeccable.style/docs/image-generation/) | Higgsfield 구독은 기본 실험의 선행 조건이 아님. 실제 도구·계정 제공 여부에 따라 결정 |
| 이미지 시안부터 코드 구현 | 공식 문서도 이미지→코드 변환에서 세부 차이가 생기며 반복 검토가 필요하다고 명시한다. [설명](https://impeccable.style/docs/image-generation/) | 시안 선택 후 구현 일치도와 반응형을 별도 검수 |

## 공통 환경에 적용할 권장 순서

다음은 영상과 문서를 바탕으로 한 제안이며 검증된 성능 순위가 아니다.

1. **제작 브리프:** 사용자, 페이지 목적, 핵심 행동 하나, 실제 콘텐츠를 정한다.
2. **레퍼런스:** 사이트 2~3개에서 좋아하는 부분을 구도·서체·밀도·이미지 사용처럼 구체적으로 적는다.
3. **시안 비교:** 동일한 콘텐츠로 서로 다른 방향 2~3개를 비교한다. 첫 화면과 대표 섹션 정도로 범위를 제한한다.
4. **프로젝트 디자인 규칙:** 선택한 방향의 색상·서체·간격·컴포넌트 원칙을 프로젝트 안에 기록한다. 공통 스킬에는 작업 방법을 둔다.
5. **부분 수정:** 대상 요소, 관찰한 문제, 원하는 결과를 함께 전달한다. 예: 카드 3개를 동시에 읽기 어렵다 → 제목과 핵심 수치를 먼저 읽히게 배치를 조정한다.
6. **브라우저 검수:** 데스크톱·모바일에서 콘텐츠 흐름, 줄바꿈, 버튼·폼, 스크롤, 이미지 로딩을 확인한다. 영상·애니메이션은 성능도 확인한다.
7. **재사용:** 효과를 확인한 절차만 공통 스킬에 반영하고, 프로젝트의 브랜드는 개별 관리한다.

## 다음 단계에 필요한 것

- **사용자 정보:** 대표 페이지 유형 하나, 선호 사이트 2~3개와 좋아하는 부분, 실제로 넣을 콘텐츠 또는 짧은 제품 설명. 로고·색상은 있으면 활용한다.
- **지금 활용 가능:** 설치된 frontend-design·web-design-guidelines, 기존 개발 환경과 브라우저 도구. 이번 조사 때문에 추가 구독을 시작할 필요는 없다.
- **추가 설치 우선 후보:** Impeccable. 동일한 한 섹션에서 기존 방식과 비교하여 정보 위계·브랜드 일관성·모바일 가독성·수정 횟수로 판단한다. 지침 중복과 프로젝트 설정 변경 범위도 설치 전 확인한다.
- **조건부 연결:** Figma 원본을 활용할 때 Figma 연결. 이미지·영상 수요가 실제로 생겼을 때 해당 생성 서비스. 저장소 협업이 필요할 때 GitHub 연결.

이번 조사에서 추가 설치, 유료 가입, 웹 구현·배포는 하지 않았다. 산출물은 이 조사 문서다.
