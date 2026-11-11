"""Генерує grafana-dashboard.json — дашборд сервісу бронювання (етап 5).

    python deploy/helm/restaurant-booking/files/build_dashboard.py

__NAMESPACE__ чарт замінює на простір імен випуску (templates/monitoring.yaml),
тож у кожного середовища свій дашборд. Джерело даних — Prometheus з
kube-prometheus-stack (uid prometheus).
"""
import json
import pathlib

DS = {"type": "prometheus", "uid": "prometheus"}
NS = 'namespace="__NAMESPACE__"'
panels = []


def target(expr, legend="", ref="A"):
    return {"datasource": DS, "expr": expr, "legendFormat": legend, "refId": ref}


def stat(title, expr, x, unit="short", decimals=None, thresholds=None, legend=""):
    p = {
        "type": "stat", "title": title, "datasource": DS,
        "gridPos": {"x": x, "y": 0, "w": 4 if x < 16 else 8, "h": 4},
        "targets": [target(expr, legend)],
        "options": {"reduceOptions": {"calcs": ["lastNotNull"]}, "colorMode": "background", "graphMode": "area"},
        "fieldConfig": {"defaults": {"unit": unit, "thresholds": {"mode": "absolute", "steps": thresholds or [{"color": "green", "value": None}]}}},
    }
    if decimals is not None:
        p["fieldConfig"]["defaults"]["decimals"] = decimals
    panels.append(p)


def series(title, targets, x, y, unit="short", w=12):
    panels.append({
        "type": "timeseries", "title": title, "datasource": DS,
        "gridPos": {"x": x, "y": y, "w": w, "h": 8},
        "targets": [target(e, l, chr(65 + i)) for i, (e, l) in enumerate(targets)],
        "fieldConfig": {"defaults": {"unit": unit, "custom": {"fillOpacity": 10, "lineWidth": 2}}},
        "options": {"legend": {"displayMode": "list", "placement": "bottom"}, "tooltip": {"mode": "multi"}},
    })


RED, GREEN, ORANGE = "red", "green", "orange"
stat("Поди booking-service (up)", f'sum(up{{job="booking-service",{NS}}})', 0,
     thresholds=[{"color": RED, "value": None}, {"color": GREEN, "value": 1}])
stat("Запитів за секунду", f'sum(rate(http_requests_total{{{NS}}}[5m]))', 4, unit="reqps", decimals=2)
stat("Частка помилок 5xx", f'sum(rate(http_requests_total{{{NS},status=~"5.."}}[5m])) / sum(rate(http_requests_total{{{NS}}}[5m])) or vector(0)', 8,
     unit="percentunit", decimals=1, thresholds=[{"color": GREEN, "value": None}, {"color": RED, "value": 0.05}])
stat("Час відповіді p95", f'histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{{{NS},route!~"/health.*"}}[5m])))', 12,
     unit="s", decimals=3, thresholds=[{"color": GREEN, "value": None}, {"color": ORANGE, "value": 0.25}, {"color": RED, "value": 0.5}])
stat("Бронювань за 24 год", f'sum(increase(booking_requests_total{{{NS},result="created"}}[24h]))', 16, decimals=0)

series("Запити за маршрутом", [(f'sum by (route) (rate(http_requests_total{{{NS}}}[5m]))', "{{route}}")], 0, 4, unit="reqps")
series("Час відповіді", [
    (f'histogram_quantile(0.50, sum by (le) (rate(http_request_duration_seconds_bucket{{{NS},route!~"/health.*"}}[5m])))', "p50"),
    (f'histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{{{NS},route!~"/health.*"}}[5m])))', "p95"),
    (f'histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket{{{NS},route!~"/health.*"}}[5m])))', "p99"),
], 12, 4, unit="s")
series("Спроби бронювання за результатом", [(f'sum by (result) (rate(booking_requests_total{{{NS}}}[5m]))', "{{result}}")], 0, 12, unit="ops")
series("Репліки booking-service (HPA)", [
    (f'kube_deployment_status_replicas_available{{deployment="booking-service",{NS}}}', "доступні"),
    (f'kube_horizontalpodautoscaler_status_desired_replicas{{horizontalpodautoscaler="booking-service",{NS}}}', "бажані (HPA)"),
], 12, 12)
series("Пам'ять процесів", [(f'booking_process_resident_memory_bytes{{{NS}}}', "{{pod}}")], 0, 20, unit="bytes")
series("CPU процесів", [(f'rate(booking_process_cpu_seconds_total{{{NS}}}[5m])', "{{pod}}")], 12, 20, unit="short")

dashboard = {
    "uid": "booking-__NAMESPACE__",
    "title": "Restaurant booking (__NAMESPACE__)",
    "tags": ["restaurant-booking"],
    "timezone": "browser",
    "refresh": "30s",
    "time": {"from": "now-1h", "to": "now"},
    "schemaVersion": 39,
    "panels": [dict(p, id=i + 1) for i, p in enumerate(panels)],
}

out = pathlib.Path(__file__).with_name("grafana-dashboard.json")
with open(out, "w", encoding="utf-8", newline="\n") as f:
    f.write(json.dumps(dashboard, ensure_ascii=False, indent=2) + "\n")
print(f"written {out.name}: {len(panels)} panels")
