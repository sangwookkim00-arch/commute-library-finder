# Commute Library Finder

강남역-길음역 출퇴근 생활권에서 아이가 필요한 책을 찾고, 8개 구 도서관의 현재 대출 가능 여부를 확인하는 작은 모바일 웹앱입니다.

## 대상 구

- 강남구
- 서초구
- 동작구
- 용산구
- 중구
- 종로구
- 성북구
- 강북구

## 실행

```bash
npm start
```

기본 주소는 `http://localhost:4173`입니다. 배포 환경에서는 `PORT` 환경변수를 자동으로 사용합니다.

## 배포

Render Free Web Service 기준으로 `render.yaml`을 포함했습니다.

- Build Command: `npm install`
- Start Command: `npm start`

Data4Library 조회는 기본 hosted k-skill-proxy를 사용하므로 별도 API 키가 필요하지 않습니다.
