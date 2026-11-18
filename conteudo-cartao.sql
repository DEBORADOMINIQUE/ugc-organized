-- conteudo-cartao.sql · cartão do quadro: marca digitada e blocos de informação
alter table public.conteudos add column if not exists marca_nome text;                       -- marca que não está cadastrada
alter table public.conteudos add column if not exists blocos jsonb not null default '[]'::jsonb; -- [{"tipo","titulo","texto"}]
