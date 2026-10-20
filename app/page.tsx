"use client";

import { useEffect, useState } from "react";

type Perfil = "admin" | "garcom" | "cozinha" | "caixa";
type Tela = "mesas" | "cardapio" | "cozinha" | "caixa" | "admin";
type Status = "Recebido" | "Preparando" | "Pronto" | "Entregue";
type Produto = { id: number; nome: string; preco: number; categoria: string; ativo: boolean; foto?: string };
type Item = { id: number; nome: string; preco: number; qtd: number };
type Pedido = { id: string; mesa: number; itens: Item[]; status: Status; observacao: string; data: string };
type Venda = { id: string; mesa: number; total: number; pagamento: string; data: string; itens: Item[] };
type Dados = { mesas: number[]; produtos: Produto[]; carrinhos: Record<number, Item[]>; pedidos: Pedido[]; vendas: Venda[] };
type Recibo = { numero: string; mesa: number; itens: Item[]; total: number; data: string; pagamento?: string };

const inicial: Dados = {
  mesas: Array.from({ length: 12 }, (_, i) => i + 1),
  produtos: [
    { id: 1, nome: "X-Burger", preco: 2490, categoria: "Lanches", ativo: true },
    { id: 2, nome: "X-Salada", preco: 2690, categoria: "Lanches", ativo: true },
    { id: 3, nome: "Batata Frita", preco: 1990, categoria: "Porções", ativo: true },
    { id: 4, nome: "Refrigerante", preco: 700, categoria: "Bebidas", ativo: true },
    { id: 5, nome: "Suco Natural", preco: 900, categoria: "Bebidas", ativo: true },
    { id: 6, nome: "Pizza Calabresa", preco: 4990, categoria: "Pizzas", ativo: true },
    { id: 7, nome: "Prato Executivo", preco: 3490, categoria: "Refeições", ativo: true },
    { id: 8, nome: "Água Mineral", preco: 500, categoria: "Bebidas", ativo: true },
  ],
  carrinhos: {}, pedidos: [], vendas: [],
};
const moeda = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const totalItens = (itens: Item[]) => itens.reduce((s, i) => s + i.preco * i.qtd, 0);
const idNovo = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const menus: Record<Perfil, Tela[]> = { admin: ["mesas", "cozinha", "caixa", "admin"], garcom: ["mesas"], cozinha: ["cozinha"], caixa: ["caixa"] };
const nomes: Record<Tela, string> = { mesas: "🪑 Mesas", cardapio: "📖 Cardápio", cozinha: "👨‍🍳 Cozinha", caixa: "💰 Caixa", admin: "⚙️ Administração" };
const perfis: Record<Perfil, string> = { admin: "Administrador", garcom: "Garçom", cozinha: "Cozinha", caixa: "Caixa" };

