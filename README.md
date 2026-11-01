> Atualização de 01/11/2026 — painel manual publicado
>
> Esta atualização substitui as instruções antigas sobre prévia demonstrativa e infraestrutura externa abaixo. O site atual usa React/TypeScript/Vite com Worker, banco D1 e imagens R2 nativos do Sites. O servidor Express/Prisma permanece como referência histórica e não está em execução na hospedagem atual.
>
> A integração automática com Instagram foi cancelada. O acesso administrativo em `/admin` usa a conta ChatGPT da proprietária, validada no servidor por `ADMIN_EMAIL`; não há senha adicional. Cadastros e fotos são compartilhados e persistidos no servidor, sem localStorage. O site continua privado, conforme sua configuração de acesso anterior.
>
> Para cadastrar: Nova peça → nome, coleção, categoria, descrição e fotos → Publicado → Salvar peça. Rascunhos e arquivados não aparecem no catálogo. Fotos JPG/PNG/WebP de até 5 MB; até 8 imagens por peça. As 21 peças existentes foram preservadas, com disponibilidade sob consulta. Nenhum serviço pago externo foi contratado.
>
> Desenvolvimento atual: `node scripts/build-worker.mjs`, `node scripts/test-worker.mjs` e `node scripts/preview-worker.mjs`. A prévia local usa armazenamento temporário isolado; a hospedagem usa D1/R2 persistentes. Manifesto em `.openai/hosting.json`, servidor em `worker/index.mjs` e migrações em `drizzle/`.
>
> Verificado: build e testes locais de autenticação, origem, criação, publicação, conflitos, upload e mídia privada; no site publicado, login da proprietária, salvamento de Bolsas square e envio/salvamento da mesma foto do Chaveiro Gatinho. Persistência confirmada no banco hospedado. Restauração de backup e acesso após eventual abertura pública não foram homologados.

---

## Histórico da implementação anterior
# Jubis Crochet & Hama Beads

