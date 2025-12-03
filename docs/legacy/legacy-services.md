# HISTORICAL — DO NOT RUN IN PRODUCTION

# Legacy Systemd Services

## meshserver.service
(Conteúdo antigo — para referência, não recomendado)

[Unit]
Description=Legacy MeshServer
After=network.target

[Service]
ExecStart=/opt/rustdesk-mesh/meshserver
Restart=always

[Install]
WantedBy=multi-user.target