// Converte datas já salvas em formato brasileiro (dd/mm/aaaa, hh:mm:ss).
function dataPedidoEmMs(data: string): number {
  const br = data.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (br) {
    const [, dia, mes, ano, hora, minuto, segundo] = br;
    return new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto), Number(segundo || 0)).getTime();
  }
  return Date.parse(data);
}
function tempoDecorrido(data: string, agora: number): string {
  const criado = dataPedidoEmMs(data);
  if (!Number.isFinite(criado)) return "Horário indisponível";
  const minutos = Math.max(0, Math.floor((agora - criado) / 60000));
  if (minutos < 1) return "há menos de 1 minuto";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas < 24) return `há ${horas}h${String(resto).padStart(2, "0")}`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} dia${dias === 1 ? "" : "s"}`;
}
const statusVisual: Record<Status, { texto: string; classe: string }> = {
  Recebido: { texto: "🧾 Pedido recebido", classe: "bg-slate-100 text-slate-800" },
  Preparando: { texto: "👨‍🍳 Em preparo", classe: "bg-amber-100 text-amber-900" },
  Pronto: { texto: "✅ Pronto para servir", classe: "bg-green-100 text-green-800" },
  Entregue: { texto: "🍽️ Entregue ao cliente", classe: "bg-blue-100 text-blue-800" },
};


export default function Home() {
  const [dados, setDados] = useState<Dados>(inicial);
  const [carregado, setCarregado] = useState(false);
  const [mostrarInstalacao, setMostrarInstalacao] = useState(false);
  const [instalacaoPendente, setInstalacaoPendente] = useState<Event | null>(null);
  const [sistemaIOS, setSistemaIOS] = useState(false);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [tela, setTela] = useState<Tela>("mesas");
  const [mesa, setMesa] = useState(1);
  const [busca, setBusca] = useState("");
  const [observacao, setObservacao] = useState("");
  const [pagamento, setPagamento] = useState("Pix");
  const [quantidadeMesas, setQuantidadeMesas] = useState("10");
  const [novoProduto, setNovoProduto] = useState({ nome: "", preco: "", categoria: "Lanches", foto: "" });
  const [recibo, setRecibo] = useState<Recibo | null>(null);
  const [agora, setAgora] = useState(0);
  useEffect(() => {
    setSistemaIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    const capturar = (evento: Event) => {
      evento.preventDefault();
      setInstalacaoPendente(evento);
    };
    window.addEventListener("beforeinstallprompt", capturar);
    return () => window.removeEventListener("beforeinstallprompt", capturar);
  }, []);

  const abrirInstalacao = async () => {
    if (instalacaoPendente) {
      const evento = instalacaoPendente as Event & { prompt: () => Promise<void> };
      await evento.prompt();
      setInstalacaoPendente(null);
    } else {
      setMostrarInstalacao(true);
    }
  };

  useEffect(() => {
    setAgora(Date.now());
    const intervalo = window.setInterval(() => setAgora(Date.now()), 30000);
    return () => window.clearInterval(intervalo);
  }, []);


  useEffect(() => {
    try {
      const v7 = localStorage.getItem("comandafacil-v7");
      const v6 = localStorage.getItem("comandafacil-v6");
      const bruto = v7 || v6;
      if (bruto) {
        const lido = JSON.parse(bruto) as Dados;
        if (Array.isArray(lido.mesas) && Array.isArray(lido.produtos) && Array.isArray(lido.pedidos) && Array.isArray(lido.vendas)) {
          setDados({ ...lido, carrinhos: lido.carrinhos || {}, vendas: lido.vendas.map(v => ({ ...v, itens: Array.isArray(v.itens) ? v.itens : [] })) });
        }
      }
    } catch { console.warn("Não foi possível recuperar os dados locais."); }
    setCarregado(true);
  }, []);
  useEffect(() => {
    if (!carregado) return;
    try {
      localStorage.setItem("comandafacil-v7", JSON.stringify(dados));
    } catch {
      alert("O armazenamento do navegador está cheio. A foto não pôde ser salva. Use imagens menores ou remova fotos antigas.");
    }
  }, [dados, carregado]);

  const pode = (lista: Perfil[]) => perfil !== null && lista.includes(perfil);
  const pedidosMesa = (n: number) => dados.pedidos.filter(p => p.mesa === n);
  const itensMesa = (n: number) => pedidosMesa(n).flatMap(p => p.itens);
  const totalMesa = (n: number) => totalItens(itensMesa(n));
  const carrinho = dados.carrinhos[mesa] || [];
  const atualizar = (mudancas: Partial<Dados>) => setDados(d => ({ ...d, ...mudancas }));

  const adicionarMesas = (quantidade: number) => {
    if (!pode(["admin"])) return;
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 500) return alert("Digite um número inteiro de 1 a 500.");
    setDados(d => {
      const inicio = Math.max(0, ...d.mesas);
      return { ...d, mesas: [...d.mesas, ...Array.from({ length: quantidade }, (_, i) => inicio + i + 1)] };
    });
  };
  const excluirMesa = (n: number) => {
    if (!pode(["admin"])) return;
    if (pedidosMesa(n).length || (dados.carrinhos[n] || []).length) return alert("Esta mesa possui pedidos em aberto.");
    if (!confirm(`Excluir Mesa ${n}?`)) return;
    setDados(d => {
      const carrinhos = { ...d.carrinhos }; delete carrinhos[n];
      return { ...d, mesas: d.mesas.filter(m => m !== n), carrinhos };
    });
  };
  const adicionarItem = (p: Produto) => {
    if (!pode(["admin", "garcom"])) return;
    setDados(d => {
      const itens = d.carrinhos[mesa] || [];
      return { ...d, carrinhos: { ...d.carrinhos, [mesa]: itens.some(i => i.id === p.id) ? itens.map(i => i.id === p.id ? { ...i, qtd: i.qtd + 1 } : i) : [...itens, { id: p.id, nome: p.nome, preco: p.preco, qtd: 1 }] } };
    });
  };
  const mudarQtd = (id: number, delta: number) => {
    if (!pode(["admin", "garcom"])) return;
    setDados(d => ({ ...d, carrinhos: { ...d.carrinhos, [mesa]: (d.carrinhos[mesa] || []).map(i => i.id === id ? { ...i, qtd: i.qtd + delta } : i).filter(i => i.qtd > 0) } }));
  };
  const enviarPedido = () => {
    if (!pode(["admin", "garcom"]) || !carrinho.length) return;
    const pedido: Pedido = { id: idNovo(), mesa, itens: carrinho.map(i => ({ ...i })), status: "Recebido", observacao: observacao.trim(), data: new Date().toLocaleString("pt-BR") };
    setDados(d => ({ ...d, pedidos: [...d.pedidos, pedido], carrinhos: { ...d.carrinhos, [mesa]: [] } }));
    setObservacao(""); alert("Pedido enviado para cozinha!");
  };
  const cancelarPedido = (pedido: Pedido) => {
    if (!pode(["admin", "garcom"])) return;
    const valor = moeda(totalItens(pedido.itens));
    const aviso = pedido.status === "Pronto" || pedido.status === "Entregue"
      ? "\nATENÇÃO: Este pedido já foi preparado ou entregue. Avise a cozinha e o caixa antes de cancelar."
      : "\nAvise a cozinha sobre o cancelamento.";
    if (!window.confirm(`Cancelar o pedido da Mesa ${pedido.mesa} no valor de ${valor}?\nOs itens serão retirados da conta da mesa.${aviso}`)) return;
    setDados(d => ({ ...d, pedidos: d.pedidos.filter(p => p.id !== pedido.id) }));
    alert("Pedido cancelado. O total da mesa foi atualizado.");
  };
  const mudarStatus = (id: string, status: Status) => {
    if (!pode(["admin", "cozinha"])) return;
    setDados(d => ({ ...d, pedidos: d.pedidos.map(p => p.id === id ? { ...p, status } : p) }));
  };
  const mostrarConta = (n: number) => {
    if (!pode(["admin", "caixa"])) return;
    const itens = itensMesa(n);
    if (!itens.length) return;
    setRecibo({ numero: `CONTA-${n}`, mesa: n, itens, total: totalItens(itens), data: new Date().toLocaleString("pt-BR") });
  };
  const mostrarVenda = (v: Venda) => {
    if (!pode(["admin", "caixa"])) return;
    if (!v.itens?.length) return alert("Esta venda foi registrada em uma versão antiga, sem os itens necessários para reimpressão.");
    setRecibo({ numero: v.id.slice(0, 8).toUpperCase(), mesa: v.mesa, itens: v.itens, total: v.total, data: v.data, pagamento: v.pagamento });
  };
  const fecharMesa = (n: number) => {
    if (!pode(["admin", "caixa"])) return;
    if ((dados.carrinhos[n] || []).length) return alert("Existem itens não enviados nesta mesa.");
    const itens = itensMesa(n);
    if (!itens.length) return;
    const total = totalItens(itens);
    if (!confirm(`Confirmar pagamento de ${moeda(total)} da Mesa ${n} por ${pagamento}?`)) return;
    const venda: Venda = { id: idNovo(), mesa: n, total, pagamento, data: new Date().toLocaleString("pt-BR"), itens: itens.map(i => ({ ...i })) };
    setDados(d => ({ ...d, vendas: [...d.vendas, venda], pedidos: d.pedidos.filter(p => p.mesa !== n) }));
    setRecibo({ numero: venda.id.slice(0, 8).toUpperCase(), mesa: n, total, itens: venda.itens, pagamento, data: venda.data });
  };
  const importarFoto = (arquivo?: File) => {
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) return alert("Selecione um arquivo de imagem.");
    if (arquivo.size > 12 * 1024 * 1024) return alert("A imagem deve ter no máximo 12 MB.");
    const leitor = new FileReader();
    leitor.onerror = () => alert("Não foi possível ler a imagem.");
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => alert("Formato de imagem não suportado.");
      img.onload = () => {
        const limite = 640;
        const proporcao = Math.min(1, limite / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * proporcao));
        canvas.height = Math.max(1, Math.round(img.height * proporcao));
        const ctx = canvas.getContext("2d");
        if (!ctx) return alert("Não foi possível processar a foto.");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const foto = canvas.toDataURL("image/jpeg", 0.72);
        setNovoProduto(atual => ({ ...atual, foto }));
      };
      img.src = String(leitor.result);
    };
    leitor.readAsDataURL(arquivo);
  };
  const cadastrarProduto = () => {
    if (!pode(["admin"])) return;
    const valor = Number(novoProduto.preco.replace(",", "."));
    if (!novoProduto.nome.trim() || !Number.isFinite(valor) || valor <= 0) return alert("Informe nome e preço válido.");
    const id = Math.max(0, ...dados.produtos.map(p => p.id)) + 1;
    atualizar({ produtos: [...dados.produtos, { id, nome: novoProduto.nome.trim(), preco: Math.round(valor * 100), categoria: novoProduto.categoria.trim() || "Outros", ativo: true, foto: novoProduto.foto || undefined }] });
    setNovoProduto({ nome: "", preco: "", categoria: "Lanches", foto: "" });
  };
  const excluirProduto = (produto: Produto) => {
    if (!pode(["admin"])) return;
    if (!window.confirm(`Deseja realmente excluir o produto "${produto.nome}"?\nEle também será removido dos carrinhos ainda não enviados. Os pedidos e vendas já registrados serão preservados.`)) return;
    setDados(d => ({
      ...d,
      produtos: d.produtos.filter(p => p.id !== produto.id),
      carrinhos: Object.fromEntries(Object.entries(d.carrinhos).map(([n, itens]) => [n, itens.filter(i => i.id !== produto.id)])),
    }));
  };

  const excluirVenda = (venda: Venda) => {
    if (!pode(["admin"])) return;
    if (!window.confirm(`Excluir a venda da Mesa ${venda.mesa}, no valor de ${moeda(venda.total)}, registrada em ${venda.data}?\n\nEsta ação é permanente e também reduzirá o faturamento exibido. O recibo desta venda não poderá mais ser reimpresso.`)) return;
    setDados(d => ({ ...d, vendas: d.vendas.filter(v => v.id !== venda.id) }));
    setRecibo(atual => atual?.numero === venda.id.slice(0, 8).toUpperCase() ? null : atual);
  };

  const exportarVendas = () => {
    if (!pode(["admin"])) return;
    const linhas = [["Mesa", "Total", "Pagamento", "Data"], ...dados.vendas.map(v => [String(v.mesa), (v.total / 100).toFixed(2).replace(".", ","), v.pagamento, v.data])];
    const csv = "\uFEFF" + linhas.map(l => l.map(c => `"${c.replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "vendas-comandafacil.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const btn = "rounded-xl bg-orange-500 px-5 py-3 font-bold text-white hover:bg-orange-600";
  const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
  const campo = "w-full rounded-xl border border-slate-300 bg-white p-3";

  if (!carregado) return <main className="p-10 text-center">Carregando...</main>;
  if (!perfil) return (
    <main lang="pt-BR" translate="no" className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
      <section className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-center text-3xl font-black text-orange-600">🍽️ ComandaFácil Online</h1>
        <p className="mt-2 text-center text-slate-500">Selecione um perfil para testar</p>
        <p className="my-5 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-900">Modo demonstração: não há autenticação real nesta versão.</p>
          <button type="button" onClick={abrirInstalacao} className="mb-4 w-full rounded-xl bg-blue-700 p-3 font-bold text-white">📱 Instalar no celular</button>
          {mostrarInstalacao && <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm"><p className="font-bold">Como adicionar à tela inicial</p><p className="mt-2">iPhone: abra o endereço público HTTPS no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.</p><p className="mt-2">Android: abra o endereço público HTTPS no Chrome e escolha “Instalar aplicativo” ou “Adicionar à tela inicial” no menu.</p><p className="mt-2 font-semibold">Ainda precisamos publicar o sistema em HTTPS. Esta versão local não está pronta para as lojas.</p><button onClick={() => setMostrarInstalacao(false)} className="mt-3 rounded bg-white px-3 py-2">Fechar</button></div>}
        <div className="grid gap-3 sm:grid-cols-2">
          {(["admin", "garcom", "cozinha", "caixa"] as Perfil[]).map(p => <button key={p} onClick={() => { setPerfil(p); setTela(menus[p][0]); }} className="rounded-xl border p-5 text-left font-bold hover:bg-orange-50">{p === "admin" ? "👑" : p === "garcom" ? "🧑‍🍳" : p === "cozinha" ? "🍳" : "💳"} {perfis[p]}</button>)}
        </div>
      </section>
    </main>
  );

  return (
    <main lang="pt-BR" translate="no" className="min-h-screen bg-slate-100 text-slate-900">
      <style>{`@media print { body * { visibility: hidden !important; } #recibo-impressao, #recibo-impressao * { visibility: visible !important; } #recibo-impressao { position: absolute !important; left: 0 !important; top: 0 !important; width: 76mm !important; max-width: 76mm !important; padding: 3mm !important; margin: 0 !important; border: 0 !important; box-shadow: none !important; color: #000 !important; background: white !important; font-family: Arial, sans-serif !important; font-size: 11px !important; } .sem-impressao { display: none !important; } @page { size: 80mm auto; margin: 2mm; } }`}</style>
      <header className="bg-orange-600 p-5 text-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black">🍽️ ComandaFácil Online</h1><p>Painel: {perfis[perfil]}</p></div><div className="flex flex-wrap gap-2"><button className="rounded-xl bg-blue-900 px-5 py-2 font-bold text-white" onClick={abrirInstalacao}>📱 Instalar no celular</button><button className="rounded-xl bg-white px-5 py-2 font-bold text-orange-700" onClick={() => { setPerfil(null); setRecibo(null); }}>Sair / Trocar perfil</button></div></div></header>
      <nav className="border-b bg-white p-4"><div className="mx-auto flex max-w-7xl flex-wrap gap-2">{menus[perfil].map(t => <button key={t} onClick={() => setTela(t)} className={`rounded-xl px-5 py-3 font-bold ${tela === t ? "bg-orange-500 text-white" : "bg-slate-100"}`}>{nomes[t]}</button>)}</div></nav>
      {mostrarInstalacao && <section className="mx-auto mt-4 max-w-7xl rounded-xl border border-blue-200 bg-blue-50 p-4"><h2 className="font-black">Instalação no celular</h2><p className="mt-2">{sistemaIOS ? "No iPhone, abra o endereço HTTPS no Safari, toque em Compartilhar e selecione Adicionar à Tela de Início." : "No Android, abra o endereço HTTPS no Chrome e procure Instalar aplicativo ou Adicionar à tela inicial no menu."}</p><p className="mt-2 text-sm">O sistema precisa primeiro estar hospedado em HTTPS. O endereço 192.168.x.x só funciona na rede local, e os dados ainda não sincronizam entre aparelhos.</p><button className="mt-3 rounded-lg bg-white px-4 py-2 font-bold" onClick={() => setMostrarInstalacao(false)}>Fechar</button></section>}
      <div className="mx-auto max-w-7xl p-5">
        {tela === "mesas" && pode(["admin", "garcom"]) && <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">Controle de Mesas</h2><p>{dados.mesas.length} mesas cadastradas</p></div>{pode(["admin"]) && <div className="flex gap-2"><button className={btn} onClick={() => adicionarMesas(1)}>+ Adicionar mesa</button><button className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white" onClick={() => setTela("admin")}>+ Várias mesas</button></div>}</div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{dados.mesas.map(n => { const ocupado = pedidosMesa(n).length > 0; const rascunho = (dados.carrinhos[n] || []).length > 0; return <button key={n} onClick={() => { setMesa(n); setTela("cardapio"); }} className={`rounded-2xl border p-6 text-center shadow-sm ${ocupado ? "border-red-200 bg-red-100" : rascunho ? "border-yellow-200 bg-yellow-100" : "border-green-200 bg-green-100"}`}><div className="text-4xl">🍽️</div><h3 className="mt-2 text-xl font-black">Mesa {n}</h3><p>{ocupado ? "Ocupada" : rascunho ? "Pedido em aberto" : "Livre"}</p>{ocupado && <strong>{moeda(totalMesa(n))}</strong>}</button>; })}</div>
        </>}
        {tela === "cardapio" && pode(["admin", "garcom"]) && <>
          <button onClick={() => setTela("mesas")} className="mb-4 font-bold text-orange-600">← Voltar às mesas</button><h2 className="mb-5 text-2xl font-black">Mesa {mesa} — Cardápio</h2>
          <input className={`${campo} mb-4`} value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{dados.produtos.filter(p => p.ativo && p.nome.toLowerCase().includes(busca.toLowerCase())).map(p => <div key={p.id} className={card}><div className="mb-3 flex h-44 items-center justify-center overflow-hidden rounded-xl bg-orange-50">{p.foto ? <img src={p.foto} alt={`Foto de ${p.nome}`} className="h-full w-full object-cover" /> : <span className="text-5xl">🍽️</span>}</div><p className="text-sm text-slate-500">{p.categoria}</p><h3 className="text-xl font-black">{p.nome}</h3><p className="my-3 text-xl font-bold text-orange-600">{moeda(p.preco)}</p><button className={`${btn} w-full`} onClick={() => adicionarItem(p)}>+ Adicionar</button></div>)}</div>
          <section className={`${card} mt-6`}><h3 className="mb-4 text-xl font-black">🧾 Itens do pedido</h3>{!carrinho.length && <p>Nenhum item adicionado.</p>}{carrinho.map(i => <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><span>{i.nome} — {moeda(i.preco)}</span><div className="flex items-center gap-3"><button onClick={() => mudarQtd(i.id, -1)} className="rounded bg-red-100 px-3 py-2">−</button><strong>{i.qtd}</strong><button onClick={() => mudarQtd(i.id, 1)} className="rounded bg-green-100 px-3 py-2">+</button><strong>{moeda(i.preco * i.qtd)}</strong></div></div>)}<textarea className={`${campo} mt-4`} rows={2} value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Observações do pedido" /><p className="my-4 text-2xl font-black">Total: {moeda(totalItens(carrinho))}</p><button disabled={!carrinho.length} onClick={enviarPedido} className="w-full rounded-xl bg-green-600 p-4 font-bold text-white disabled:opacity-40">Enviar pedido para cozinha</button></section>
          {pedidosMesa(mesa).length > 0 && <section className={`${card} mt-5`}><h3 className="mb-3 text-xl font-black">Pedidos enviados</h3>{pedidosMesa(mesa).map(p => <div key={p.id} className="border-b py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-sm font-bold ${statusVisual[p.status].classe}`}>{statusVisual[p.status].texto}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">⏱️ {agora ? tempoDecorrido(p.data, agora) : "Calculando..."}</span></div><p className="text-xs text-slate-500">Lançado em: {p.data}</p><p className="mt-2">{p.itens.map(i => `${i.qtd}x ${i.nome}`).join(", ")}</p><p className="mt-1 font-bold">{moeda(totalItens(p.itens))}</p></div><button type="button" onClick={() => cancelarPedido(p)} className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700">✕ Cancelar pedido</button></div></div>)}<p className="mt-4 text-xl font-black">Total da mesa: {moeda(totalMesa(mesa))}</p>{pode(["admin"]) && <button className={`${btn} mt-3`} onClick={() => { setTela("caixa"); mostrarConta(mesa); }}>Ver conta para impressão</button>}</section>}
        </>}
        {tela === "cozinha" && pode(["admin", "cozinha"]) && <><h2 className="mb-5 text-2xl font-black">👨‍🍳 Pedidos da Cozinha</h2>{!dados.pedidos.length && <p>Nenhum pedido recebido.</p>}<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{dados.pedidos.map(p => <div key={p.id} className={card}><h3 className="text-xl font-black">Mesa {p.mesa}</h3><p className="text-sm text-slate-500">{p.data}</p>{p.itens.map(i => <p key={i.id} className="border-b py-2">{i.qtd}x {i.nome}</p>)}{p.observacao && <p className="my-3 rounded bg-yellow-100 p-3">{p.observacao}</p>}<select className={`${campo} mt-3`} value={p.status} onChange={e => mudarStatus(p.id, e.target.value as Status)}><option>Recebido</option><option>Preparando</option><option>Pronto</option><option>Entregue</option></select></div>)}</div></>}
        {tela === "caixa" && pode(["admin", "caixa"]) && <><h2 className="mb-5 text-2xl font-black">💰 Caixa — Fechamento e Impressão</h2><div className={`${card} mb-5`}><label className="mb-2 block font-bold">Forma de pagamento</label><select className={campo} value={pagamento} onChange={e => setPagamento(e.target.value)}><option>Pix</option><option>Dinheiro</option><option>Cartão de débito</option><option>Cartão de crédito</option></select></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{dados.mesas.filter(n => totalMesa(n) > 0).map(n => <div key={n} className={card}><h3 className="text-xl font-black">Mesa {n}</h3>{itensMesa(n).map((i, idx) => <p key={`${i.id}-${idx}`} className="py-1 text-sm">{i.qtd}x {i.nome} — {moeda(i.preco * i.qtd)}</p>)}<p className="my-4 text-2xl font-black text-green-700">{moeda(totalMesa(n))}</p><div className="flex flex-col gap-2"><button className="rounded-xl bg-blue-600 p-3 font-bold text-white" onClick={() => mostrarConta(n)}>🖨️ Visualizar / Imprimir conta</button><button className="rounded-xl bg-green-600 p-3 font-bold text-white" onClick={() => fecharMesa(n)}>✓ Registrar pagamento</button></div></div>)}</div>{dados.mesas.every(n => totalMesa(n) === 0) && <p>Nenhuma mesa com consumo em aberto.</p>}<section className={`${card} mt-6`}><h3 className="mb-4 text-xl font-black">🧾 Comprovantes de vendas anteriores</h3>{!dados.vendas.length && <p>Nenhuma venda registrada.</p>}{[...dados.vendas].reverse().map(v => <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><div><strong>Mesa {v.mesa} — {moeda(v.total)}</strong><p className="text-sm text-slate-500">{v.data} · {v.pagamento}</p></div><button className="rounded-lg bg-blue-100 px-4 py-2 font-bold text-blue-800" onClick={() => mostrarVenda(v)}>🖨️ Reimprimir</button></div>)}</section></>}
        {tela === "admin" && pode(["admin"]) && <><h2 className="mb-5 text-2xl font-black">⚙️ Administração</h2><div className="mb-6 grid gap-4 md:grid-cols-3"><div className={card}>Mesas cadastradas<p className="text-3xl font-black">{dados.mesas.length}</p></div><div className={card}>Pedidos em aberto<p className="text-3xl font-black">{dados.pedidos.length}</p></div><div className={card}>Vendas registradas<p className="text-3xl font-black">{moeda(dados.vendas.reduce((s, v) => s + v.total, 0))}</p></div></div><section className={`${card} mb-6`}><h3 className="mb-4 text-xl font-black">Gerenciamento de Mesas</h3><div className="mb-5 flex flex-wrap gap-3"><button className={btn} onClick={() => adicionarMesas(1)}>+ Adicionar 1 mesa</button><input type="number" min={1} max={500} className="w-32 rounded-xl border p-3" value={quantidadeMesas} onChange={e => setQuantidadeMesas(e.target.value)} /><button className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white" onClick={() => adicionarMesas(Number(quantidadeMesas))}>+ Adicionar várias mesas</button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{dados.mesas.map(n => <div key={n} className="flex items-center justify-between rounded-xl border bg-slate-50 p-3"><span>Mesa {n}</span><button disabled={pedidosMesa(n).length > 0 || (dados.carrinhos[n] || []).length > 0} onClick={() => excluirMesa(n)} className="rounded bg-red-100 px-3 py-2 text-red-700 disabled:opacity-30">Excluir</button></div>)}</div></section><section className={`${card} mb-6`}><h3 className="mb-4 text-xl font-black">Cadastrar produto</h3><div className="grid gap-3 md:grid-cols-3"><input className={campo} placeholder="Nome" value={novoProduto.nome} onChange={e => setNovoProduto({ ...novoProduto, nome: e.target.value })}/><input className={campo} placeholder="Preço: 25,90" value={novoProduto.preco} onChange={e => setNovoProduto({ ...novoProduto, preco: e.target.value })}/><input className={campo} placeholder="Categoria" value={novoProduto.categoria} onChange={e => setNovoProduto({ ...novoProduto, categoria: e.target.value })}/></div><div className="mt-4 rounded-xl border border-dashed border-orange-300 bg-orange-50 p-4"><label className="mb-2 block font-bold">📷 Foto do produto (opcional)</label><input type="file" accept="image/*" className="block w-full text-sm" onChange={e => { importarFoto(e.target.files?.[0]); e.target.value = ""; }} />{novoProduto.foto ? <div className="mt-3 flex flex-wrap items-center gap-3"><img src={novoProduto.foto} alt="Prévia do produto" className="h-28 w-28 rounded-lg border object-cover"/><button type="button" onClick={() => setNovoProduto(p => ({ ...p, foto: "" }))} className="rounded-lg bg-red-100 px-3 py-2 font-semibold text-red-700">Remover foto</button></div> : <p className="mt-2 text-xs text-slate-500">Selecione uma foto do computador ou celular. Ela aparecerá no cardápio do garçom.</p>}</div><button className={`${btn} mt-4`} onClick={cadastrarProduto}>+ Cadastrar produto</button><div className="mt-5">{dados.produtos.map(p => <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><div className="flex items-center gap-3">{p.foto ? <img src={p.foto} alt={p.nome} className="h-12 w-12 rounded-lg object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">🍽️</span>}<span>{p.nome} — {moeda(p.preco)}</span></div><div className="flex flex-wrap gap-2"><button className="rounded bg-slate-100 px-4 py-2" onClick={() => atualizar({ produtos: dados.produtos.map(x => x.id === p.id ? { ...x, ativo: !x.ativo } : x) })}>{p.ativo ? "Desativar" : "Ativar"}</button><button className="rounded bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700" onClick={() => excluirProduto(p)}>🗑️ Excluir</button></div></div>)}</div></section><section className={card}><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-black">Histórico de vendas</h3><button className={btn} onClick={exportarVendas}>Exportar CSV</button></div>{dados.vendas.map(v => <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><span>Mesa {v.mesa} — {moeda(v.total)} — {v.data}</span><div className="flex flex-wrap gap-2"><button className="rounded bg-blue-100 px-3 py-2" onClick={() => mostrarVenda(v)}>Imprimir recibo</button><button className="rounded bg-red-600 px-3 py-2 font-bold text-white hover:bg-red-700" onClick={() => excluirVenda(v)}>🗑️ Excluir</button></div></div>)}</section></>}
      </div>
      {recibo && pode(["admin", "caixa"]) && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"><div className="my-auto w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><div className="sem-impressao mb-4 flex items-center justify-between"><h2 className="text-xl font-black">🧾 Conta do cliente</h2><button onClick={() => setRecibo(null)} className="rounded-lg bg-slate-100 px-3 py-2 font-bold">Fechar ✕</button></div><div id="recibo-impressao" className="mx-auto max-w-sm bg-white p-4 text-black"><h2 className="text-center text-xl font-black">ComandaFácil</h2><p className="text-center text-xs">COMPROVANTE NÃO FISCAL</p><p className="my-3 border-y border-dashed py-2 text-center font-bold">{recibo.pagamento ? "RECIBO DE PAGAMENTO" : "CONFERÊNCIA DE CONSUMO"}</p><p>Mesa: <strong>{recibo.mesa}</strong></p><p>Data: {recibo.data}</p><p>Referência: {recibo.numero}</p><div className="my-3 border-t border-dashed pt-2"><div className="mb-2 grid grid-cols-12 gap-1 text-xs font-bold"><span className="col-span-2">Qtd.</span><span className="col-span-5">Produto</span><span className="col-span-2 text-right">Unit.</span><span className="col-span-3 text-right">Total</span></div>{recibo.itens.map((i, idx) => <div key={`${i.id}-${idx}`} className="grid grid-cols-12 gap-1 border-b border-dotted py-2 text-xs"><span className="col-span-2">{i.qtd}x</span><span className="col-span-5 break-words">{i.nome}</span><span className="col-span-2 text-right">{moeda(i.preco)}</span><span className="col-span-3 text-right">{moeda(i.preco * i.qtd)}</span></div>)}</div><p className="border-t border-dashed pt-3 text-right text-xl font-black">TOTAL: {moeda(recibo.total)}</p>{recibo.pagamento && <p className="mt-2">Pagamento: {recibo.pagamento}</p>}<p className="mt-5 text-center text-xs">Obrigado pela preferência!</p><p className="mt-2 text-center text-xs">Documento sem valor fiscal</p></div><div className="sem-impressao mt-5 flex gap-2"><button onClick={() => window.print()} className="flex-1 rounded-xl bg-blue-600 p-3 font-bold text-white">🖨️ Imprimir conta</button><button onClick={() => setRecibo(null)} className="rounded-xl bg-slate-200 px-5 py-3 font-bold">Voltar</button></div></div></div>}
      <footer className="mt-10 p-6 text-center text-sm text-slate-500">ComandaFácil V7 — Demonstração local · Impressão não fiscal</footer>
    </main>
  );
}
