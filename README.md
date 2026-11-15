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

## Plano de implementação (decisões tomadas)

Registro do que já foi decidido para tirar o site do modo protótipo. Valores comerciais do contrato não ficam aqui, porque este repositório é publicado.

**Decidido**
- **WhatsApp:** uazapi (não é a API oficial da Meta). Exige um número exclusivo para o robô; há risco de bloqueio do número pelo WhatsApp.
- **Servidor e banco:** Cloudflare Workers/Pages Functions + D1, no mesmo projeto do Pages.
- **Login do cliente:** código enviado pelo WhatsApp (via uazapi), sessão por cookie.
- **Agendar exige login**; cliente novo informa nome e sobrenome, bairro, nascimento e como conheceu.

**Em aberto**
- **Gateway de pagamento:** AbacatePay (Pix a R$ 0,80) ou Asaas (Pix a R$ 1,99; cartão 2,99% + R$ 0,49). Depende de o AbacatePay ter cobrança recorrente (assinatura ou Pix Automático); a documentação (`https://abacatepay.com/llms.txt`) ainda não foi lida. A conta fica no nome da barbearia.

**Ordem do trabalho**
1. Banco D1 + API (agenda, clientes, assinaturas, serviços, conteúdo), trocando o `localStorage` de `barber/store.js`. A checagem de horário livre passa a ser no servidor.
2. Login real: código por WhatsApp para o cliente; e-mail e senha com hash para a equipe; `painel.html` protegido por sessão e permissões por pessoa.
3. uazapi: webhook de mensagens recebidas chamando o interpretador de `barber/bot.js`; envio da fila de mensagens (confirmação, link 2 h antes, agradecimento); agendador para a pergunta "o cliente veio?" na hora marcada.
4. Gateway: cobrança recorrente dos planos e webhook para ativar ou suspender a assinatura.
5. Fotos em storage (R2), token do Instagram no servidor, formulário de contato gravando no banco.

**Depende do cliente final**
- Nome e marca reais (Farias Barbearia é nome de demonstração), fotos, preços e planos, telefone e endereço, lista de bairros, dados da empresa para a Política de Privacidade, número de WhatsApp para o robô e conta no gateway.

**Custos mensais de terceiros (estimativa)**
- uazapi: R$ 30. Cloudflare: R$ 0 no plano gratuito, cerca de US$ 5 se passar do limite. Domínio: cerca de R$ 40 por ano. Tarifa do gateway: descontada do que a barbearia recebe.
