output "environment" {
  description = "Середовище (робочий простір Terraform)"
  value       = terraform.workspace
}

output "namespace" {
  description = "Простір імен Kubernetes середовища"
  value       = module.booking.namespace
}

output "release" {
  description = "Helm-реліз застосунку: назва, ревізія, стан"
  value       = module.booking.release
}

output "url" {
  description = "Адреса веб-інтерфейсу"
  value       = module.booking.url
}
