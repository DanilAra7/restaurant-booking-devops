variable "environment" {
  description = "Назва середовища: dev, staging або prod"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Оберіть робочий простір dev, staging або prod: terraform workspace select dev."
  }
}

variable "settings" {
  description = "Параметри середовища: репліки, автомасштабування, хост Ingress, том БД, квоти"
  type = object({
    host              = string
    service_replicas  = number
    autoscaling       = object({ enabled = bool, min = number, max = number })
    frontend_replicas = number
    db_storage        = string
    quota             = object({ cpu = string, memory = string, pods = number })
  })
  default = null
}

variable "chart_path" {
  description = "Шлях до Helm-чарта застосунку (deploy/helm/restaurant-booking)"
  type        = string
}

variable "image_tag" {
  description = "Тег образів застосунку"
  type        = string
}

variable "image_pull_policy" {
  description = "imagePullPolicy контейнерів застосунку"
  type        = string
  default     = "IfNotPresent"
}

variable "monitoring_enabled" {
  description = "ServiceMonitor, правила сповіщень і дашборд Grafana (потрібен kube-prometheus-stack)"
  type        = bool
  default     = false
}

variable "db_password" {
  description = "Пароль PostgreSQL із Vault; null — чарт генерує пароль сам"
  type        = string
  default     = null
  sensitive   = true
}

variable "ingress_enabled" {
  description = "Створювати Ingress з TLS"
  type        = bool
  default     = true
}
