🛰️ AI Remote Deployment Instructions

(Instalação ANTIGA – Pode ser alterada pelo AI conforme necessário)

RustDesk MeshServer — Droplet Deployment (Legacy)

Este documento descreve como o AI deve executar operações remotas (SSH/SCP) no droplet,
com base na instalação antiga do RustDesk MeshServer.

Serve apenas como referência histórica.
O AI está autorizado a alterar, otimizar ou substituir este processo sempre que necessário.

⸻

1. 📌 Objetivo

Permitir que o AI execute operações remotas seguras no droplet 142.93.106.94, incluindo:
	•	Acesso via SSH
	•	Envio de ficheiros por SCP
	•	Atualização de binários
	•	Reinício de serviços
	•	Verificação de logs
	•	Auditoria da estrutura antiga
	•	Migração para instalação nova, quando aplicável

⸻

2. 🔑 Acesso SSH ao droplet (ANTIGO)

2.1 Como o AI deve conectar:

Sempre usar o IP explícito:

ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@142.93.106.94

Justificações:
	•	Evita bloqueios de fingerprint
	•	É compatível com execução automatizada
	•	Evita erros de hostname/dns

2.2 Regras de segurança:

O AI NÃO deve:
	•	Criar novas chaves SSH sem autorização
	•	Alterar ~/.ssh/authorized_keys
	•	Mudar permissões SSH
	•	Modificar firewall sem aprovação

O AI DEVE:
	•	Usar comandos com paths absolutos
	•	Pausar para confirmação antes de comandos destrutivos
	•	Garantir que qualquer ação é reversível

⸻

3. 📤 Enviar ficheiros via SCP

3.1 Formato obrigatório:

scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null <ficheiro_local> root@142.93.106.94:/opt/rustdesk-mesh/

3.2 Regras:
	•	O AI só deve escrever em:
/opt/rustdesk-mesh/
	•	Nunca deve escrever em /etc, /usr, /lib, /var sem permissão explícita
	•	Deve fazer backup antes de alterar ficheiros existentes

⸻

4. 📁 Estrutura de pastas (instalação antiga)

O AI deve assumir:

/opt/rustdesk-mesh/
├── meshserver
├── hbbs
├── hbbr
├── config/
└── scripts/
/etc/systemd/system/
├── meshserver.service
├── hbbs.service
└── hbbr.service
/var/log/rustdesk/
/var/lib/rustdesk/

Estas pastas pertencem à instalação legacy.

⸻

5. 🔄 Reiniciar serviços no droplet 142.93.106.94

/usr/bin/systemctl restart meshserver.service
/usr/bin/systemctl restart hbbs.service
/usr/bin/systemctl restart hbbr.service

O AI não deve reiniciar serviços não relacionados.

⸻

6. 🛡️ Operações perigosas — exigem confirmação

O AI deve parar imediatamente e pedir autorização explícita antes de:

❌ Executar rm -rf
❌ Remover pastas
❌ Substituir binários
❌ Alterar systemd
❌ Modificar certificados
❌ Alterar permissões sensíveis
❌ Mexer na firewall

⸻

7. 🛠️ Fluxo de atualização legacy

1️⃣ Enviar novos binários para 142.93.106.94 via SCP
2️⃣ Colocar em /opt/rustdesk-mesh/
3️⃣ Ajustar permissões:

chmod +x /opt/rustdesk-mesh/meshserver

4️⃣ Reiniciar serviços
5️⃣ Ver logs:

journalctl -u meshserver.service -n 100 --no-pager


⸻

8. ⚠️ Nota importante

Este documento descreve a instalação antiga (LEGACY).
O AI está autorizado a modernizar, refatorar ou substituir este método.
O objetivo é preservar histórico, não replicá-lo tal como está.

⸻

9. ✔️ Autorização explícita para o droplet 142.93.106.94

O utilizador autoriza o AI a:
	•	Usar SSH → root@142.93.106.94
	•	Usar SCP → root@142.93.106.94:/opt/rustdesk-mesh/
	•	Auditar, alterar e atualizar a instalação legacy
	•	Migrar para instalação moderna quando necessário

Respeitando todas as regras de segurança descritas acima.

⸻

10. 📚 Conclusão

Este documento serve como:
	•	Referência histórica
	•	Guia para operações remotas
	•	Base para migração futura
	•	Documento para o AI saber como interagir com o droplet

