-- conteudo-quadro.sql · Quadro de produção (estilo Trello) na aba Conteúdo
-- Novas colunas, checklist, etiquetas, ordem dos cartões e link do arquivo final
alter table public.conteudos drop constraint if exists conteudos_etapa_check;
alter table public.conteudos add constraint conteudos_etapa_check
  check (etapa in ('ideia', 'briefing', 'produto', 'roteiro', 'aprovacao', 'gravar', 'editar', 'ajustes', 'agendado', 'postado'));
alter table public.conteudos add column if not exists checklist jsonb not null default '[]'::jsonb;  -- [{"t": "Gravar", "ok": true}]
alter table public.conteudos add column if not exists etiquetas text[] not null default '{}';          -- urgente, pago, permuta...
alter table public.conteudos add column if not exists posicao double precision;                        -- ordem dentro da coluna
alter table public.conteudos add column if not exists link_arquivo text;                               -- Drive, WeTransfer...
