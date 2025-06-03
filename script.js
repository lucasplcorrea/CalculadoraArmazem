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
    return;
  };

  document.getElementById('osSelect').value = preset.os;
  document.querySelector('.qty-vcpu').value = preset.vcpu;
  document.querySelector('.item.qty[data-name="Memória"]').value = preset.memoria;
  document.querySelector('.qty-disco').value = preset.disco;
  document.querySelector('.item.qty[data-name="MBps link de internet"]').value = preset.link;
  document.querySelector('.item.qty[data-name="Alocação de IPv4"]').value = preset.ipv4 !== undefined ? preset.ipv4 : '';
  document.querySelector('.item.qty[data-name="Licença Veeam backup por VM"]').value = preset.veeam !== undefined ? preset.veeam : '';

  calculateTotals();
}

function calculateTotals() {
  const vcpuQtyInput = document.querySelector('.qty-vcpu');
  const discoQtyInput = document.querySelector('.qty-disco');
  const vmwareQtyInput = document.querySelector('.qty-vmware[data-name="Licença VMware por vCPU"]');
  const backupAreaQtyInput = document.querySelector('.qty-backup-area[data-name="Area de backup cloud"]');
  const osSelect = document.getElementById('osSelect');
  const ambienteNovoRadio = document.getElementById('ambienteNovo');
  const windowsQtyInput = document.querySelector('.qty-windows[data-name="Licença Windows por vCPU"]');
  const linkQtyInput = document.querySelector('.item.qty[data-name="MBps link de internet"]');
  const ipv4QtyInput = document.querySelector('.item.qty[data-name="Alocação de IPv4"]');

  if (!vcpuQtyInput || !discoQtyInput || !vmwareQtyInput || !backupAreaQtyInput || !osSelect || !ambienteNovoRadio || !windowsQtyInput || !linkQtyInput || !ipv4QtyInput) {
      console.error("Erro: Um ou mais elementos da calculadora não foram encontrados.");
      return;
  }

  const vcpuQty = parseInt(vcpuQtyInput.value) || 0;
  const discoQty = parseFloat(discoQtyInput.value) || 0;

  vmwareQtyInput.value = vcpuQty;
  backupAreaQtyInput.value = (discoQty * 1.5).toFixed(2);
  const isWindows = osSelect.value === 'windows';
  windowsQtyInput.value = isWindows ? vcpuQty : 0;

  const isAmbienteNovo = ambienteNovoRadio.checked;
  if (isAmbienteNovo) {
    if (!linkQtyInput.value || parseFloat(linkQtyInput.value) < 1) {
      linkQtyInput.value = 1;
    }
    if (!ipv4QtyInput.value || parseInt(ipv4QtyInput.value) < 1) {
      ipv4QtyInput.value = 1;
    }
  }

  let grandTotal = 0;
  const priceInputs = document.querySelectorAll('.item-price');

  priceInputs.forEach(priceInput => {
    const name = priceInput.dataset.name;
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

  const grandTotalElement = document.getElementById('grandTotal');
  if (grandTotalElement) {
      grandTotalElement.textContent = formatCurrency(grandTotal);
  } else {
      console.error("Erro: Elemento 'grandTotal' não encontrado.");
  }
}

function generateWhatsAppMessage() {
    const vcpu = document.querySelector('.qty-vcpu').value || 0;
    const memoria = document.querySelector('.item.qty[data-name="Memória"]').value || 0;
    const disco = document.querySelector('.qty-disco').value || 0;
    const link = document.querySelector('.item.qty[data-name="MBps link de internet"]').value || 0;
    const ipv4 = document.querySelector('.item.qty[data-name="Alocação de IPv4"]').value || 0;
    const backupArea = document.querySelector('.qty-backup-area').value || 0;
    const licencaVeeam = document.querySelector('.item.qty[data-name="Licença Veeam backup por VM"]').value || 0;
    const os = document.getElementById('osSelect').value;
    const ambiente = document.getElementById('ambienteNovo').checked ? 'Novo' : 'Existente';
    const custoTotal = document.getElementById('grandTotal').textContent;

    let message = "Olá! Gostaria de um orçamento para a seguinte configuração de VM:\n\n";
    message += `*Ambiente:* ${ambiente}\n`;
    message += `*Sistema Operacional:* ${os.charAt(0).toUpperCase() + os.slice(1)}\n`;
    message += `*vCPU:* ${vcpu}\n`;
    message += `*Memória:* ${memoria} GB\n`;
    message += `*Disco:* ${disco} GB\n`;
    message += `*Link Internet:* ${link} Mbps\n`;
    message += `*IPv4:* ${ipv4}\n`;
    message += `*Área de Backup:* ${backupArea} GB\n`;
    if (licencaVeeam > 0) {
        message += `*Licença Veeam:* ${licencaVeeam} VM(s)\n`;
    }
    // Inclui licenças VMware e Windows (que são calculadas automaticamente)
    const licencaVMware = document.querySelector('.qty-vmware').value || 0;
    if (licencaVMware > 0) {
         message += `*Licença VMware:* ${licencaVMware} vCPU(s)\n`;
    }
    const licencaWindows = document.querySelector('.qty-windows').value || 0;
    if (licencaWindows > 0) {
         message += `*Licença Windows:* ${licencaWindows} vCPU(s)\n`;
    }
    message += `\n*Custo Total Estimado:* ${custoTotal}`;

    return encodeURIComponent(message);
}


document.addEventListener('DOMContentLoaded', () => {
    calculateTotals();

    const inputsToWatch = document.querySelectorAll(
        '.item.qty, .qty-vcpu, .qty-disco, .item-price, #osSelect, input[name="ambienteTipo"]'
    );
    inputsToWatch.forEach(input => {
        const eventType = (input.type === 'text' || input.type === 'number') ? 'input' : 'change';
        input.addEventListener(eventType, calculateTotals);
        if (input.type === 'number') {
            input.addEventListener('change', calculateTotals);
        }
    });

    const presetSelect = document.getElementById('presetSelect');
    if (presetSelect) {
        presetSelect.addEventListener('change', (event) => {
            applyPreset(event.target.value);
        });
    } else {
        console.error("Erro: Elemento 'presetSelect' não encontrado.");
    }

    // Adiciona listener para o botão WhatsApp
    const whatsappBtn = document.getElementById('whatsappBtn');
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', () => {
            const phoneNumber = "554774008146"; // Número fornecido pelo usuário
            const message = generateWhatsAppMessage();
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
            window.open(whatsappUrl, '_blank'); // Abre em nova aba
        });
    } else {
         console.error("Erro: Elemento 'whatsappBtn' não encontrado.");
    }
});
