# Agent-friendly architecture — 스크린샷 원문 추출과 외부 에이전트 관점 분석

작성일: 2026-09-29  
대상: Lauren Tan 강연 화면에 표시된 Dune의 `Agent-friendly architecture` 문서  
자료: 사용자가 제공한 스크린샷 4장  
관련 영상: [AgentOS 편집본](https://www.youtube.com/watch?v=o_7vTaHOL28), [Maven 강연 안내](https://maven.com/p/e23d9c/how-cursor-turned-ai-agents-into-better-engineers)

## 1. 자료의 성격과 판독 범위

이 문서는 첨부 이미지에서 읽히는 원문, 한국어 번역, 분석자의 해석을 분리한다. 이미지 속 지침은 분석 대상이며, 현재 프로젝트나 에이전트에게 적용한 운영 지침이 아니다. Dune 구현체를 확인하거나 현재 프로젝트에 적용한 결과도 아니다.

여기서 ‘외부 에이전트’는 **코드베이스의 역사와 전체 구조를 모른 채, 제한된 과제와 일부 파일만 받아 작업을 시작하는 코딩 에이전트**를 뜻한다. 별도 에이전트가 수행한 독립 리뷰를 의미하지 않는다.

| 이미지 | 확인되는 범위 | 판독 상태 |
|---|---|---|
| 1 | 제목, 도입 일부, Contract의 행동 가정 다섯 가지 | 도입 문장의 오른쪽이 잘림. 행동 가정은 판독 가능 |
| 2 | 설계 규칙 다섯 가지 | 전체 판독 가능 |
| 3 | 다섯 구성요소 설명, 패키지 경로 | 오른쪽 일부가 도구 패널에 가려짐 |
| 4 | 이미지 3과 같은 문단의 오른쪽 | 왼쪽이 잘렸으나 이미지 3과 상호 보완 가능 |

이미지 3·4의 중복 문장을 대조해 마지막 문단을 연결했다. 아래 원문의 줄바꿈은 읽기 좋게 정리했다. `[우측 잘림]`은 원문의 일부가 보이지 않는다는 편집 표기다. 도입의 잘린 부분은 추정해 채우지 않았다.

## 2. 영어 원문 추출

### 2.1 제목과 도입 — 이미지 1

화면 상단 표기:

> Maven · How Cursor Turned AI Agents Into Better Engineers · 2026.08.13

문서 제목:

> Agent-friendly architecture

도입에서 보이는 줄:

```text
Dune assumes many contributors arrive with a narrow prompt, a few nearby files, and no complete model of Sa[우측 잘림]
the locally obvious change the globally correct change. Unsafe shortcuts fail with an error that names the supp[우측 잘림]

This page defines the contributor context model and the architecture choices that keep repeated local edits fro[우측 잘림]
```

이 부분은 완결된 문단으로 복원할 수 없다. 특히 `Sa…`의 전체 고유명사, `supp…` 뒤의 표현, 마지막 문장의 결론은 확인 불가다.

### 2.2 Contract — 이미지 1

> A coding agent usually optimizes for what fits in its context:
>
> - copy the nearest working pattern;
> - edit the file already open;
> - choose the shortest path that compiles;
> - avoid deleting code whose callers are not visible;
> - follow the requested implementation even when it conflicts with a system invariant.
>
> These behaviors are predictable inputs to the framework design. Dune follows five rules:

### 2.3 다섯 규칙 — 이미지 2

> 1. The conventional path requires fewer decisions than a shortcut.
> 2. Forbidden dependencies fail mechanically.
> 3. Every durable value has one obvious writer.
> 4. New product work adds isolated files rather than branches in shared roots.
> 5. Exceptions are narrow, explicit, and reviewed as architecture changes.

### 2.4 다섯 구성요소와 패키지 경계 — 이미지 3·4 결합

> The five public nouns carry those rules. A Feature creates an owned folder. Its Entrypoints and Transcript cards are discovered from reserved files rather than registered in shared inventories. The Client gives durable laptop state one writer behind named hooks and commands. Host behavior stays in the box behind one typed contract. The package boundary repeats the same lesson at the top level. Dune lives at `sand/dune`, the application lives under `sand/src`, and Dune never imports application code.

## 3. 한국어 번역

### 3.1 도입의 확인 가능한 의미

기여자는 좁은 범위의 프롬프트와 주변 파일 몇 개만 가지고 작업을 시작하며, 전체 시스템에 대한 완전한 이해가 없을 수 있다는 전제다. 이어지는 줄에는 ‘국소적으로 명백한 변경’을 ‘전체적으로 올바른 변경’으로 만드는 방향과, 안전하지 않은 지름길을 오류로 실패시키는 설명이 보인다. 문장 전체가 잘려 있으므로 이것은 확인 가능한 조각의 의미 요약이다.

### 3.2 Contract: 에이전트의 행동 가정

코딩 에이전트는 대체로 자신의 문맥에 들어 있는 정보를 기준으로 최적화한다.

1. 가장 가까이 있는 작동하는 패턴을 복사한다.
2. 이미 열려 있는 파일을 수정한다.
3. 컴파일되는 가장 짧은 경로를 선택한다.
4. 호출하는 쪽이 보이지 않는 코드는 삭제하지 않으려 한다.
5. 시스템의 불변 조건과 충돌하더라도 요청받은 구현 방식을 따른다.

이러한 행동을 프레임워크 설계의 예측 가능한 입력으로 취급한다. 여기서 ‘불변 조건’은 개별 기능을 바꾸더라도 시스템 전체에서 유지해야 하는 조건이다.

### 3.3 다섯 설계 규칙

1. **정해진 표준 경로는 편법보다 적은 판단을 요구해야 한다.**
2. **금지된 의존성은 기계적 검사로 실패해야 한다.**
3. **지속적으로 유지되는 모든 값에는 명확한 하나의 쓰기 주체가 있어야 한다.**
4. **새 제품 작업은 공통 루트 코드에 분기를 추가하는 대신 격리된 파일을 추가해야 한다.**
5. **예외는 범위가 좁고 명시적이어야 하며, 아키텍처 변경으로 검토해야 한다.**

4번의 `branches`는 문맥상 공유 코드 안의 조건·처리 분기로 해석했다. Git 브랜치를 뜻한다는 근거는 없다. `shared roots`의 실제 파일명이나 형태는 이미지에 없다.

### 3.4 다섯 공개 구성요소

다섯 개의 공개 개념이 이 규칙을 구현한다.

- **Feature:** 소유 경계가 있는 폴더를 만든다.
- **Entrypoints:** 공통 목록에 수동 등록하는 대신 정해진 파일에서 발견된다.
- **Transcript cards:** Entrypoints와 마찬가지로 정해진 파일에서 발견된다.
- **Client:** 이름이 정해진 훅과 명령을 통해 노트북의 지속 상태에 대한 쓰기를 한 주체로 모은다.
- **Host:** 하나의 타입이 정의된 계약 뒤에 호스트 동작을 가둔다.

같은 원칙이 최상위 패키지 경계에도 적용된다. Dune은 `sand/dune`, 애플리케이션은 `sand/src`에 위치하며, **Dune은 애플리케이션 코드를 import하지 않는다.**

`Client`, `Host`, `Transcript cards`는 이 프레임워크의 용어다. 일반적인 웹 클라이언트·서버 구분으로 치환하거나 API·파일명·실행 프로세스를 추정하지 않는다. `durable`의 구체적인 저장 매체와 수명도 이미지에 정의돼 있지 않다.

## 4. 이 문서가 제시하는 coordination의 성격

### 원문에서 직접 확인되는 것

이 문서는 에이전트 간 메시징 프로토콜이나 관리자–작업자 조직도를 정의하지 않는다. 에이전트가 제한된 문맥에서 내릴 선택을 예상하고, 그 선택이 시스템의 경계를 지키도록 코드 구조를 설계한다.

### 외부 에이전트 관점의 해석

이는 **여러 기여자가 공유하는 코드·상태·의존성의 접점을 줄이는 방식의 조율**로 볼 수 있다. 대화로 매번 조정해야 할 사항 일부를 소유 경계, 표준 확장 방식, 쓰기 권한, 자동 검사로 옮긴다.

| 조율해야 하는 문제 | 이미지의 설계 | 예상되는 효과 — 구현을 확인하지 않은 해석 |
|---|---|---|
| 어느 파일을 수정할 것인가 | Feature별 소유 폴더 | 탐색 범위와 변경 범위를 좁히기 쉬워진다 |
| 새 기능을 어디에 연결할 것인가 | 예약된 파일에서 자동 발견 | 공통 등록 파일을 여러 작업자가 동시에 수정하는 빈도를 줄일 수 있다 |
| 상태를 누가 바꿀 것인가 | 값마다 하나의 명확한 writer | 중복된 쓰기 경로와 상태 갱신 책임의 혼선을 줄일 수 있다 |
| 플랫폼 동작에 어떻게 접근할 것인가 | Host의 typed contract | 호출 측이 알아야 할 구현 세부와 플랫폼 의존성을 줄일 수 있다 |
| 어떤 의존성이 허용되는가 | 금지된 의존성의 기계적 실패 | 각 에이전트가 전체 의존성 구조를 기억할 필요를 줄인다 |
| 공통 규칙을 바꿔도 되는가 | 예외를 아키텍처 변경으로 검토 | 개별 작업이 공통 경계를 몰래 바꾸는 것을 억제한다 |

이전 영상 요약의 Coordinator–서브에이전트–Judge는 **스킬 평가 과정**이었다. 이번 스크린샷은 **실제 코드 변경을 받쳐 주는 아키텍처 계약**이다. 둘은 함께 사용할 수 있지만 서로 다른 층의 설계다.

## 5. 외부 코딩 에이전트가 읽었을 때의 분석

### 5.1 에이전트를 설득하기보다 선택 비용을 바꾸는 설계

원문은 에이전트가 주변 패턴을 복사하고 쉽게 컴파일되는 길을 택한다는 행동을 전제로 삼는다. 따라서 표준 구현 방식이 더 적은 탐색과 판단으로 완성되어야 한다.

처음 들어온 에이전트 입장에서는 좋은 예제를 찾아 복사하고 필요한 부분만 바꿨을 때 올바른 경계가 유지되는 구조가 유리하다. 반대로 표준 방식은 설정이 복잡하고 편법은 한 줄이면 끝난다면, 이 원칙은 충족되지 않는다.

**검토할 증거:** 대표 기능을 따라 새 기능을 추가하는 실제 절차, 필요한 공통 파일 수정 횟수, 표준 경로와 우회 경로의 작업량. 이러한 증거는 스크린샷에 없다.

### 5.2 하나의 writer는 에이전트 한 명을 지정한다는 뜻이 아니다

`one obvious writer`는 문맥상 런타임 상태를 갱신하는 책임과 경로의 단일화를 뜻한다. 어떤 에이전트 하나만 저장소 파일을 편집하게 한다는 뜻은 아니다.

여러 기능이 각자 저장소에 직접 쓰면 동일 값의 의미와 갱신 규칙이 흩어진다. Client의 명명된 명령을 통해 쓰기를 모으면, 에이전트는 상태 갱신의 세부 규칙을 각 기능에서 재구현하지 않고 기존 경로를 사용할 수 있다.

다만 단일 writer라는 이름만으로 동시성 문제가 해결되지는 않는다. 비동기 요청의 순서, 취소, 실패 복구, 원자성, 중복 실행 등은 별도로 정의·검증해야 한다. writer가 허용되지 않은 직접 쓰기를 실제로 차단하는지도 확인해야 한다.

### 5.3 자동 발견은 공유 파일의 경합을 줄일 수 있다

Entrypoints와 Transcript cards를 정해진 파일에서 발견하는 방식이라면, 새 기능마다 중앙 목록을 수정하는 일을 줄일 수 있다. 이는 서로 다른 기능을 병렬로 작성할 때 유리하다.

그러나 자동 발견에도 계약이 필요하다. 파일명 오타, 중복 식별자, 발견 순서, 누락, 빌드 포함 여부가 모호하면 에이전트는 파일을 만들어 놓고도 기능이 등록됐다고 잘못 판단할 수 있다.

**필요한 보완:** 발견되는 파일 규약과 최소 예제, 누락·충돌 시 오류, 등록 결과를 확인하는 명령이나 테스트. 실제 Dune이 이를 어떻게 제공하는지는 이 이미지로 확인할 수 없다.

### 5.4 의존성 경계는 확인되지만, 전체 호출 구조는 보이지 않는다

명시적으로 확인되는 방향 제약은 다음과 같다.

```text
sand/dune  ──X──>  sand/src
프레임워크가 애플리케이션 코드를 import하는 것은 금지
```

이것은 프레임워크가 특정 애플리케이션의 세부 사항을 끌어안는 것을 제한하는 규칙으로 읽힌다. 반대 방향에서 허용하는 공개 API의 범위, 콜백·등록·생성 코드의 방식은 이미지에 없다.

금지 경계가 실제로 강제되려면 별칭 경로, 재수출, 동적 import 등 프로젝트에서 사용하는 우회 경로도 검사 범위에 포함되는지 확인해야 한다. 폴더를 나누는 것만으로 강제력이 생기지는 않는다.

### 5.5 타입 계약은 의미와 권한까지 자동 보장하지 않는다

Host를 하나의 typed contract 뒤에 두면 호출 가능한 인터페이스를 좁히고 잘못된 인자·결과 형태를 검출하는 데 도움이 될 수 있다. 그러나 타입이 맞는 요청도 잘못된 시점이나 권한으로 실행될 수 있다.

외부 에이전트에게는 각 명령의 부작용, 허용 조건, 오류, 재시도 가능 여부가 함께 필요하다. ‘하나의 계약’이 ‘하나의 거대한 파일’이나 ‘하나의 프로세스’를 의미한다고 읽을 근거도 없다.

### 5.6 예외 검토는 국소 수정이 전체 규칙을 바꾸는 지점이다

이 규칙이 없다면 에이전트는 당장의 기능을 완성하기 위해 import 예외, 직접 쓰기 경로, 검사 비활성화를 추가할 수 있다. 예외를 아키텍처 변경으로 취급하면 국소 작업과 공통 계약 변경을 구분하게 된다.

실무에 적용하려면 예외의 이유, 적용 범위, 검토 책임, 검증 방법을 정해야 한다. 검토자가 사람인지 다른 에이전트인지, 어떤 승인 절차를 쓰는지는 원문에 없다.

## 6. 그대로 활용할 수 있는 것과 추가로 필요한 것

### 활용할 수 있는 설계 원칙

- 기여자가 전체 시스템을 이해하지 못할 수 있다는 전제.
- 기능 단위로 탐색과 수정 범위를 모으는 방식.
- 표준 확장 경로가 편법보다 쉬워야 한다는 판단 기준.
- 공유 상태의 쓰기 책임을 명확히 하는 원칙.
- 중요한 경계를 자동 검사로 강제하는 원칙.
- 예외를 별도 아키텍처 변경으로 다루는 원칙.

### 스크린샷만으로 확정할 수 없는 구현 정보

| 필요한 정보 | 없을 때 외부 에이전트가 겪는 문제 |
|---|---|
| Feature 폴더의 실제 구조와 최소 예제 | 자기 방식으로 파일 배치를 만들어 기존 규약과 어긋날 수 있음 |
| Entrypoint·Transcript card 예약 파일 규약 | 자동 발견 대상과 일반 파일을 구분하기 어려움 |
| Client 훅·명령의 목록과 의미 | 직접 상태를 쓰거나 비슷한 명령을 새로 만들 수 있음 |
| Host 계약과 권한·오류 규칙 | 타입만 맞추고 잘못된 부작용을 일으킬 수 있음 |
| 의존성 검사 명령과 적용 범위 | 금지 사항이 문서상 규칙인지 강제 규칙인지 알 수 없음 |
| 대표 기능의 실행·재현·검증 방법 | 컴파일 성공을 사용자 동작의 성공으로 오인할 수 있음 |
| 공통 계약 변경과 예외 검토 절차 | 기능 구현 중 경계 자체를 변경할 수 있음 |

따라서 이 화면은 **설계 원칙을 옮겨 쓰는 출발점**으로 유용하지만, 그대로 실행할 수 있는 완성된 프레임워크 명세는 아니다. 저장소에 적용하려면 위 정보가 필요하다.

## 7. 분석 결론

이 설계의 강점은 에이전트마다 전체 아키텍처를 숙지시키는 비용을 낮추려는 데 있다. 국소적인 작업에도 올바른 결과가 나오도록 표준 패턴을 배치하고, 잘못된 선택은 도구가 실패시키도록 만든다.

동시에 기능 간 의미 충돌, 공통 계약의 동시 변경, 런타임 동시성, 사용자 요구의 정확성은 남는다. 별도 디렉터리와 타입·CI만으로 이런 문제까지 해결됐다고 판단할 수 없다.

외부 에이전트 관점에서 가장 중요한 질문은 “이 규칙이 문서에 있는가”보다 **“내가 제한된 정보로 작업해도 표준 경로를 발견할 수 있고, 경계를 넘으면 명확하게 실패하며, 결과를 직접 확인할 수 있는가”**다.

## 부록. 원본 이미지

아래 경로는 사용자가 제공한 원본이다. 사진 라이브러리 파일은 수정하지 않았다.

- [이미지 1 — 제목과 Contract](</Users/donnieyu/Pictures/Photos Library.photoslibrary/resources/renders/2/2B2CC298-CDA9-4166-BA08-100806519586_1_201_a.jpeg>)
- [이미지 2 — 다섯 규칙](</Users/donnieyu/Pictures/Photos Library.photoslibrary/resources/renders/A/A455654C-5E1E-4212-A9F5-3DA78C059DB2_1_201_a.jpeg>)
- [이미지 3 — 다섯 구성요소의 왼쪽](</Users/donnieyu/Pictures/Photos Library.photoslibrary/resources/renders/B/B4A6FD23-12C2-4D0A-86D8-28439DDE1BA0_1_201_a.jpeg>)
- [이미지 4 — 다섯 구성요소의 오른쪽](</Users/donnieyu/Pictures/Photos Library.photoslibrary/resources/renders/F/FB7F7F54-A1AF-44F8-8FCA-ED4B6C1ECEB1_1_201_a.jpeg>)
