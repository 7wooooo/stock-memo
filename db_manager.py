#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
StockVentura SQLite 데이터베이스 매니저 (db_manager.py)
- 매매 내역, 누적 손익(-138,800,000원 기준), 매매 스타일 분석, 테마 및 추천주 보관
"""

import sqlite3
import os
import re
import json
from datetime import datetime

BASE_DIR = "/Users/jokyle/Desktop/stock-memo"
DB_PATH = os.path.join(BASE_DIR, "stock_data.db")
TRADES_DIR = os.path.join(BASE_DIR, "trades")
INITIAL_LOSS = -138800000  # 누적 손실 기준 금액

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """데이터베이스 테이블 생성 및 초기화"""
    conn = get_db()
    cursor = conn.cursor()

    # 1. 개별 매매 기록 테이블
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        trade_date TEXT,
        exit_date TEXT,
        stock_name TEXT,
        stock_code TEXT,
        trade_type TEXT,
        strategy TEXT,
        buy_price REAL,
        qty INTEGER,
        target_price REAL,
        stop_price REAL,
        sell_price REAL,
        pnl REAL,
        return_rate REAL,
        discipline TEXT,
        notes TEXT,
        file_path TEXT,
        created_at TEXT
    )
    """)

    # 2. 누적 계좌 손익 히스토리 테이블
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS account_history (
        date TEXT PRIMARY KEY,
        cumulative_pnl REAL,
        daily_pnl REAL,
        total_trades INTEGER,
        win_count INTEGER,
        loss_count INTEGER,
        win_rate REAL,
        profit_factor REAL,
        impulse_count INTEGER,
        updated_at TEXT
    )
    """)

    # 3. 매일 AI 추천 종목 히스토리 테이블
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        rank INTEGER,
        stock_name TEXT,
        stock_code TEXT,
        current_price REAL,
        target_price REAL,
        upside_rate REAL,
        rr_ratio REAL,
        catalyst TEXT,
        sector TEXT
    )
    """)

    # 4. 핵심 메가 테마 데이터베이스
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS themes (
        theme_name TEXT PRIMARY KEY,
        stage TEXT,
        leader_stocks TEXT,
        sub_stocks TEXT,
        reason TEXT,
        updated_at TEXT
    )
    """)

    conn.commit()
    conn.close()
    print(f"✅ SQLite DB 초기화 완료: {DB_PATH}")

def parse_markdown_trade(file_path):
    """trades/ 폴더 안의 개별 마크다운 파일 파싱"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        filename = os.path.basename(file_path)
        trade_id = filename.replace(".md", "")

        # 정규표현식으로 핵심 필드 추출
        def get_val(pattern, default=""):
            m = re.search(pattern, content)
            return m.group(1).strip() if m else default

        stock_match = get_val(r"종목명\s*\(코드\)?\s*:\s*([가-힣A-Za-z0-9]+(?:\s*\(\d{6}\))?)")
        stock_name = stock_match.split("(")[0].strip() if stock_match else "알수없음"
        stock_code_m = re.search(r"\((\d{6})\)", stock_match)
        stock_code = stock_code_m.group(1) if stock_code_m else ""

        trade_date = get_val(r"매매\s*일자\s*:\s*([0-9\-~]+)")
        trade_type = get_val(r"매매\s*유형\s*:\s*([가-힣A-Za-z0-9\s/]+)", "스윙")
        strategy = get_val(r"진입\s*전략\s*:\s*([가-힣A-Za-z0-9\s/]+)", "기본")

        buy_price = float(re.sub(r"[^\d.]", "", get_val(r"매수가\s*\(평단가\)?\s*:\s*([0-9,]+)", "0")) or 0)
        qty = int(re.sub(r"[^\d]", "", get_val(r"매수\s*수량\s*:\s*([0-9,]+)", "0")) or 0)
        target_price = float(re.sub(r"[^\d.]", "", get_val(r"목표가\s*\(Take\s*Profit\)?\s*:\s*([0-9,]+)", "0")) or 0)
        stop_price = float(re.sub(r"[^\d.]", "", get_val(r"절대\s*손절가\s*\(Stop\s*Loss\)?\s*:\s*([0-9,]+)", "0")) or 0)
        sell_price = float(re.sub(r"[^\d.]", "", get_val(r"매도가\s*\(청산가\)?\s*:\s*([0-9,]+)", "0")) or 0)

        # 실현손익 추출 (음수 부호 보존)
        pnl_raw = get_val(r"실현\s*손익\s*:\s*([+\-0-9,]+)")
        is_negative = "-" in pnl_raw
        pnl_val = float(re.sub(r"[^\d.]", "", pnl_raw) or 0)
        pnl = -pnl_val if is_negative else pnl_val

        # 손익이 0이면 계산으로 도출
        if pnl == 0 and sell_price > 0 and buy_price > 0 and qty > 0:
            pnl = (sell_price - buy_price) * qty

        return_rate = ((sell_price - buy_price) / buy_price * 100) if buy_price > 0 else 0
        discipline = get_val(r"원칙\s*준수\s*여부\s*:\s*([가-힣\s()]+)", "원칙준수")

        notes = get_val(r"## 5\.\s*복기\s*및\s*마인드셋\s*교훈\s*([\s\S]*?)$", "")

        return {
            "id": trade_id,
            "trade_date": trade_date,
            "exit_date": trade_date,
            "stock_name": stock_name,
            "stock_code": stock_code,
            "trade_type": trade_type,
            "strategy": strategy,
            "buy_price": buy_price,
            "qty": qty,
            "target_price": target_price,
            "stop_price": stop_price,
            "sell_price": sell_price,
            "pnl": pnl,
            "return_rate": return_rate,
            "discipline": discipline,
            "notes": notes.strip(),
            "file_path": file_path,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return None

def sync_trades_from_folder():
    """trades/ 폴더의 모든 마크다운 매매일지를 DB로 동기화"""
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    synced_count = 0
    if os.path.exists(TRADES_DIR):
        for fname in os.listdir(TRADES_DIR):
            if fname.endswith(".md") and fname != "매매일지_템플릿.md" and "스타일" not in fname:
                fpath = os.path.join(TRADES_DIR, fname)
                t = parse_markdown_trade(fpath)
                if t:
                    cursor.execute("""
                    INSERT OR REPLACE INTO trades 
                    (id, trade_date, exit_date, stock_name, stock_code, trade_type, strategy,
                     buy_price, qty, target_price, stop_price, sell_price, pnl, return_rate,
                     discipline, notes, file_path, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        t["id"], t["trade_date"], t["exit_date"], t["stock_name"], t["stock_code"],
                        t["trade_type"], t["strategy"], t["buy_price"], t["qty"], t["target_price"],
                        t["stop_price"], t["sell_price"], t["pnl"], t["return_rate"],
                        t["discipline"], t["notes"], t["file_path"], t["created_at"]
                    ))
                    synced_count += 1

    conn.commit()
    conn.close()
    print(f"✅ 매매일지 동기화 완료: {synced_count}건")
    return calculate_account_summary()

def calculate_account_summary():
    """누적 손익(-138,800,000원 기준) 및 매매 스타일 통계 계산"""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM trades")
    trades = cursor.fetchall()

    realized_pnl_sum = 0
    win_count = 0
    loss_count = 0
    total_gain = 0
    total_loss = 0
    impulse_count = 0

    for t in trades:
        pnl = t["pnl"]
        realized_pnl_sum += pnl
        if pnl > 0:
            win_count += 1
            total_gain += pnl
        elif pnl < 0:
            loss_count += 1
            total_loss += abs(pnl)

        disc = t["discipline"]
        if "뇌동" in disc or "지연" in disc:
            impulse_count += 1

    total_trades = len(trades)
    win_rate = (win_count / total_trades * 100) if total_trades > 0 else 0.0
    profit_factor = (total_gain / total_loss) if total_loss > 0 else (99.9 if total_gain > 0 else 0.0)
    
    current_cumulative_pnl = INITIAL_LOSS + realized_pnl_sum
    today_str = datetime.now().strftime("%Y-%m-%d")

    cursor.execute("""
    INSERT OR REPLACE INTO account_history
    (date, cumulative_pnl, daily_pnl, total_trades, win_count, loss_count, win_rate, profit_factor, impulse_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        today_str, current_cumulative_pnl, realized_pnl_sum, total_trades,
        win_count, loss_count, win_rate, profit_factor, impulse_count,
        datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ))

    conn.commit()
    conn.close()

    summary = {
        "current_cumulative_pnl": current_cumulative_pnl,
        "initial_loss": INITIAL_LOSS,
        "realized_pnl_sum": realized_pnl_sum,
        "total_trades": total_trades,
        "win_count": win_count,
        "loss_count": loss_count,
        "win_rate": round(win_rate, 1),
        "profit_factor": round(profit_factor, 2),
        "impulse_count": impulse_count
    }
    print(f"📊 누적 손익 집계 완료: {current_cumulative_pnl:,.0f}원 (신규 실현: {realized_pnl_sum:+,.0f}원)")
    return summary

if __name__ == "__main__":
    init_db()
    sync_trades_from_folder()
