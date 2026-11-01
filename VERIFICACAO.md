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
# Verificação da entrega

## Executado

- Build de produção concluído com checagem de tipos TypeScript.
- Esquema Prisma validado e cliente gerado.
- 12 testes automatizados aprovados: publicação, imagens e texto alternativo, preços, campos extras, coleção, paginação, URL do Instagram, origem, health check, acesso administrativo sem sessão e respostas de erro.
- Auditoria de dependências sem vulnerabilidades conhecidas no momento da execução. Override de `deepmerge-ts` 8.0.2 aplicado; geração e validação Prisma passaram após a atualização.
- Servidor de prévia respondeu HTTP 200.
- Home inspecionada no navegador em 1440 e 360 px; ausência de rolagem horizontal na home de 360 px e navegação para o catálogo por teclado confirmadas.
- Busca por “Coração” retornou duas peças; combinada com “Sob encomenda”, retornou uma. Página de detalhe, mensagem de contato e link para @jubisby verificados.
- Acesso direto a `/admin`, abertura do formulário e salvamento no painel demonstrativo confirmados. Corrigido o fallback de rotas em diretórios ocultos do Windows.

## Limites de verificação

- A revisão automática do navegador teve uma interrupção, depois foi retomada. Upload real, fluxo completo de criação, todos os casos de foco modal e largura 768 px não foram homologados.
- Não havia PostgreSQL nem Cloudinary configurados. Login com usuário real, migração executada no banco, persistência concorrente, envio de imagens e recuperação de backup ainda precisam de homologação.
- Os testes de API executados não substituem testes com banco real: cobrem caminhos que recusam entrada inválida e acesso não autenticado antes de consultar dados.
- A prévia Sites é estática, privada e demonstrativa; o código Express/PostgreSQL depende de implantação externa. Os dados do painel da prévia são locais ao navegador.

## Ajuste de compatibilidade do ambiente

O ambiente Windows restringiu subprocessos nativos usados pelo esbuild. O build usa uma transformação TypeScript em JavaScript dentro do processo do Vite, com resolução preservando links e substituições de ambiente público. Mantém React, TypeScript, Vite, Tailwind e React Router. O build sem minificação resulta em aproximadamente 138 KB de JavaScript comprimido. Em infraestrutura própria, o fluxo padrão de Vite pode ser restabelecido após verificar os testes.

## Aceite antes de abrir ao público

1. Configurar os serviços e executar migrações e seed seguro.
2. Testar login, logout, edição concorrente, rascunhos ocultos e upload autorizado.
3. Cadastrar peças reais, revisar fotos e confirmar valores e disponibilidade.
4. Confirmar regras comerciais, privacidade e responsável por manutenção.
5. Testar a jornada completa em celular e computador e ensaiar restauração do banco.

## Atualização: foco em Jubis Crochê

- Fotos de quatro publicações públicas do @jubisby importadas com autorização da proprietária: bolsas square, top, poncho e pochete. Originais preservados em public/instagram; links de origem em src/data.ts.
- Home exclusiva de crochê; entradas distintas roxa/rosa, com indicação da coleção ativa. Hama permanece demonstrativa para próxima etapa.
- Novo estado CONSULT (Consultar disponibilidade), incluído na validação da API, painel e migração PostgreSQL. Nenhum preço ou estoque foi presumido a partir das publicações.
- Migração do catálogo local substitui exemplos antigos não modificados e preserva peças editadas e personalizadas.
- Build e 12 testes da API passaram; revisão visual móvel e jornada peça → mensagem de consulta verificadas.
- A hospedagem continua sendo uma prévia estática privada; fotos são cópias das publicações, sem sincronização automática com Instagram.

