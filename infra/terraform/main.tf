# Інфраструктура індивідуального проєкту «Система онлайн-бронювання столиків»
# (етап 4 плану: інфраструктура як код).
#
# Той самий код описує три середовища; середовище = робочий простір Terraform:
#   terraform workspace select dev|staging|prod
#   terraform apply
# Середовища відрізняються лише даними нижче.

locals {
  environments = {
    dev = {
      host              = "dev.booking.local"
      service_replicas  = 1
      autoscaling       = { enabled = false, min = 1, max = 1 }
      frontend_replicas = 1
      db_storage        = "512Mi"
      quota             = { cpu = "2", memory = "1Gi", pods = 10 }
    }
    staging = {
      host              = "staging.booking.local"
      service_replicas  = 2
      autoscaling       = { enabled = false, min = 2, max = 2 }
      frontend_replicas = 1
      db_storage        = "1Gi"
      quota             = { cpu = "3", memory = "1536Mi", pods = 12 }
    }
    prod = {
      host              = "prod.booking.local"
      service_replicas  = 2
      autoscaling       = { enabled = true, min = 2, max = 6 }
      frontend_replicas = 2
      db_storage        = "2Gi"
      quota             = { cpu = "6", memory = "3Gi", pods = 20 }
    }
  }
}

module "booking" {
  source = "./modules/booking-environment"

  environment        = terraform.workspace
  settings           = lookup(local.environments, terraform.workspace, null)
  chart_path         = "${path.root}/../../deploy/helm/restaurant-booking"
  image_tag          = var.image_tag
  image_pull_policy  = var.image_pull_policy
  ingress_enabled    = var.ingress_enabled
  monitoring_enabled = var.monitoring_enabled
  db_password        = var.db_password
}
