# 일정 등록 카드의 iPhone Safari 너비 보강

사용자에게 확인한 발생 환경: iPhone Safari. 동일 현상은 Chrome 및 데스크톱 WebKit(모바일 UA/viewport 포함)에서는 직접 재현되지 않았다. 실제 iPhone의 원인 확정/해결 확인으로 보고하지 않는다.

보강: 입력 행의 암시적 auto grid를 minmax(0,1fr)로 명시, input max-width 100%, 카드 max-width를 min(680px,100%)로 제한, form/fieldset/스크롤 컨테이너 축소 가능 너비 명시, 네이티브 Safari 날짜·시간 appearance와 표시값 최소 너비 정규화. overflow:hidden으로 내용을 자르지 않는다. 시간 행·일정 데이터·저장 로직은 유지한다.

검증: 빌드와 일정 편집 테스트 10개 통과. Chrome 및 WebKit 모바일 에뮬레이션에서 320/375/390/430/768px 총10화면, 카드/스크롤과 모든 내부 요소 scrollWidth/clientWidth 측정 시 가로 넘침 없음. before.json은 수정 전, measure.json은 수정 후. 실제 DB 쓰기 없음. 4180 서버 재시작. 실물 iPhone 재확인이 필요하다.
