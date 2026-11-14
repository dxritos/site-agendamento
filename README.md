# site-agendamento

Protótipo estático (HTML/CSS/JS, sem build).

- `barber/` — Farias Barbearia: site, login por código, área do assinante e painel do barbeiro.
- `barber/confirmar.html` — link individual do WhatsApp: o cliente confirma presença, remarca ou cancela sem login.
- `barber/bot.js` — interpretador dos comandos de texto do robô da equipe (testável em Painel › WhatsApp).
- `barber/guard.js` — desliga seleção, menu de contexto e atalhos de salvar no site público.
- `_redirects` — a raiz redireciona para `/barber/`.

## Cloudflare Pages

- Framework preset: None
- Build command: (vazio)
- Build output directory: `/`

## O que ainda é simulado

Não há servidor: os dados ficam no `localStorage` do navegador. Código de login, pagamento e envio de WhatsApp são simulados; as mensagens geradas aparecem em Painel › WhatsApp › Enviadas.
