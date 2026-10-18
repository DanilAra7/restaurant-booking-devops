{{/* Спільні мітки всіх ресурсів випуску */}}
{{- define "booking.labels" -}}
app.kubernetes.io/part-of: restaurant-booking
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end }}

{{/* Мітки-селектори компонента: include "booking.selector" (list . "booking-service") */}}
{{- define "booking.selector" -}}
app.kubernetes.io/name: {{ index . 1 }}
app.kubernetes.io/instance: {{ (index . 0).Release.Name }}
{{- end }}

{{/* Повне ім'я образу сервісу проєкту: include "booking.image" (list . .Values.frontend.image) */}}
{{- define "booking.image" -}}
{{- $root := index . 0 -}}
{{ $root.Values.image.registry }}/{{ index . 1 }}:{{ $root.Values.image.tag | default $root.Chart.AppVersion }}
{{- end }}

{{- define "booking.dbSecret" -}}{{ .Values.postgresql.name }}-auth{{- end }}
