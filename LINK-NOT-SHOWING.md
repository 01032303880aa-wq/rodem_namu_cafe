# 링크가 안 나올 때

start-public-link.bat을 실행했는데 https://...trycloudflare.com 주소가 안 나오면 보통 아래 둘 중 하나입니다.

## 1. cloudflared가 설치되어 있지 않음

공개 링크를 만들려면 cloudflared가 필요합니다.
회원가입은 필요 없지만 프로그램 설치는 필요합니다.

공식 다운로드 페이지:
https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/

설치 후 start-public-link.bat을 다시 실행하세요.

## 2. 창이 바로 닫힘

새로 고친 start-public-link.bat은 오류가 나도 창이 닫히지 않고 이유를 보여줍니다.
그 창에 나온 문장을 확인하면 됩니다.

## 정상일 때 보이는 주소

정상 실행되면 창에 아래처럼 표시됩니다.

https://무작위이름.trycloudflare.com

이 주소가 손님들에게 보내는 링크입니다.
