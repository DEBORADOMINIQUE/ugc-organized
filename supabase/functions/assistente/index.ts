// =========================================================
// assistente · Edge Function do UGC Organized (Supabase / Deno)
// Recebe um texto colado (conversa, e-mail, briefing) e/ou um print,
// pede ao Claude para entender e devolve os campos para preencher
// a ficha certa do painel. A chave da Anthropic fica só aqui, no
// segredo ANTHROPIC_API_KEY do Supabase, nunca no site.
// =========================================================
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Todos os campos são texto; vazio quando não aparece no material.
const CAMPOS = [
  "marca", "instagram", "site", "nicho", "contato_nome", "email", "whatsapp", "canal",
  "entregaveis", "valor", "prazo_dias", "data_entrega", "data_publicacao",
  "titulo", "categoria", "data", "hora", "duracao_min",
  "gancho", "desenvolvimento", "cta", "formato", "descricao", "status", "notas",
] as const;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tipo", "resumo", "dados"],
  properties: {
    tipo: { type: "string", enum: ["prospeccao", "marca", "tarefa", "conteudo", "despesa", "nada"] },
    resumo: { type: "string" },
    dados: {
      type: "object",
      additionalProperties: false,
      required: [...CAMPOS],
      properties: Object.fromEntries(CAMPOS.map((c) => [c, { type: "string" }])),
    },
  },
};

const SISTEMA = `Você é o assistente do UGC Organized, um painel de organização para criadoras de conteúdo UGC no Brasil.
A criadora cola um material (conversa de DM ou WhatsApp, e-mail, briefing de marca, anotação solta) ou envia um print. Sua tarefa é entender o que aconteceu e devolver os dados para preencher UMA ficha do painel.

Escolha o "tipo":
- "prospeccao": ela abordou ou vai abordar uma marca (pitch enviado, DM de apresentação, candidatura). status: "enviada" (sem resposta), "respondeu", "aprovada" ou "recusada".
- "marca": uma parceria está em negociação ou fechada (valor, entregas, prazo, briefing, envio de produto).
- "tarefa": algo para ela fazer num dia/horário (gravar, editar, postar, reunião...). categoria: roteiro, gravar, editar, postar, marca, prospectar, admin, pessoal ou outro.
- "conteudo": ideia ou roteiro de vídeo/post. formato: reels, carrossel, story, foto, video_ugc, live ou video_longo. Separe gancho, desenvolvimento e cta quando houver roteiro.
- "despesa": um gasto do trabalho (equipamento, app, imposto...).
- "nada": o material não tem nada útil para registrar.

Regras dos campos (todos são texto; use "" quando a informação não aparece, nunca invente):
- datas no formato AAAA-MM-DD; resolva "sexta", "amanhã", "dia 20" usando a data de hoje informada.
- hora no formato HH:MM. valor e duracao_min só com números (ex.: "1500", "90"). prazo_dias só o número de dias.
- canal: instagram, email, whatsapp, plataforma, linkedin ou outro.
- instagram com @. whatsapp só como aparece. entregaveis em texto curto (ex.: "2 vídeos UGC + 5 fotos").
- titulo: frase curta do que é (tarefa ou conteúdo). descricao: para despesa.
- notas: o que mais for útil e não couber nos campos (endereço de envio, cupom, combinados, referências).
- resumo: uma frase curta em português dizendo o que você entendeu, falando com ela (ex.: "Abordagem para a Sallve pelo direct, ainda sem resposta.").
Escreva sem travessão.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const responder = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    // Só quem está logada no painel pode usar (a chave pública do site sozinha não basta)
    const auth = req.headers.get("Authorization") || "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: quem } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (!quem || !quem.user) return responder({ erro: "Faça login no painel para usar o assistente." }, 401);
    // O assistente não faz parte do plano vendido: só os e-mails do segredo ASSISTENTE_EMAILS podem usar
    const liberados = (Deno.env.get("ASSISTENTE_EMAILS") || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!liberados.includes((quem.user.email || "").toLowerCase())) return responder({ erro: "O assistente não está disponível na sua conta." }, 403);

    const { texto, imagem, imagens, hoje } = await req.json();
    // Aceita vários prints (imagens) ou um só (imagem, versão antiga do app)
    // deno-lint-ignore no-explicit-any
    const prints: any[] = (Array.isArray(imagens) && imagens.length ? imagens : imagem ? [imagem] : [])
      // deno-lint-ignore no-explicit-any
      .filter((i: any) => i && i.data && /^image\/(jpeg|png|gif|webp)$/.test(i.media_type)).slice(0, 8);
    if (!texto && !prints.length) return responder({ erro: "Cole um texto ou envie um print." }, 400);
    if (texto && String(texto).length > 20000) return responder({ erro: "Texto muito longo. Cole só a parte importante." }, 400);

    // deno-lint-ignore no-explicit-any
    const conteudo: any[] = [];
    prints.forEach((p, i) => {
      if (prints.length > 1) conteudo.push({ type: "text", text: `Print ${i + 1} de ${prints.length}:` });
      conteudo.push({ type: "image", source: { type: "base64", media_type: p.media_type, data: p.data } });
    });
    const sobrePrints = prints.length > 1 ? `(veja os ${prints.length} prints acima: são partes do mesmo material, leia todos juntos)` : "(veja o print)";
    conteudo.push({ type: "text", text: `Hoje é ${hoje || new Date().toISOString().slice(0, 10)}.\n\nMaterial:\n${texto || sobrePrints}${texto && prints.length > 1 ? "\n\n" + sobrePrints : ""}` });

    const client = new Anthropic(); // lê ANTHROPIC_API_KEY dos segredos do Supabase
    const resposta = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SISTEMA,
      messages: [{ role: "user", content: conteudo }],
    });

    if (resposta.stop_reason === "refusal") return responder({ erro: "Não consegui ler esse material. Tente colar só o texto." }, 422);
    if (resposta.stop_reason === "max_tokens") return responder({ erro: "O material é grande demais. Cole só a parte importante." }, 422);
    const bloco = resposta.content.find((b) => b.type === "text");
    if (!bloco || bloco.type !== "text") return responder({ erro: "Não entendi esse material." }, 422);
    return responder(JSON.parse(bloco.text));
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return responder({ erro: "A chave da IA não está configurada ou é inválida." }, 500);
    if (e instanceof Anthropic.RateLimitError) return responder({ erro: "Muitos pedidos agora. Tente de novo em um minuto." }, 429);
    if (e instanceof Anthropic.APIError) return responder({ erro: `Erro da IA (${e.status}). Tente de novo.` }, 502);
    console.error(e);
    return responder({ erro: "Não consegui processar agora. Tente de novo." }, 500);
  }
});
