terraform {
  required_version = ">= 1.6"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.38"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 3.1"
    }
  }

  # Стан зберігається в самому кластері: Secret tfstate-<workspace>-restaurant-booking
  # у просторі імен default; блокування — через Lease (одночасний apply неможливий).
  # Кожен робочий простір (dev, staging, prod) має окремий стан.
  backend "kubernetes" {
    secret_suffix = "restaurant-booking"
    namespace     = "default"
    config_path   = "~/.kube/config"
  }
}