Implementação do MVP descrito no handover, com vitrine responsiva e painel. Contato: [@jubisby](https://www.instagram.com/jubisby/).

## O que está entregue

- React + TypeScript + Vite + Tailwind + React Router.
- Home, duas coleções, busca, filtros, detalhe com galeria, como pedir, sobre, contato, privacidade e página não encontrada.
- Contato com mensagem copiável e link do Instagram. Sem checkout, pedido ou reserva automática.
- Disponível, reservado, sob encomenda e esgotado; publicação separada em rascunho, publicado e arquivado.
- Painel com cadastro, edição, prévia, upload, texto alternativo, ordem de fotos, destaque e configurações.
- Express, Prisma e PostgreSQL: API, sessão revogável, CSRF, validação estrita, controle de versão, auditoria e upload assinado para Cloudinary.
- Catálogo ilustrativo para a prévia. A inicialização do banco real **não** insere produtos fictícios.

## Dois modos explicitamente separados

**Prévia privada no Sites:** build estático com `VITE_DEMO_MODE=true`. O catálogo e as alterações do painel são locais a cada navegador. O botão “Experimentar o painel” não simula autenticação segura nem altera dados de outros visitantes. Produtos e imagens são ilustrativos; os estados de estoque também são exemplos. Não utilizar esta configuração como loja pública operacional.

**Produção conectada:** `VITE_DEMO_MODE=false`, com a interface e o Express no mesmo domínio HTTPS, PostgreSQL e Cloudinary configurados. Requer infraestrutura externa: o Sites utiliza Workers, não hospeda este servidor Express/PostgreSQL. O código de produção está incluído; a prévia não comprova implantação nem teste dos serviços externos.

As funcionalidades futuras do handover (favoritos, avaliações, pedidos manuais, variantes, pagamentos, métricas) não fazem parte do MVP. As coleções iniciais são fixas; a categoria é texto por produto para simplificar o cadastro. Edição de mídia é persistida no PATCH versionado do produto, de forma atômica, em vez de endpoints independentes por imagem. Esses ajustes de implementação preservam o fluxo do MVP.

## Executar localmente

Requisitos: Node.js 22, npm, PostgreSQL 16 ou posterior compatível e conta Cloudinary para mídia em produção.

```sh
npm ci
cp .env.example .env
npm run dev
```

A prévia abre no endereço indicado pelo Vite. No Windows, use `Copy-Item .env.example .env` no lugar de `cp` se preferir. Não versionar `.env`.

## Ativar o servidor real

1. Crie banco PostgreSQL e configure `DATABASE_URL`.
2. Configure `ADMIN_EMAIL` e uma senha exclusiva com ao menos 14 caracteres em `ADMIN_PASSWORD`, somente no ambiente.
3. Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET`.
4. Defina `APP_ORIGIN` com a origem exata do navegador, sem barra final. Em desenvolvimento, use a origem impressa pelo Vite (por exemplo `http://127.0.0.1:5173`).
5. Defina `VITE_DEMO_MODE=false` e deixe `VITE_API_URL` vazio para usar a mesma origem. O proxy de desenvolvimento encaminha `/api` à porta 3001.
6. Execute:

```sh
npm run db:generate
npm run db:migrate
npm run db:seed
npm run server
```

Em outro terminal, `npm run dev`. Acesse `/admin` e entre com a conta criada. Após a inicialização, remova `ADMIN_PASSWORD` das variáveis persistidas do serviço. Não há cadastro público de administrador. O comando seed não redefine senha de conta existente.

## Produção

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run test
# Configure VITE_DEMO_MODE=false antes do build
npm run build
# Configure NODE_ENV=production e APP_ORIGIN=https://seu-dominio
npm run server
```

O Express entrega `dist/` e a API na mesma origem, inclusive acessos diretos a rotas da aplicação. Configure HTTPS no proxy. `TRUST_PROXY=1` somente se houver exatamente um proxy confiável. Não habilite CORS indiscriminado. As credenciais do Cloudinary e do banco nunca usam prefixo `VITE_`.

`docker-compose.yml` oferece PostgreSQL para desenvolvimento. Troque a senha local antes de qualquer exposição externa. O Dockerfile é uma opção de implantação do aplicativo; as variáveis secretas devem ser injetadas em execução. O deploy precisa de migrações antes de iniciar o tráfego.

## Rotas de API

Prefixo `/api/v1`.

| Método | Caminho | Acesso |
|---|---|---|
| GET | `/collections` | Público |
| GET | `/products?page=1&pageSize=24&q=&collection=&category=&availability=` | Público; somente publicados |
| GET | `/products/:slug` | Público; ocultos retornam 404 |
| GET | `/settings/public` | Público; apenas configurações públicas |
| POST | `/admin/auth/login` | Limite de tentativas e verificação de origem |
| GET | `/admin/auth/me` | Sessão; retorna token CSRF |
| POST | `/admin/auth/logout` | Sessão e CSRF |
| GET, POST | `/admin/products` | Sessão; criação exige CSRF |
| GET, PATCH | `/admin/products/:id` | Sessão; edição exige CSRF e versão |
| POST | `/admin/uploads/signature` | Sessão e CSRF |
| GET, PATCH | `/admin/settings` | Sessão; edição exige CSRF |
| GET, PATCH | `/admin/collections/:id` | Sessão; edição exige CSRF |

O PATCH do produto recebe todos os campos editáveis, `version` e `images`. Campos extras são rejeitados. Atualização concorrente retorna 409. A ordem de `images` define a capa. A remoção desassocia a mídia; não apaga automaticamente o ativo Cloudinary. Isso evita perda irreversível; limpeza de órfãos deve ser feita após verificar referências e período de retenção.

## Segurança e operação

- Senha com Argon2id; cookies HttpOnly, Secure em produção, SameSite Lax e prefixo `__Host-`.
- Sessões com duração de oito horas e revogação no logout; token de sessão armazenado como hash.
- Origem exata e token CSRF para mutações; validação no servidor independentemente do formulário.
- Sem HTML de produto; React renderiza textos escapados. URLs de mídia verificadas no Cloudinary.
- Upload validado antes de vincular: JPG/PNG/WebP, 5 MB e dimensões até 8000 px. Uploads rejeitados podem permanecer órfãos no Cloudinary e precisam de limpeza operacional.
- Registros de auditoria para cadastro e alteração de produto e configurações, sem senhas ou cookies.
- Respostas de API não expõem mensagens internas ou credenciais.
- Expiração de sessões antigas deve ter limpeza periódica; limitar acessos e revisar dependências antes de publicar.

## Backup e recuperação

Responsável e frequência precisam ser definidos pela proprietária e pela hospedagem. Sugestão inicial: backup diário do PostgreSQL com retenção de 7 a 30 dias e cópia fora do serviço principal, com credenciais restritas. Usar `pg_dump` em formato custom e testar `pg_restore` em **outro banco**, sem sobrescrever produção. Conferir contagens, login, produtos publicados e links de imagens após a restauração. Manter uma estratégia separada para os ativos Cloudinary. Não declarar recuperação validada sem esse ensaio.

## Materiais ainda necessários para uma loja real

- Fotos reais, produtos, preços e disponibilidade conferidos.
- Política de reserva, prazo, entrega e pagamento.
- Domínio, hospedagem Node, banco, conta Cloudinary e acesso administrativo.
- Revisão do conteúdo de privacidade para os serviços realmente usados.
- Homologação do login, upload e persistência no banco real, além de teste de restauração.

## Identidade e autoria dos assets

Fundo preto, destaques roxos e rosas, luz suave, cantos arredondados e tipografia legível. A direção deriva da referência fornecida; não foram reutilizados seus textos ou a imagem da água-viva. A imagem `public/atelier-hero.png` foi gerada com a ferramenta integrada de imagens e mostra peças fictícias, não produtos reais da loja. As três ilustrações SVG são criadas para esta prévia.

Prompt da imagem: “Premium conceptual product photograph of a lilac heart-shaped crochet handbag with tactile yarn stitches, a small cream crochet flower, and a pink heart-shaped Hama fuse bead keychain. Elegant central still life on nearly black seamless studio backdrop, subtle purple and pink luminous lighting. Cute, delicate, sophisticated; realistic yarn and cylindrical fuse bead textures. Square composition, dark breathing room, soft rim glow. Illustrative fictional products. No text, logos, watermark, people or extra objects.”

Fontes DM Sans e Manrope via Google Fonts. Antes da operação pública, revisar essa dependência ou hospedar as fontes localmente. Sem analytics ou pixels publicitários nesta versão.

