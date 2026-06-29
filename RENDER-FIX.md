# Render 서버 오류 해결

주문할 때 "서버 오류가 발생했습니다."가 뜨면, Render 무료 서버에서 DATA_DIR=/var/data 저장 경로를 쓸 수 없어서 생긴 문제일 가능성이 큽니다.

## 해결 방법

1. GitHub 저장소에 수정된 파일을 다시 올립니다.
2. Render의 Environment Variables에서 DATA_DIR을 삭제합니다.
3. STAFF_PASSWORD=cafe1234만 남깁니다.
4. Render에서 Manual Deploy > Deploy latest commit을 누릅니다.

## Render 환경변수

필수:
STAFF_PASSWORD=cafe1234

삭제:
DATA_DIR

## 참고

무료 Render에서는 서버가 재시작되면 주문 기록이 사라질 수 있습니다. 하루 행사나 테스트용으로는 괜찮고, 주문 기록을 오래 보관하려면 나중에 데이터베이스를 연결하면 됩니다.
