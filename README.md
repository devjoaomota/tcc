# Cafofo do Pet

Sistema web de agendamento de serviços para pet shop, desenvolvido como Trabalho de Conclusão de Curso (Ciência da Computação – UNIP).

O cliente cadastra seus pets, registra vacinas, agenda banho e tosa com opção de busca e entrega e acompanha seus pacotes de serviços. O pet shop aprova as solicitações, acompanha a agenda e gerencia pacotes pelo painel administrativo.

## Estrutura

```
backend/    API em Node.js + Express com banco MySQL/MariaDB
frontend/   Site estático em HTML, CSS e JavaScript
  admin/    Painel administrativo
```

## Como executar

Requisitos: Node.js 22 ou superior e MySQL/MariaDB.

```bash
cd backend
cp .env.example .env      # ajuste as variáveis do banco e o JWT_SECRET
npm install
npm start                 # API em http://localhost:3333
```

Na primeira execução a API cria as tabelas e os serviços padrão. Para carregar dados fictícios de demonstração: `npm run seed:demo`.

## Testes

```bash
cd backend
npm test                  # testes unitários (node:test)
npm run avaliacao -- final
```

O comando `avaliacao` sobe a API em um banco MySQL/MariaDB de teste (variáveis `LAB_DB_HOST`, `LAB_DB_PORT`, `LAB_DB_USER` e `LAB_DB_PASSWORD`; padrão `127.0.0.1:33316`, usuário `root`), recria o banco `aps_<rótulo>`, executa as verificações funcionais e não funcionais e grava os resultados em `backend/avaliacao/`.

O frontend é estático: sirva a pasta `frontend/` em qualquer servidor web (por exemplo, `npx serve frontend`). Em `localhost` ele usa automaticamente a API na porta 3333; em produção, a API publicada em `/backend` no mesmo domínio.

## Autores

- João Victor Gomes Mota
- João Vitor Marco Antonio Gravena
- Victor Augusto Martins da Costa Rosa
