output "public_ip" {
  value = aws_instance.app.public_ip
}

output "deploy_path" {
  value = "/opt/${var.project_name}"
}
