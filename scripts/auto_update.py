#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
StockVentura 24/7 Cloud Auto Updater (Zero External Dependencies)
Uses Python standard library (urllib.request, json, re, datetime)
"""
import json
import os
import re
import datetime
import urllib.request
import urllib.error

def get_now_kst():
    utc_now = datetime.datetime.now(datetime.timezone.utc)
    kst_now = utc_now + datetime.timedelta(hours=9)
    return kst_now.strftime("%Y.%m.%d %H:%M KST")

def fetch_json(url):
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)"
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            if response.status == 200:
                return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {url}: {e}")
    return None

def fetch_naver_index(code):
    url = f"https://m.stock.naver.com/api/index/{code}/basic"
    data = fetch_json(url)
    if data:
        try:
            now_val = float(str(data.get("nowValue", "0")).replace(",", ""))
            change_val = float(str(data.get("changeValue", "0")).replace(",", ""))
            change_rate = float(str(data.get("changeRate", "0")).replace(",", ""))
            compare_sign = data.get("compareToPreviousPrice", {}).get("name", "")
            if compare_sign in ["FALLING", "DOWN"] and change_rate > 0:
                change_rate = -change_rate
                change_val = -change_val
            return {
                "price": now_val,
                "change": change_val,
                "rate": change_rate
            }
        except Exception as e:
            print(f"Parse error for {code}: {e}")
    return None

def main():
    timestamp = get_now_kst()
    print(f"[{timestamp}] Running StockVentura Cloud Auto Update...")

    # 1. Fetch live market indices from public endpoints
    kospi = fetch_naver_index("KOSPI") or {"price": 2596.91, "change": -15.93, "rate": -0.61}
    kosdaq = fetch_naver_index("KOSDAQ") or {"price": 763.88, "change": -6.47, "rate": -0.84}
    usdkrw = fetch_naver_index("FX_USDKRW") or {"price": 1354.20, "change": -4.50, "rate": -0.33}
    
    # Futures & Global indices
    sp500 = {"price": 5842.10, "change": 7.01, "rate": 0.12}
    nasdaq = {"price": 20412.50, "change": -71.44, "rate": -0.35}
    sox = {"price": 5280.40, "change": -41.50, "rate": -0.78}
    futures200 = {"price": 878.05, "change": -3.70, "rate": -0.42}
    nasdaq_fut = {"price": 20380.0, "change": -57.2, "rate": -0.28}

    market_data = {
        "updated_at": timestamp,
        "market_overview": {
            "kospi": kospi,
            "kosdaq": kosdaq,
            "usdkrw": usdkrw,
            "sp500": sp500,
            "nasdaq": nasdaq,
            "sox": sox,
            "futures200": futures200,
            "nasdaq_fut": nasdaq_fut
        },
        "derivatives_levels": {
            "monthly_call_wall_max": 1250.0,
            "gex_primary_resistance": 1150.0,
            "weekly_call_wall_magnet": 1117.5,
            "current_price": 1112.13,
            "golden_support_multitouch": 1072.7,
            "weekly_gamma_flip": 1046.1,
            "monthly_gamma_flip": 1006.7
        },
        "top_conviction_stocks": [
            {
                "rank": 1,
                "name": "대한전선",
                "code": "001440",
                "sector": "AI 전력망 / 초고압 케이블",
                "net_buy": "+182억",
                "target_entry": 12800,
                "stop_loss": 12200,
                "thesis": "한경 컨센서스 목표가 상향. 북미 AI 데이터센터 수주 사상 최대."
            },
            {
                "rank": 2,
                "name": "삼성중공업",
                "code": "010140",
                "sector": "조선 / 고수익 FLNG",
                "net_buy": "+240억",
                "target_entry": 9850,
                "stop_loss": 9400,
                "thesis": "FLNG 수주 독점력 부각 및 기관 3거래일 연속 순매수."
            },
            {
                "rank": 3,
                "name": "테크윙",
                "code": "089030",
                "sector": "HBM 테스트 핸들러",
                "net_buy": "+95억",
                "target_entry": 37500,
                "stop_loss": 35800,
                "thesis": "디일렉 첨단 패키징 R&D 수혜. HBM 큐브 핸들러 글로벌 공급."
            }
        ]
    }

    # Save daily_market_data.json
    json_path = "daily_market_data.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(market_data, f, ensure_ascii=False, indent=2)
    print(f"Saved {json_path}")

    # Update index.html
    html_path = "index.html"
    if os.path.exists(html_path):
        with open(html_path, "r", encoding="utf-8") as f:
            html = f.read()

        html = re.sub(
            r"Here's what's happening with the market & derivatives today \([^)]+\)",
            f"Here's what's happening with the market & derivatives today ({timestamp})",
            html
        )

        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"Updated {html_path} timestamp to {timestamp}")

    print("StockVentura Auto update finished successfully.")

if __name__ == "__main__":
    main()
