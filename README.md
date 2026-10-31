# Linha de Fogo

Tiro tático 5 contra 5 em primeira pessoa no navegador. Ataque planta a bomba no ponto A ou B; defesa segura e desarma. Economia por rodada com compra e venda de armas, 8 classes com funções próprias, spray fixo por fuzil, tiros que atravessam paredes finas, mapas com corredores em labirinto, mira customizável e um arsenal de skins originais (caixas de suprimentos, fichas ganhas jogando e trocas entre amigos na sala). Os modelos e acabamentos são originais, feitos em código.

Jogue em: https://shintakuenzou.github.io/linha-de-fogo/

Feito com three.js. Os jogadores se conectam direto por WebRTC (60 atualizações por segundo). Se a conexão direta falhar, a sala usa o servidor próprio (pasta `server/`) ou, sem ele, servidores MQTT públicos.

## Servidor próprio (menos latência quando a conexão direta falha)

A pasta `server/` tem um servidor Node bem leve que repassa as mensagens da sala. Hospedado em São Paulo, ele fica perto de quem joga em Brasília.

Hospedar no Fly.io (região São Paulo):

```bash
cd server
fly launch --copy-config --no-deploy   # escolha um nome; a região já vem como gru (São Paulo)
fly deploy
```

Depois do deploy, o endereço fica parecido com `wss://SEU-APP.fly.dev`. Use de um destes jeitos:

- No jogo: **Configurações → Servidor próprio**, cole o endereço e clique em **Testar**. As salas que você criar passam a usar o servidor, e o link de convite já leva o endereço para o seu amigo.
- Para todo mundo: coloque o endereço em `SRV_DEFAULT` no `index.html`.

Rodar no seu computador para testar: `cd server && npm install && npm start` (porta 8080) e use `ws://localhost:8080`.

Brincadeira usando Claude
