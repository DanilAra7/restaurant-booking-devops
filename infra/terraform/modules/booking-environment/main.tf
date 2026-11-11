# Одне середовище застосунку бронювання: окремий простір імен з квотами
# ресурсів і Helm-реліз чарта deploy/helm/restaurant-booking у ньому.

locals {
  namespace = "booking-${var.environment}"
  labels = {
    "app.kubernetes.io/part-of"    = "restaurant-booking"
    "app.kubernetes.io/managed-by" = "terraform"
    "environment"                  = var.environment
  }
}

resource "kubernetes_namespace_v1" "env" {
  metadata {
    name   = local.namespace
    labels = local.labels
  }
}

# Квота не дає одному середовищу (наприклад, dev) забрати ресурси кластера в інших
resource "kubernetes_resource_quota_v1" "env" {
  metadata {
    name      = "${local.namespace}-quota"
    namespace = kubernetes_namespace_v1.env.metadata[0].name
    labels    = local.labels
  }

  spec {
    hard = {
      "limits.cpu"             = var.settings.quota.cpu
      "limits.memory"          = var.settings.quota.memory
      "pods"                   = var.settings.quota.pods
      "persistentvolumeclaims" = 2
    }
  }
}

# Значення за замовчуванням для контейнерів без resources (наприклад, под helm test):
# за наявності квоти на limits такі поди інакше не створюються
resource "kubernetes_limit_range_v1" "env" {
  metadata {
    name      = "${local.namespace}-defaults"
    namespace = kubernetes_namespace_v1.env.metadata[0].name
    labels    = local.labels
  }

  spec {
    limit {
      type            = "Container"
      default         = { cpu = "100m", memory = "64Mi" }
      default_request = { cpu = "20m", memory = "32Mi" }
    }
  }
}

resource "helm_release" "booking" {
  name      = "booking"
  chart     = var.chart_path
  namespace = kubernetes_namespace_v1.env.metadata[0].name

  # чекати, доки всі поди стануть Ready; невдале оновлення відкочується
  wait    = true
  atomic  = true
  timeout = 300

  values = [yamlencode({
    image = {
      tag        = var.image_tag
      pullPolicy = var.image_pull_policy
    }
    bookingService = {
      replicaCount = var.settings.service_replicas
      autoscaling = {
        enabled     = var.settings.autoscaling.enabled
        minReplicas = var.settings.autoscaling.min
        maxReplicas = var.settings.autoscaling.max
      }
    }
    frontend = {
      replicaCount = var.settings.frontend_replicas
    }
    postgresql = {
      storage = var.settings.db_storage
    }
    ingress = {
      enabled = var.ingress_enabled
      host    = var.settings.host
    }
  })]

  depends_on = [kubernetes_resource_quota_v1.env, kubernetes_limit_range_v1.env]
}
