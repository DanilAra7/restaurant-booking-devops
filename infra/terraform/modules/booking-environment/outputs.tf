output "namespace" {
  description = "Простір імен середовища"
  value       = kubernetes_namespace_v1.env.metadata[0].name
}

output "release" {
  description = "Helm-реліз: назва, ревізія, стан, версія застосунку"
  value = {
    name     = helm_release.booking.name
    revision = helm_release.booking.metadata.revision
    status   = helm_release.booking.status
    app      = helm_release.booking.metadata.app_version
  }
}

output "url" {
  description = "Адреса веб-інтерфейсу (Ingress з TLS) або команда port-forward"
  value = (var.ingress_enabled
    ? "https://${var.settings.host}/"
  : "kubectl -n ${kubernetes_namespace_v1.env.metadata[0].name} port-forward svc/booking-frontend 8080:80")
}
