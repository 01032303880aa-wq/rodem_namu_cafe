# 링크로 공유하는 방법

이 앱을 링크 하나로 공유하려면 인터넷 서버에 배포해야 합니다.
배포가 끝나면 아래처럼 누구나 접속 가능한 주소가 생깁니다.

https://rodemnamu-cafe.onrender.com

## 가장 쉬운 방법: Render

1. GitHub에 새 저장소를 만듭니다.
2. 이 cafe-order-app 폴더 안의 파일을 저장소에 올립니다.
3. Render.com에 로그인합니다.
4. New > Web Service를 선택합니다.
5. GitHub 저장소를 연결합니다.
6. 설정값을 아래처럼 둡니다.

Name: rodemnamu-cafe
Runtime: Node
Build Command: npm install
Start Command: node server.js

7. Environment Variables에 아래 값을 넣습니다.

STAFF_PASSWORD=cafe1234
DATA_DIR=/var/data

8. 배포가 끝나면 Render가 만든 https://... 주소를 손님과 직원에게 공유합니다.

## 직원 사용

공유 링크에 접속한 뒤 직원 전용 비밀번호를 입력합니다.
기본 비밀번호는 cafe1234 입니다.

직원 화면에서 할 수 있는 것:
- 주문 확인
- 완료 처리
- 완료 주문 정리
- 전체 초기화
- 주문 마감 / 주문 재개

## 손님 사용

공유 링크에 접속해서 이름, 메뉴, 픽업/배달 여부를 선택합니다.
주문 마감 상태에서는 주문 마감 창이 뜨고 주문할 수 없습니다.
