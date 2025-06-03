function formatCurrency(value) {
  // Garante que o valor seja numérico antes de formatar
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  return numericValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

// Define os presets
const presets = {
  "win1": { os: "windows", vcpu: 4, memoria: 8, disco: 200, link: 10 },
  "win2": { os: "windows", vcpu: 6, memoria: 12, disco: 250, link: 12 },
  "win3": { os: "windows", vcpu: 8, memoria: 16, disco: 350, link: 15 },
  "lin1": { os: "linux", vcpu: 4, memoria: 8, disco: 200, link: 10 },
  "lin2": { os: "linux", vcpu: 6, memoria: 12, disco: 250, link: 12 },
  "lin3": { os: "linux", vcpu: 8, memoria: 16, disco: 350, link: 15 },
};

function applyPreset(presetKey) {
  const preset = presets[presetKey];
  if (!preset) return;

  document.getElementById('osSelect').value = preset.os;
  document.querySelector('.qty-vcpu').value = preset.vcpu;
  document.querySelector('.item.qty[data-name="Memória"]').value = preset.memoria;
  document.querySelector('.qty-disco').value = preset.disco;
  document.querySelector('.item.qty[data-name="MBps link de internet"]').value = preset.link;

  // Presets não definem IPv4 ou Licença Veeam, podem ser zerados ou mantidos
  // document.querySelector('.item.qty[data-name="Alocação de IPv4"]').value = 0;
  // document.querySelector('.item.qty[data-name="Licença Veeam backup por VM"]').value = 0;

  calculateTotals(); // Recalcula tudo após aplicar o preset
}

function calculateTotals() {
  const vcpuQtyInput = document.querySelector('.qty-vcpu');
  const discoQtyInput = document.querySelector('.qty-disco');
  const vmwareQtyInput = document.querySelector('.qty-vmware');
  const backupAreaQtyInput = document.querySelector('.qty-backup-area');
  const osSelect = document.getElementById('osSelect');
  const ambienteNovoRadio = document.getElementById('ambienteNovo');
  const windowsQtyInput = document.querySelector('.qty-windows');
  const linkQtyInput = document.querySelector('.item.qty[data-name="MBps link de internet"]');
  const ipv4QtyInput = document.querySelector('.item.qty[data-name="Alocação de IPv4"]');

  const vcpuQty = parseInt(vcpuQtyInput.value) || 0;
  const discoQty = parseFloat(discoQtyInput.value) || 0;

  // Regra 1: Licença VMware por vCPU
  vmwareQtyInput.value = vcpuQty;

  // Regra 3: Área de backup = Disco * 1.5
  backupAreaQtyInput.value = (discoQty * 1.5).toFixed(2); // Arredonda para 2 casas decimais

  // Regra 2: Licença Windows por vCPU (se SO for Windows)
  const isWindows = osSelect && osSelect.value === 'windows';
  windowsQtyInput.value = isWindows ? vcpuQty : 0;

  // Regra 4: Ambiente Novo - força 1 Mbps e 1 IPv4 se selecionado
  const isAmbienteNovo = ambienteNovoRadio && ambienteNovoRadio.checked;
  if (isAmbienteNovo) {
    // Apenas força se o valor atual for menor que 1
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
    // Seleciona o input de quantidade correspondente, incluindo os read-only
    const qtyInput = document.querySelector(`.item.qty[data-name="${name}"], .item.qty-vcpu[data-name="${name}"], .item.qty-disco[data-name="${name}"], .item.qty-backup-area[data-name="${name}"], .item.qty-vmware[data-name="${name}"], .item.qty-windows[data-name="${name}"]`);
    const totalElement = document.querySelector(`.total[data-name="${name}"]`);

    let unit = parseFloat(priceInput.value) || 0;
    let qty = parseFloat(qtyInput.value) || 0;
    let total = unit * qty;

    if (totalElement) {
      totalElement.textContent = "Total: " + formatCurrency(total);
    }

    grandTotal += total;
  });

  document.getElementById('grandTotal').textContent = formatCurrency(grandTotal);
}

// Adiciona listeners para recalcular quando qualquer input relevante mudar
document.querySelectorAll('.qty-vcpu, .qty-disco, .item.qty, .item-price, #osSelect, input[name="ambienteTipo"]
').forEach(input => {
  input.addEventListener('input', calculateTotals);
  input.addEventListener('change', calculateTotals); // Adiciona 'change' para radios e select
});

// Listener para o select de presets
document.getElementById('presetSelect').addEventListener('change', (event) => {
  applyPreset(event.target.value);
});

// Calcula totais ao carregar a página
document.addEventListener('DOMContentLoaded', calculateTotals);
