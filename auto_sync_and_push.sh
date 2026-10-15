#!/bin/bash
# ========================================================
# StockVentura 매일 저녁 21:00 자동 리서치 & GitHub 푸시 스크립트
# ========================================================

REPO_DIR="/Users/jokyle/Desktop/stock-memo"
cd "$REPO_DIR" || exit 1

echo "=========================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 데일리 마켓 데이터 수집 및 분석 시작..."
echo "=========================================="

# 1. 파이썬 수집 엔진 실행 (4개 사이트 크롤링 및 분석)
python3 daily_collector.py

# 2. 변경사항 Git 커밋 & 푸시
git add .

STATUS=$(git status --porcelain)
if [ -n "$STATUS" ]; then
    COMMIT_MSG="docs: 데일리 마켓 브리핑 및 추천 5선 업데이트 ($(date '+%Y-%m-%d %H:%M'))"
    git commit -m "$COMMIT_MSG"
    
    # 원격 저장소가 설정되어 있을 때만 푸시
    if git remote get-url origin > /dev/null 2>&1; then
        echo "GitHub 원격 저장소로 자동 푸시 진행 중..."
        git push origin main
        echo "✅ GitHub 푸시 완료!"
    else
        echo "⚠️ 아직 GitHub 원격 저장소(origin)가 설정되지 않았습니다."
        echo "   아래 명령어로 한 번만 원격 저장소를 연결해주세요:"
        echo "   git remote add origin https://github.com/<사용자명>/<저장소명>.git"
        echo "   git push -u origin main"
    fi
else
    echo "변경사항이 없습니다."
fi

echo "=========================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 동기화 작업 완료!"
echo "=========================================="
