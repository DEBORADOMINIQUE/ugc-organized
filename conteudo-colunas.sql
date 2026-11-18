-- conteudo-colunas.sql · colunas do quadro de Conteúdo editáveis por cada pessoa
-- (a etapa do cartão passa a aceitar qualquer coluna criada pela pessoa)
alter table public.conteudos drop constraint if exists conteudos_etapa_check;
alter table public.conteudos alter column etapa set default 'briefing';
alter table public.conteudos add column if not exists cor text;   -- cor do cartão (post-it)
alter table public.conteudos add column if not exists briefing text;        -- o que a marca pediu
alter table public.conteudos add column if not exists link_briefing text;   -- PDF, Drive, Notion...
alter table public.conteudos add column if not exists link_post text;       -- link da publicação

-- Anexos dos cartões: várias imagens/PDFs, guardados numa pasta só da pessoa
alter table public.conteudos add column if not exists anexos jsonb not null default '[]'::jsonb;  -- [{"path","nome","tipo"}]
insert into storage.buckets (id, name, public) values ('anexos', 'anexos', false) on conflict (id) do nothing;
drop policy if exists "anexos: ver os meus" on storage.objects;
create policy "anexos: ver os meus" on storage.objects for select to authenticated
  using (bucket_id = 'anexos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "anexos: enviar os meus" on storage.objects;
create policy "anexos: enviar os meus" on storage.objects for insert to authenticated
  with check (bucket_id = 'anexos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "anexos: apagar os meus" on storage.objects;
create policy "anexos: apagar os meus" on storage.objects for delete to authenticated
  using (bucket_id = 'anexos' and (storage.foldername(name))[1] = auth.uid()::text);
