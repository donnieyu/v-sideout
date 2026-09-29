# Evaluate Work 설치·초기 검증 결과와 사용 안내

2026-09-29. 사용 가능한 첫 버전의 구현과 초기 시험을 완료했다. 장기간의 실제 작업 축적과 일반적인 모델 우열 검증은 앞으로의 사용 과정에서 이어진다.

## 설치한 구성

- [evaluate-work 스킬](/Users/donnieyu/.codex/skills/evaluate-work/SKILL.md): 한 턴 또는 여러 턴을 목표 단위로 평가하고 다음 행동의 모델·effort를 추천한다.
- [독립 평가 에이전트](/Users/donnieyu/.codex/agents/work_evaluator.toml): 초기 설정 Astra/high. 설정값과 실제 실행을 구분하며, 제품 편집 없이 근거를 평가한다.
- [기록 도구](/Users/donnieyu/.codex/skills/evaluate-work/scripts/eval_tools.py): 범위 선정, 실행량 수집, 검증, 원본 보존 저장, 후속 관찰, 색인, 과거 기록 가져오기.
- [상세 사용법](/Users/donnieyu/.codex/skills/evaluate-work/references/usage.md), [평가 기준](/Users/donnieyu/.codex/skills/evaluate-work/references/rubric.md), [비교 실험 절차](/Users/donnieyu/.codex/skills/evaluate-work/references/experiments.md).

기존 `review-completed-turn`과 그 원본 기록은 변경하지 않았다. 제품 코드와 Codex 메모리도 수정하지 않았다.

## 발전 단계별 결과

| 단계 | 이번에 완료한 내용 | 근거와 남은 범위 |
|---|---|---|
| 1. 평가 기준·기록 정비 | 구간 평가 스킬·평가자·CLI·원본 보존 기록과 후속 연결 | 25개 자동 검사, 별도 행동 시험. 실제 새 역할의 현재 세션 hot reload는 확인하지 않음 |
| 2. 사례 축적·분류 | 기존 기록 3건을 역사적 관찰로 가져오고 구현·회귀 검사·설계 탐색으로 구분 | 원본 경로·해시·내용 보존. 현재 제품 재검증이나 새로운 수용 판정은 아님 |
| 3. 작은 조건 비교 | 동일한 합성 상태 전환 수정 과제를 Sol medium/high로 각 1회 수행 | 공통 8개 검사 모두 통과, 독립 블라인드 검토에서 품질 우열 없음 |
| 4. 조건별 추천 | 사례별 적용 한계와 재평가 조건을 담은 초기 지침 작성 | 일반 모델 순위나 절감률은 확정하지 않음 |
| 5. 반복 실패의 기반 개선 | 범위 누락·실행 설정 혼동·중복 집계·후속 오판·임시 저장 노출을 회귀 검사와 도구 제약으로 보완 | 제품 아키텍처·lint 변경은 실제 평가에서 근거가 생길 때 별도 제안 |

## 검증 결과

`python3 -B -m unittest discover -s /Users/donnieyu/.codex/skills/evaluate-work/tests -v`: **25개 통과**. Python 컴파일도 통과했다. [최종 검사 로그](/Users/donnieyu/.codex/work-evaluations/development/20260929-bootstrap/tests-final.txt).

기존 스킬을 사용한 행동 기준선은 마지막 완료 턴 t6만 선택했다. 새 스킬을 사용한 별도 평가자는 연결된 t2·t3·t4·t6을 선택하고, 중단된 수정 t4를 포함하며, t7 사용자 결정을 지배 맥락으로 보존했다. 토큰 합산과 모델 인과 추론은 유보했다. 이는 합성 시나리오의 동작 검증이며 실제 제품 품질 합격을 뜻하지 않는다. [기준선](/Users/donnieyu/.codex/work-evaluations/development/20260929-bootstrap/baseline.md), [새 스킬 시험](/Users/donnieyu/.codex/work-evaluations/development/20260929-bootstrap/forward-test.md), [범위 도구 결과](/Users/donnieyu/.codex/work-evaluations/development/20260929-bootstrap/scope-result.json).

독립 코드 검토에서 임시 저장 디렉터리를 읽어 미게시 기록을 검토 완료로 오인할 수 있는 P2 오류 1건이 발견됐다. 임시 파일을 읽기 전에 제외하도록 수정했고, 게시 전/후 조회 및 게시 실패·재시도 회귀 검사 3개를 추가해 전체 25개 통과를 확인했다. 원래 독립 검토 보고서는 당시 판정을 보존한다. 수정 후 독립 검토를 다시 실행했다고 주장하지 않으며, 수정 검증은 재현 회귀 검사와 전체 검사 결과다. [독립 검토](/Users/donnieyu/.codex/work-evaluations/development/20260929-bootstrap/final-review.md), [수정 기록](/Users/donnieyu/.codex/work-evaluations/development/20260929-bootstrap/tooling-result.md).

