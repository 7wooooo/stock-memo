#!/bin/bash
# ========================================================
# StockVentura 23:00(KST) 자동 실행 & 깃 푸시 스크립트
# ========================================================

REPO_DIR="/Users/jokyle/Desktop/stock-memo"
cd "$REPO_DIR" || exit 1

# 파이썬 3 마스터 파이프라인 실행 (DB 동기화 + 크롤링 + README 갱신 + Git 푸시)
python3 daily_pipeline.py >> "$REPO_DIR/daily_execution.log" 2>&1
