function formatCurrency(value) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  return numericValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

// Define os presets com valores padrão para IPv4 e Veeam
const presets = {
  "win1": { os: "windows", vcpu: 4, memoria: 8, disco: 200, link: 10, ipv4: 1, veeam: 1 },
  "win2": { os: "windows", vcpu: 6, memoria: 12, disco: 250, link: 12, ipv4: 1, veeam: 1 },
  "win3": { os: "windows", vcpu: 8, memoria: 16, disco: 350, link: 15, ipv4: 1, veeam: 1 },
  "lin1": { os: "linux", vcpu: 4, memoria: 8, disco: 200, link: 10, ipv4: 1, veeam: 1 },
  "lin2": { os: "linux", vcpu: 6, memoria: 12, disco: 250, link: 12, ipv4: 1, veeam: 1 },
  "lin3": { os: "linux", vcpu: 8, memoria: 16, disco: 350, link: 15, ipv4: 1, veeam: 1 },
};

function applyPreset(presetKey) {
  const preset = presets[presetKey];
  if (!preset) {
    // Se "-- Selecione um Preset --" for escolhido, não faz nada ou limpa os campos (opcional)
    return;
  };

  // Aplica os valores do preset aos campos correspondentes
  document.getElementById('osSelect').value = preset.os;
  document.querySelector('.qty-vcpu').value = preset.vcpu;
  document.querySelector('.item.qty[data-name="Memória"]').value = preset.memoria;
  document.querySelector('.qty-disco').value = preset.disco;
  document.querySelector('.item.qty[data-name="MBps link de internet"]').value = preset.link;
  document.querySelector('.item.qty[data-name="Alocação de IPv4"]').value = preset.ipv4 !== undefined ? preset.ipv4 : '';
  document.querySelector('.item.qty[data-name="Licença Veeam backup por VM"]').value = preset.veeam !== undefined ? preset.veeam : '';

  // Dispara o cálculo total imediatamente após aplicar o preset
  calculateTotals();
}

function calculateTotals() {
  // Seleciona todos os elementos necessários para o cálculo
  const vcpuQtyInput = document.querySelector('.qty-vcpu');
  const discoQtyInput = document.querySelector('.qty-disco');
  const vmwareQtyInput = document.querySelector('.qty-vmware[data-name="Licença VMware por vCPU"]');
  const backupAreaQtyInput = document.querySelector('.qty-backup-area[data-name="Area de backup cloud"]');
  const osSelect = document.getElementById('osSelect');
  const ambienteNovoRadio = document.getElementById('ambienteNovo');
  const windowsQtyInput = document.querySelector('.qty-windows[data-name="Licença Windows por vCPU"]');
  const linkQtyInput = document.querySelector('.item.qty[data-name="MBps link de internet"]');
  const ipv4QtyInput = document.querySelector('.item.qty[data-name="Alocação de IPv4"]');

  // Verifica se todos os elementos foram encontrados para evitar erros
  if (!vcpuQtyInput || !discoQtyInput || !vmwareQtyInput || !backupAreaQtyInput || !osSelect || !ambienteNovoRadio || !windowsQtyInput || !linkQtyInput || !ipv4QtyInput) {
      console.error("Erro: Um ou mais elementos da calculadora não foram encontrados. Verifique a estrutura HTML e os seletores no script.js.");
      return; // Interrompe o cálculo se algum elemento estiver faltando
  }

  // Obtém os valores dos inputs
  const vcpuQty = parseInt(vcpuQtyInput.value) || 0;
  const discoQty = parseFloat(discoQtyInput.value) || 0;

  // --- Aplica as Regras de Negócio --- 

  // Regra 1: Licença VMware = Quantidade de vCPU
  vmwareQtyInput.value = vcpuQty;

  // Regra 3: Área de Backup = Tamanho do Disco * 1.5
  backupAreaQtyInput.value = (discoQty * 1.5).toFixed(2);

  // Regra 2: Licença Windows = Quantidade de vCPU (apenas se o SO for Windows)
  const isWindows = osSelect.value === 'windows';
  windowsQtyInput.value = isWindows ? vcpuQty : 0;

  // Regra 4: Ambiente Novo - Garante Link >= 1 e IPv4 >= 1
  const isAmbienteNovo = ambienteNovoRadio.checked;
  if (isAmbienteNovo) {
    if (!linkQtyInput.value || parseFloat(linkQtyInput.value) < 1) {
      linkQtyInput.value = 1;
    }
    if (!ipv4QtyInput.value || parseInt(ipv4QtyInput.value) < 1) {
      ipv4QtyInput.value = 1;
    }
  }

  // --- Calcula o Custo Total --- 
  let grandTotal = 0;
  const priceInputs = document.querySelectorAll('.item-price');

  priceInputs.forEach(priceInput => {
    const name = priceInput.dataset.name;
    // Encontra o input de quantidade correspondente (incluindo os readonly)
    const qtyInput = document.querySelector(
        `.item.qty[data-name="${name}"],` +
        `.qty-vcpu[data-name="${name}"],` +
        `.qty-disco[data-name="${name}"],` +
        `.qty-backup-area[data-name="${name}"],` +
        `.qty-vmware[data-name="${name}"],` +
        `.qty-windows[data-name="${name}"]`
    );
    const totalElement = document.querySelector(`.total[data-name="${name}"]`);

    let unit = parseFloat(priceInput.value) || 0;
    let qty = 0;

    if (qtyInput) {
        qty = parseFloat(qtyInput.value) || 0;
    } else {
        console.warn(`Aviso: Input de quantidade não encontrado para: ${name}`);
    }

    let total = unit * qty;

    if (totalElement) {
      totalElement.textContent = "Total: " + formatCurrency(total);
    } else {
        console.warn(`Aviso: Elemento total não encontrado para: ${name}`);
    }

    grandTotal += total;
  });

  // Atualiza o valor total geral na página
  const grandTotalElement = document.getElementById('grandTotal');
  if (grandTotalElement) {
      grandTotalElement.textContent = formatCurrency(grandTotal);
  } else {
      console.error("Erro: Elemento 'grandTotal' não encontrado.");
  }
}

// --- Configura os Event Listeners --- 
document.addEventListener('DOMContentLoaded', () => {
    // Calcula os totais iniciais ao carregar a página
    calculateTotals();

    // Adiciona listeners para todos os inputs que devem disparar o recálculo
    const inputsToWatch = document.querySelectorAll(
        '.item.qty, .qty-vcpu, .qty-disco, .item-price, #osSelect, input[name="ambienteTipo"]'
    );
    inputsToWatch.forEach(input => {
        // Usa 'input' para campos de texto/número e 'change' para select/radio/checkbox
        const eventType = (input.type === 'text' || input.type === 'number') ? 'input' : 'change';
        input.addEventListener(eventType, calculateTotals);
        // Adiciona 'change' também para inputs numéricos para capturar cliques nas setas
        if (input.type === 'number') {
            input.addEventListener('change', calculateTotals);
        }
    });

    // Adiciona listener para o select de presets
    const presetSelect = document.getElementById('presetSelect');
    if (presetSelect) {
        presetSelect.addEventListener('change', (event) => {
            applyPreset(event.target.value);
        });
    } else {
        console.error("Erro: Elemento 'presetSelect' não encontrado.");
    }
});

