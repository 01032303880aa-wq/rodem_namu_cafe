# 인터넷 어디서든 같이 쓰는 방법

같은 Wi-Fi가 아니어도 쓰려면 이 앱을 인터넷 서버에 올려야 합니다.
완성 후에는 손님과 직원 모두 같은 공개 주소로 접속합니다.

예시 주소:
https://rodemnamu-cafe.onrender.com

## 가장 쉬운 방식

1. 이 cafe-order-app 폴더를 GitHub 저장소에 올립니다.
2. Node.js 웹앱을 지원하는 호스팅 서비스에 연결합니다.
   예: Render, Railway, Fly.io 등
3. 시작 명령은 아래처럼 설정합니다.

   node server.js

4. 환경 변수를 설정합니다.

   STAFF_PASSWORD=cafe1234
   DATA_DIR=/var/data

5. 배포가 끝나면 만들어진 공개 주소를 손님에게 공유합니다.

## 중요한 점

- 직원 PC가 꺼져 있어도 앱이 계속 열리려면 클라우드 서버에 배포해야 합니다.
- 주문 데이터가 사라지지 않으려면 호스팅 서비스에서 persistent disk, volume, database 중 하나를 연결해야 합니다.
- STAFF_PASSWORD 값을 바꾸면 직원 화면 비밀번호를 바꿀 수 있습니다.

## 지금 파일 상태

이 폴더는 클라우드 배포용으로 준비되어 있습니다.
- package.json
- server.js
- render.yaml
- index.html, styles.css, app.js

## 주문 마감 기능

직원 화면에 들어가면 주문 마감 버튼이 있습니다.
- 주문 가능 상태: 손님이 주문할 수 있습니다.
- 주문 마감 상태: 손님 화면에 주문 마감 창이 뜨고 주문이 접수되지 않습니다.
- 주문 재개를 누르면 다시 주문할 수 있습니다.

마감 상태는 settings.json 또는 배포 서버의 DATA_DIR 저장 위치에 저장됩니다.
