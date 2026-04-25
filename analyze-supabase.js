import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kcbpbnavfhtazausjhnr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjYnBibmF2Zmh0YXphdXNqaG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwODA4NjgsImV4cCI6MjA5MjY1Njg2OH0.IeonZrA_Fgxk8C_DId-MZqfQOrW84l4wUhilOKmaOgs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeSupabase() {
  try {
    console.log('\n🔄 Buscando dados do Supabase...\n');

    // Buscar dados
    const { data: dayData, error: dayError } = await supabase
      .from('day_data')
      .select('*');

    const { data: goals, error: goalsError } = await supabase
      .from('leadership_goals')
      .select('*');

    if (dayError) {
      console.error('❌ Erro ao buscar day_data:', dayError);
      return;
    }

    if (goalsError) {
      console.error('❌ Erro ao buscar leadership_goals:', goalsError);
      return;
    }

    console.log('✅ Dados carregados com sucesso!\n');
    console.log('═══════════════════════════════════════════════');
    console.log('📊 RELATÓRIO SUPABASE - axis-dashboard');
    console.log('═══════════════════════════════════════════════\n');

    // RESUMO GERAL
    console.log('📈 RESUMO GERAL');
    console.log(`├─ Total de registros: ${dayData.length}`);

    // Agrupar por tipo
    const sdrs = dayData.filter(d => d.person_type === 'sdr');
    const closers = dayData.filter(d => d.person_type === 'closer');

    const sdrCount = new Set(sdrs.map(d => d.person_id)).size;
    const closerCount = new Set(closers.map(d => d.person_id)).size;

    console.log(`├─ SDRs com dados: ${sdrCount}`);
    console.log(`├─ Closers com dados: ${closerCount}`);

    // Datas
    const dates = new Set(dayData.map(d => d.date));
    const sortedDates = Array.from(dates).sort();
    console.log(`├─ Datas com registros: ${sortedDates.length}`);
    console.log(`└─ Período: ${sortedDates[0]} → ${sortedDates[sortedDates.length - 1]}\n`);

    // DADOS POR PESSOA
    if (dayData.length > 0) {
      console.log('👥 DADOS POR PESSOA');

      const peopleMap = {};
      dayData.forEach(record => {
        const key = `${record.person_type.toUpperCase()}-${record.person_id}`;
        if (!peopleMap[key]) {
          peopleMap[key] = {
            type: record.person_type,
            id: record.person_id,
            reunioes: 0,
            contratos: 0,
            receita: 0,
            vendas: 0,
            arr: 0,
            mrr: 0,
            valor_recebido: 0,
            count: 0
          };
        }
        const d = record.data || {};
        peopleMap[key].reunioes += d.reunioes || 0;
        peopleMap[key].contratos += d.contratos || 0;
        peopleMap[key].receita += d.receita || 0;
        peopleMap[key].vendas += d.vendas || 0;
        peopleMap[key].arr += d.arr || 0;
        peopleMap[key].mrr += d.mrr || 0;
        peopleMap[key].valor_recebido += d.valor_recebido || 0;
        peopleMap[key].count += 1;
      });

      Object.entries(peopleMap).forEach(([key, person], idx) => {
        const isLast = idx === Object.keys(peopleMap).length - 1;
        console.log(`${isLast ? '└─' : '├─'} ${person.type.toUpperCase()} #${person.id}`);
        console.log(`${isLast ? '   ' : '│  '} ├─ Reuniões: ${person.reunioes}`);
        console.log(`${isLast ? '   ' : '│  '} ├─ Contratos: ${person.contratos}`);
        console.log(`${isLast ? '   ' : '│  '} ├─ Receita: R$ ${person.receita.toLocaleString('pt-BR')}`);
        console.log(`${isLast ? '   ' : '│  '} ├─ Vendas: ${person.vendas}`);
        console.log(`${isLast ? '   ' : '│  '} ├─ ARR: R$ ${person.arr.toLocaleString('pt-BR')}`);
        console.log(`${isLast ? '   ' : '│  '} ├─ MRR: R$ ${person.mrr.toLocaleString('pt-BR')}`);
        console.log(`${isLast ? '   ' : '│  '} ├─ Valor Recebido: R$ ${person.valor_recebido.toLocaleString('pt-BR')}`);
        console.log(`${isLast ? '   ' : '│  '} └─ Registros: ${person.count}`);
      });
    }

    console.log();

    // TOTALIZAÇÕES GERAIS
    let totalReuniones = 0, totalContratos = 0, totalReceita = 0;
    let totalVendas = 0, totalArr = 0, totalMrr = 0, totalValorRecebido = 0;

    dayData.forEach(record => {
      const d = record.data || {};
      totalReuniones += d.reunioes || 0;
      totalContratos += d.contratos || 0;
      totalReceita += d.receita || 0;
      totalVendas += d.vendas || 0;
      totalArr += d.arr || 0;
      totalMrr += d.mrr || 0;
      totalValorRecebido += d.valor_recebido || 0;
    });

    console.log('💰 TOTALIZAÇÕES GERAIS');
    console.log(`├─ Reuniões: ${totalReuniones}`);
    console.log(`├─ Contratos: ${totalContratos}`);
    console.log(`├─ Receita Total: R$ ${totalReceita.toLocaleString('pt-BR')}`);
    console.log(`├─ Vendas Totais: ${totalVendas}`);
    console.log(`├─ ARR Acumulado: R$ ${totalArr.toLocaleString('pt-BR')}`);
    console.log(`├─ MRR Acumulado: R$ ${totalMrr.toLocaleString('pt-BR')}`);
    console.log(`└─ Valor Total Recebido: R$ ${totalValorRecebido.toLocaleString('pt-BR')}\n`);

    // METAS DE LIDERANÇA
    if (goals && goals.length > 0) {
      console.log('🎯 METAS DE LIDERANÇA');
      goals.forEach((goal, idx) => {
        const isLast = idx === goals.length - 1;
        console.log(`${isLast ? '└─' : '├─'} ${goal.role || 'Indefinido'}`);
        console.log(`${isLast ? '   ' : '│  '} └─ ${JSON.stringify(goal.goals)}`);
      });
      console.log();
    }

    // ÚLTIMOS REGISTROS
    if (dayData.length > 0) {
      const sorted = [...dayData].sort((a, b) =>
        new Date(b.updated_at) - new Date(a.updated_at)
      );

      console.log('⚡ ÚLTIMOS REGISTROS');
      console.log(`├─ Última atualização: ${sorted[0].updated_at}`);
      console.log(`├─ Última pessoa: ${sorted[0].person_type.toUpperCase()} #${sorted[0].person_id}`);
      console.log(`└─ Total de atualizações: ${dayData.length}\n`);
    }

    console.log('═══════════════════════════════════════════════');
    console.log('✅ Análise concluída!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

analyzeSupabase();