스킬 frontmatter·UI YAML·참조 링크·에이전트 TOML을 검사했다. 기본 Python에는 PyYAML이 없어 bundled quick_validate는 실행되지 않았으며 Ruby YAML 파싱과 동일한 이름·설명 제약 검사로 대체했다. 추가 패키지는 설치하지 않았다. [메타데이터 검사](/Users/donnieyu/.codex/work-evaluations/development/20260929-bootstrap/metadata-validation.json).

## 비교 시험에서 확인한 것

| 실제 실행 설정 | 공통 검사 | 원시 총 토큰 | 실행 시간 |
|---|---:|---:|---:|
| gpt-6-sol / medium | 8/8 | 237,071 | 51.173초 |
| gpt-6-sol / high | 8/8 | 195,513 | 49.067초 |

이 실행에서는 high의 원시 사용량이 더 적었지만 조건별 1회이고 도구 경로·캐시·실행 변동성이 있다. high가 일반적으로 더 효율적이라는 결론은 내리지 않았다. 코드 품질 판단에는 모델과 사용량을 가렸다. [비교 보고서](/Users/donnieyu/.codex/work-evaluations/experiments/20260929-state-transitions/report.md), [초기 선택 지침](/Users/donnieyu/.codex/work-evaluations/policies/20260929-initial.md).

표는 시험 작업자의 실행량만이다. 개발·평가·진행 비용은 별도이며 부모/자식 중복 여부가 불명인 행은 합산하지 않는다. [개발 실행량 관측](/Users/donnieyu/.codex/work-evaluations/development/20260929-bootstrap/runtime-observations.json)은 저장 시점의 관측이다. 진행 담당은 아직 실행 중이므로 최종 사용량이 아니며 완료 이후 관측이 생기면 별도 후속 기록으로 추가할 수 있다.

## 바로 사용하는 방법

작업한 채팅에서 기능이나 버그 수정이 한 단계 마무리됐을 때 입력한다.

```text
$evaluate-work
이전 리뷰 이후 연결해서 진행한 작업 전체의 품질과 효율을 평가하고,
다음에 할 작업의 모델·effort와 검증 방법을 추천해줘.
```

처음 리뷰하거나 목표가 섞여 있으면 시작점을 말한다.

```text
$evaluate-work 선수 배정 초기화 문제를 처음 요청한 이후부터 지금까지 평가해줘.
```

추천받은 작업을 실제로 수행한 다음에는 다음처럼 이어간다.

```text
$evaluate-work 이번 실행을 이전 추천에 연결해서
품질·사용량·재작업 결과와 추천의 적합성을 평가해줘.
```

모델·effort는 직접 선택한다. 실제 설정이 다르면 그 차이를 기록하며 원래 추천이 검증된 것으로 처리하지 않는다. 기록이 쌓이면 작업 유형을 지정해 비교할 수 있다.

```text
$evaluate-work 누적된 상태 관리 버그 수정 사례를 비교하고
모델·effort 선택 지침을 갱신할 근거가 있는지 검토해줘.
```

정해진 횟수마다 무조건 검토하기보다 작업 완료, 단계 전환, 반복 재작업 시점에 호출한다. 기본 평가는 새 비교 실험이나 제품 수정을 자동 실행하지 않는다. 마지막 턴만 보려면 `$evaluate-work 마지막 완료 작업 턴 하나만 평가해줘`라고 지정한다.

## 결과를 확인할 곳

새 평가의 보고서는 `~/.codex/work-evaluations/records/<평가 ID>/report.md`, 구조화 기록은 같은 폴더의 `record.json`에 저장된다. 후속 관찰은 `followups/`에 추가되고 원래 평가는 보존된다. 비교 실험은 `experiments/`, 선택 지침은 `policies/`에 있다. `CODEX_HOME`을 지정한 환경에서는 해당 경로를 따른다.

새 스킬이나 역할이 현재 채팅에 나타나지 않으면 새 채팅에서 선택하거나 Codex를 다시 열어 확인한다. 설치 파일은 검증했지만 현재 세션의 새 역할 등록까지 확인한 것은 아니다. 스킬은 현재 역할 목록에 없을 때 일반 서브에이전트에 동일 지침과 설정을 전달하고 실제 실행을 확인하는 대체 경로도 포함한다.

이제 실제 작업에서 추천과 후속 결과를 연결하는 것이 다음 운영 단계다. 앞으로 새 사례가 들어오기 전까지는 초기 지침을 가설로 유지한다.
