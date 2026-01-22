[브런치에서 작업한 걸 커밋하는 방법]

1️⃣ feature 브랜치에서 작업 내용 커밋
git status
git add .
git commit -m "기능 구현"

2️⃣ main 브랜치로 이동
git checkout main

3️⃣ main을 최신 상태로 맞추기 (중요)
git pull origin main


⚠️ 이거 안 하면 나중에 충돌 확률 ↑

4️⃣ feature 브랜치를 main에 병합
git merge feature/front


충돌 없으면 → 바로 병합됨

충돌 나면 → 파일 수정 → git add → git commit

5️⃣ main을 원격 저장소에 push
git push origin main


🎉 끝. 이제 GitHub의 main에 반영됨

[불러오는 방법]
git checkout feature/front
git pull origin main