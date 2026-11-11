variable "kubeconfig" {
  description = "Шлях до kubeconfig"
  type        = string
  default     = "~/.kube/config"
}

variable "kube_context" {
  description = "Контекст kubeconfig: minikube локально, kind-booking у CI"
  type        = string
  default     = "minikube"
}

variable "image_tag" {
  description = "Тег образів booking-service і booking-frontend у ghcr.io (коміт або гілка)"
  type        = string
  default     = "main"
}

variable "image_pull_policy" {
  description = "Always — завжди тягнути з реєстру; Never — образи вже завантажено в кластер (kind у CI)"
  type        = string
  default     = "IfNotPresent"

  validation {
    condition     = contains(["Always", "IfNotPresent", "Never"], var.image_pull_policy)
    error_message = "image_pull_policy: Always, IfNotPresent або Never."
  }
}

variable "ingress_enabled" {
  description = "Створювати Ingress (потрібен контролер ingress-nginx; у kind у CI його немає)"
  type        = bool
  default     = true
}
