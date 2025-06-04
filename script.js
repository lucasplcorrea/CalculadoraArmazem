let vmCounter = 0;
const globalUnitPrices = {}; // Store global unit prices like Link, IPv4

// Ensure jsPDF is loaded before using it
const { jsPDF } = window.jspdf;

// Preset Configurations
const presets = {
    "win1": { vcpu: 4, memoria: 8, disco: 200, os: "windows" },
    "win2": { vcpu: 6, memoria: 12, disco: 250, os: "windows" },
    "win3": { vcpu: 8, memoria: 16, disco: 350, os: "windows" },
    "lin1": { vcpu: 4, memoria: 8, disco: 200, os: "linux" },
    "lin2": { vcpu: 6, memoria: 12, disco: 250, os: "linux" },
    "lin3": { vcpu: 8, memoria: 16, disco: 350, os: "linux" },
    "firewall": { vcpu: 1, memoria: 1, disco: 10, os: "linux" }
};

function formatCurrency(value) {
    const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    return numericValue.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// --- VM Management --- 

function addVm() {
    vmCounter++;
    const template = document.getElementById('vmTemplate');
    const vmContainer = document.getElementById('vmContainer');
    const newVm = template.content.cloneNode(true);
    const vmBlock = newVm.querySelector('.vm-block');
    vmBlock.dataset.vmId = vmCounter;
    vmBlock.querySelector('.vm-number').textContent = vmCounter;

    // Set default values for new VM (especially if it's not the first one)
    if (vmCounter > 1) {
        const firstVm = document.querySelector('#vmContainer .vm-block');
        if (firstVm) {
            vmBlock.querySelector('.qty-vcpu').value = firstVm.querySelector('.qty-vcpu').value;
            vmBlock.querySelector('.item.qty[data-name="Memória"]').value = firstVm.querySelector('.item.qty[data-name="Memória"]').value;
            vmBlock.querySelector('.qty-disco').value = firstVm.querySelector('.qty-disco').value;
            vmBlock.querySelector('.osSelect').value = firstVm.querySelector('.osSelect').value;
        } else {
             // Fallback defaults if first VM somehow doesn't exist when adding second
             vmBlock.querySelector('.qty-vcpu').value = 1;
             vmBlock.querySelector('.item.qty[data-name="Memória"]').value = 1;
             vmBlock.querySelector('.qty-disco').value = 10;
             vmBlock.querySelector('.osSelect').value = 'linux';
        }
    } else {
        // Default for the very first VM (can be overridden by preset later)
        vmBlock.querySelector('.qty-vcpu').value = 1;
        vmBlock.querySelector('.item.qty[data-name="Memória"]').value = 1;
        vmBlock.querySelector('.qty-disco').value = 10;
        vmBlock.querySelector('.osSelect').value = 'linux';
    }

    vmContainer.appendChild(newVm);
    attachVmEventListeners(vmBlock); // Attach listeners to the new VM
    calculateTotals(); // Recalculate after adding
}

function removeVm(button) {
    const vmBlock = button.closest('.vm-block');
    if (vmBlock) {
        if (document.querySelectorAll('#vmContainer .vm-block').length > 1) {
            vmBlock.remove();
            calculateTotals(); // Recalculate after removing
        } else {
            alert("É necessário manter pelo menos uma VM.");
        }
    }
}

// --- Preset Logic --- 
function applyPreset(presetKey) {
    const preset = presets[presetKey];
    if (!preset) return;

    const firstVmBlock = document.querySelector('#vmContainer .vm-block');
    if (!firstVmBlock) {
        console.error("Nenhuma VM encontrada para aplicar o preset.");
        return;
    }

    firstVmBlock.querySelector('.qty-vcpu').value = preset.vcpu;
    firstVmBlock.querySelector('.item.qty[data-name="Memória"]').value = preset.memoria;
    firstVmBlock.querySelector('.qty-disco').value = preset.disco;
    firstVmBlock.querySelector('.osSelect').value = preset.os;

    // Trigger change events manually if needed, or just recalculate
    calculateTotals();
}


// --- Calculation Logic --- 

function calculateTotals() {
    let totalVmsCost = 0;
    let totalLicencasCost = 0;
    let totalBackupCost = 0;
    let totalConectividadeCost = 0;
    let totalServicosMensalCost = 0;
    let totalServicosUnicoCost = 0;
    let totalImplementacaoCost = 0;
    let totalDiskSum = 0; // Sum of all disks for backup area calculation

    const vmBlocks = document.querySelectorAll('#vmContainer .vm-block');
    const isAmbienteNovo = document.getElementById('ambienteNovo').checked;
    const isClienteExistente = document.getElementById('ambienteExistente').checked;
    const linkMbpsInput = document.getElementById('linkDedicadoMbps');
    const linkMbpsQty = isAmbienteNovo ? (parseInt(linkMbpsInput.value) || 1) : 0; // Default to 1 Mbps if new and invalid

    // Show/Hide Link and Implementation fields based on environment type
    const linkContainer = document.getElementById('linkDedicadoContainer');
    const implementacaoContainer = document.getElementById('custoImplementacaoContainer');
    if (isAmbienteNovo) {
        if (linkContainer) linkContainer.classList.remove('hidden');
        if (implementacaoContainer) implementacaoContainer.classList.remove('hidden');
        if (linkMbpsInput && parseInt(linkMbpsInput.value) < 1) linkMbpsInput.value = 1; // Enforce minimum 1 Mbps
        totalImplementacaoCost = parseFloat(document.getElementById('custoImplementacao').value) || 0;
    } else {
        if (linkContainer) linkContainer.classList.add('hidden');
        if (implementacaoContainer) implementacaoContainer.classList.add('hidden');
        totalImplementacaoCost = 0; // No implementation cost for existing clients
    }

    // 1. Calculate costs for each VM and sum total disk size
    vmBlocks.forEach(vmBlock => {
        let vmBaseTotal = 0;
        let vmLicencaTotal = 0;
        let vmBackupIndividualCost = 0; // Veeam cost per VM

        const vcpuInput = vmBlock.querySelector('.qty-vcpu');
        const memoriaInput = vmBlock.querySelector('.item.qty[data-name="Memória"]');
        const discoInput = vmBlock.querySelector('.qty-disco');
        const osSelect = vmBlock.querySelector('.osSelect');
        const veeamHiddenInput = vmBlock.querySelector('.qty-veeam'); // Hidden input now

        const vcpuQty = parseInt(vcpuInput.value) || 0;
        const memoriaQty = parseInt(memoriaInput.value) || 0;
        const discoQty = parseFloat(discoInput.value) || 0;
        const isWindows = osSelect.value === 'windows';

        totalDiskSum += discoQty; // Add to total disk sum

        // --- Apply VM-specific rules ---
        const vmwareQtyInput = vmBlock.querySelector('.qty-vmware');
        const windowsQtyInput = vmBlock.querySelector('.qty-windows');

        if (vmwareQtyInput) vmwareQtyInput.value = vcpuQty; // Rule: VMware Lic = vCPU
        if (windowsQtyInput) windowsQtyInput.value = isWindows ? vcpuQty : 0; // Rule: Win Lic = vCPU if Windows
        // Veeam is always 1 per VM
        if (veeamHiddenInput) veeamHiddenInput.value = 1;

        // --- Calculate individual item costs within the VM ---
        const items = vmBlock.querySelectorAll('.item, .qty-vcpu, .qty-disco, .qty-veeam, .qty-vmware, .qty-windows');
        items.forEach(item => {
            const name = item.dataset.name;
            const priceInput = vmBlock.querySelector(`.item-price[data-name="${name}"]`);
            const totalElement = vmBlock.querySelector(`.total[data-name="${name}"]`);
            let qty = parseFloat(item.value) || 0;
            let unitPrice = 0;

            if (priceInput) {
                unitPrice = parseFloat(priceInput.value) || 0;
            }

            let itemTotal = unitPrice * qty;

            if (totalElement) {
                totalElement.textContent = "Total: " + formatCurrency(itemTotal);
            }

            // Categorize costs
            if (name === 'vCPU' || name === 'Memória' || name === 'Disco') {
                vmBaseTotal += itemTotal;
            }
            if (name === 'Licença VMware por vCPU' || name === 'Licença Windows por vCPU') {
                vmLicencaTotal += itemTotal;
            }
            if (name === 'Licença Veeam backup por VM') {
                vmBackupIndividualCost += itemTotal; // Veeam cost is per VM
            }
        });

        totalVmsCost += vmBaseTotal;
        totalLicencasCost += vmLicencaTotal;
        totalBackupCost += vmBackupIndividualCost; // Add Veeam cost per VM to total backup cost
    });

    // 2. Calculate Global Backup Area Cost (based on total disk sum)
    const backupAreaUnitPrice = parseFloat(globalUnitPrices['Area de backup cloud'] || 0);
    const requiredBackupArea = totalDiskSum * 1.5;
    const backupAreaCost = requiredBackupArea * backupAreaUnitPrice;
    totalBackupCost += backupAreaCost; // Add area cost to total backup cost

    // Add custom backup costs (calculated based on Disk cost of EACH VM)
    vmBlocks.forEach(vmBlock => {
        const discoInput = vmBlock.querySelector('.qty-disco');
        const discoQty = parseFloat(discoInput.value) || 0;
        const diskUnitPrice = parseFloat(vmBlock.querySelector('.item-price[data-name="Disco"]').value) || 0;
        const diskCost = discoQty * diskUnitPrice;

        const retencaoCheck = vmBlock.querySelector('.backup-retencao');
        const frequenciaCheck = vmBlock.querySelector('.backup-frequencia');
        let customBackupMultiplier = 0;

        if (retencaoCheck && retencaoCheck.checked) {
            customBackupMultiplier += parseFloat(retencaoCheck.dataset.costMultiplier) || 0;
        }
        if (frequenciaCheck && frequenciaCheck.checked) {
            customBackupMultiplier += parseFloat(frequenciaCheck.dataset.costMultiplier) || 0;
        }
        totalBackupCost += diskCost * customBackupMultiplier; // Add custom cost per VM
    });


    // 3. Calculate Global Connectivity Costs (Link, IPv4)
    const linkPrice = parseFloat(globalUnitPrices['MBps link de internet'] || 0);
    const ipv4Price = parseFloat(globalUnitPrices['Alocação de IPv4'] || 0);

    // Rule: No Link/IPv4 cost for existing clients
    if (!isClienteExistente) {
        totalConectividadeCost += linkPrice * linkMbpsQty; // Use quantity from input
        totalConectividadeCost += ipv4Price * 1; // Assuming 1 IPv4 for new clients
    }

    // 4. Calculate Additional Services Costs (Monthly and Unique)
    document.querySelectorAll('.servico-adicional:checked').forEach(checkbox => {
        const cost = parseFloat(checkbox.value) || 0;
        const costType = checkbox.dataset.costType;
        if (costType === 'monthly') {
            totalServicosMensalCost += cost;
        } else if (costType === 'unique') {
            totalServicosUnicoCost += cost;
        }
    });

    // 5. Update Summary Display
    document.getElementById('custoTotalVms').textContent = formatCurrency(totalVmsCost);
    document.getElementById('custoTotalLicencas').textContent = formatCurrency(totalLicencasCost);
    document.getElementById('custoTotalBackup').textContent = formatCurrency(totalBackupCost);
    document.getElementById('custoTotalConectividade').textContent = formatCurrency(totalConectividadeCost);
    document.getElementById('custoTotalServicosMensal').textContent = formatCurrency(totalServicosMensalCost);
    document.getElementById('custoTotalImplementacao').textContent = formatCurrency(totalImplementacaoCost);
    document.getElementById('custoTotalServicosUnico').textContent = formatCurrency(totalServicosUnicoCost);

    const grandTotalUnico = totalImplementacaoCost + totalServicosUnicoCost;
    document.getElementById('custoTotalUnico').textContent = formatCurrency(grandTotalUnico);

    // 6. Calculate and Display Grand Total Monthly
    const grandTotalMensal = totalVmsCost + totalLicencasCost + totalBackupCost + totalConectividadeCost + totalServicosMensalCost;
    document.getElementById('grandTotalMensal').textContent = formatCurrency(grandTotalMensal);
}

// --- Generate Content for Export --- 

function generateWhatsAppMessage() {
    let message = "Olá! Gostaria de um orçamento para a seguinte configuração no Armazém Cloud:\n\n";
    const cliente = document.getElementById('nomeCliente').value;
    if (cliente) {
        message += `*Cliente:* ${cliente}\n`;
    }
    const ambiente = document.getElementById('ambienteNovo').checked ? 'Novo' : 'Existente';
    message += `*Ambiente:* ${ambiente}\n`;
    if (ambiente === 'Novo') {
        const linkMbps = document.getElementById('linkDedicadoMbps').value || 1;
        message += `*Link Dedicado:* ${linkMbps} MBps\n`;
    }

    const vmBlocks = document.querySelectorAll('#vmContainer .vm-block');
    vmBlocks.forEach((vmBlock, index) => {
        const vmId = index + 1;
        const vcpu = vmBlock.querySelector('.qty-vcpu').value || 0;
        const memoria = vmBlock.querySelector('.item.qty[data-name="Memória"]').value || 0;
        const disco = vmBlock.querySelector('.qty-disco').value || 0;
        const os = vmBlock.querySelector('.osSelect').value;
        const retencao = vmBlock.querySelector('.backup-retencao').checked ? 'Sim' : 'Não';
        const frequencia = vmBlock.querySelector('.backup-frequencia').checked ? 'Sim' : 'Não';

        message += `\n--- VM ${vmId} ---\n`;
        message += `*SO:* ${os.charAt(0).toUpperCase() + os.slice(1)}\n`;
        message += `*vCPU:* ${vcpu}\n`;
        message += `*Memória:* ${memoria} GB\n`;
        message += `*Disco:* ${disco} GB\n`;
        message += `*Lic. Veeam:* Inclusa\n`;
        message += `*Backup Custom:* Retenção>15d (${retencao}), Frequência<12h (${frequencia})\n`;
    });

    message += "\n--- Serviços Opcionais ---\n";
    const servicos = document.querySelectorAll('.servico-adicional:checked');
    if (servicos.length > 0) {
        servicos.forEach(s => {
            const costType = s.dataset.costType === 'unique' ? '(Custo Único)' : '(Mensal)';
            message += `- ${s.dataset.name} ${costType}\n`;
        });
    } else {
        message += `Nenhum\n`;
    }

    const custoTotalMensal = document.getElementById('grandTotalMensal').textContent;
    const custoTotalUnico = document.getElementById('custoTotalUnico').textContent;
    message += `\n*Custo Total Mensal Estimado:* ${custoTotalMensal}`;
    message += `\n*Custo Total Único (Setup):* ${custoTotalUnico}`;

    return encodeURIComponent(message);
}

// Function to generate PDF using jsPDF
function generatePdfWithJsPDF() {
    const doc = new jsPDF();
    let y = 15; // Initial Y position
    const lineHeight = 7;
    const indent = 10;
    const pageHeight = doc.internal.pageSize.height;
    const cliente = document.getElementById('nomeCliente').value;

    function checkPageBreak(lines = 1) {
        if (y + (lines * lineHeight) > pageHeight - 20) { // Check if content exceeds page height (with margin)
            doc.addPage();
            y = 15; // Reset Y for new page
        }
    }

    doc.setFontSize(18);
    doc.text("Orçamento Estimado - Armazém Cloud", doc.internal.pageSize.width / 2, y, { align: 'center' });
    y += lineHeight * 2;

    doc.setFontSize(12);
    if (cliente) {
        doc.text(`Cliente: ${cliente}`, indent, y); y += lineHeight;
    }
    const ambiente = document.getElementById('ambienteNovo').checked ? 'Novo' : 'Existente';
    doc.text(`Tipo de Ambiente: ${ambiente}`, indent, y); y += lineHeight;
    if (ambiente === 'Novo') {
        const linkMbps = document.getElementById('linkDedicadoMbps').value || 1;
        doc.text(`Link Dedicado Solicitado: ${linkMbps} MBps`, indent, y); y += lineHeight;
    }
    y += lineHeight; // Extra space

    doc.setFontSize(14);
    doc.text("Máquinas Virtuais", indent, y);
    y += lineHeight;
    doc.setFontSize(10);
    const vmBlocks = document.querySelectorAll('#vmContainer .vm-block');
    vmBlocks.forEach((vmBlock, index) => {
        checkPageBreak(8); // Estimate lines per VM block
        const vmId = index + 1;
        const vcpu = vmBlock.querySelector('.qty-vcpu').value || 0;
        const memoria = vmBlock.querySelector('.item.qty[data-name="Memória"]').value || 0;
        const disco = vmBlock.querySelector('.qty-disco').value || 0;
        const os = vmBlock.querySelector('.osSelect').value;
        const retencao = vmBlock.querySelector('.backup-retencao').checked ? 'Sim' : 'Não';
        const frequencia = vmBlock.querySelector('.backup-frequencia').checked ? 'Sim' : 'Não';

        doc.setFontSize(12);
        doc.text(`Máquina Virtual ${vmId}`, indent + 5, y); y += lineHeight;
        doc.setFontSize(10);
        doc.text(`- Sistema Operacional: ${os.charAt(0).toUpperCase() + os.slice(1)}`, indent + 10, y); y += lineHeight;
        doc.text(`- vCPU: ${vcpu}`, indent + 10, y); y += lineHeight;
        doc.text(`- Memória: ${memoria} GB`, indent + 10, y); y += lineHeight;
        doc.text(`- Disco: ${disco} GB`, indent + 10, y); y += lineHeight;
        doc.text(`- Licença Veeam: Inclusa`, indent + 10, y); y += lineHeight;
        doc.text(`- Backup Custom: Retenção>15d (${retencao}), Frequência<12h (${frequencia})`, indent + 10, y); y += lineHeight * 1.5;
    });

    checkPageBreak(3 + document.querySelectorAll('.servico-adicional:checked').length);
    doc.setFontSize(14);
    doc.text("Serviços Opcionais", indent, y);
    y += lineHeight;
    doc.setFontSize(10);
    const servicos = document.querySelectorAll('.servico-adicional:checked');
    if (servicos.length > 0) {
        servicos.forEach(s => {
            checkPageBreak();
            const costType = s.dataset.costType === 'unique' ? '(Custo Único)' : '(Mensal)';
            doc.text(`- ${s.dataset.name} ${costType} (${formatCurrency(s.value)})`, indent + 5, y); y += lineHeight;
        });
    } else {
        doc.text("- Nenhum serviço opcional selecionado.", indent + 5, y); y += lineHeight;
    }
    y += lineHeight;

    checkPageBreak(10); // Estimate lines for summary
    doc.setFontSize(14);
    doc.text("Resumo de Custos", indent, y);
    y += lineHeight;
    doc.setFontSize(10);
    doc.text(`- Custo Total VMs (Base): ${document.getElementById('custoTotalVms').textContent}`, indent + 5, y); y += lineHeight;
    doc.text(`- Custo Licenças (VMware/Windows): ${document.getElementById('custoTotalLicencas').textContent}`, indent + 5, y); y += lineHeight;
    doc.text(`- Custo Backup (Área + Veeam + Custom): ${document.getElementById('custoTotalBackup').textContent}`, indent + 5, y); y += lineHeight;
    doc.text(`- Custo Conectividade (Link + IP): ${document.getElementById('custoTotalConectividade').textContent}`, indent + 5, y); y += lineHeight;
    doc.text(`- Custo Serviços Adicionais (Mensal): ${document.getElementById('custoTotalServicosMensal').textContent}`, indent + 5, y); y += lineHeight;
    y += lineHeight * 0.5;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Custo Total Mensal Estimado: ${document.getElementById('grandTotalMensal').textContent}`, indent + 5, y);
    y += lineHeight * 1.5;
    doc.setFont(undefined, 'normal'); // Reset bold

    doc.setFontSize(12);
    doc.text("Custos Únicos (Setup)", indent, y); y += lineHeight;
    doc.setFontSize(10);
    doc.text(`- Custo Implementação: ${document.getElementById('custoTotalImplementacao').textContent}`, indent + 5, y); y += lineHeight;
    doc.text(`- Custo Serviços Adicionais (Único): ${document.getElementById('custoTotalServicosUnico').textContent}`, indent + 5, y); y += lineHeight;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Custos Únicos: ${document.getElementById('custoTotalUnico').textContent}`, indent + 5, y);
    doc.setFont(undefined, 'normal');

    doc.save(`orcamento-armazem-cloud${cliente ? ('-' + cliente.replace(/\s+/g, '_')) : ''}.pdf`);
}


// --- Event Listeners --- 

function attachVmEventListeners(vmBlock) {
    const inputsToWatch = vmBlock.querySelectorAll('.item, .qty-vcpu, .qty-disco, .osSelect, .backup-custom'); // Removed qty-veeam as it's fixed
    inputsToWatch.forEach(input => {
        const eventType = (input.type === 'text' || input.type === 'number') ? 'input' : 'change';
        input.addEventListener(eventType, calculateTotals);
        if (input.type === 'number') {
            // Also listen for change event for number inputs (e.g., when using arrows)
            input.addEventListener('change', calculateTotals);
        }
    });
    const removeBtn = vmBlock.querySelector('.remove-vm-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => removeVm(removeBtn));
    }
}

function attachGlobalEventListeners() {
    // Listen for changes in environment type, implementation cost, link speed, services
    document.querySelectorAll('input[name="ambienteTipo"], #custoImplementacao, #linkDedicadoMbps, .servico-adicional').forEach(input => {
        const eventType = (input.type === 'radio' || input.type === 'checkbox') ? 'change' : 'input';
        input.addEventListener(eventType, calculateTotals);
         if (input.type === 'number') {
            input.addEventListener('change', calculateTotals);
        }
    });

    // Preset selection listener
    const presetSelect = document.getElementById('presetSelect');
    if (presetSelect) {
        presetSelect.addEventListener('change', (event) => {
            if (event.target.value) {
                applyPreset(event.target.value);
            }
        });
    }

    const addVmBtn = document.getElementById('addVmBtn');
    if (addVmBtn) {
        addVmBtn.addEventListener('click', addVm);
    }

    const whatsappBtn = document.getElementById('whatsappBtn');
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', () => {
            const phoneNumber = "554774008146";
            const message = generateWhatsAppMessage();
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
            window.open(whatsappUrl, '_blank');
        });
    }

    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', generatePdfWithJsPDF);
    }
}

// --- Initialization --- 

document.addEventListener('DOMContentLoaded', () => {
    // Store global unit prices
    document.querySelectorAll('.item-price-global').forEach(input => {
        globalUnitPrices[input.dataset.name] = input.value;
    });
    addVm(); // Add the initial VM
    attachGlobalEventListeners(); // Attach all global listeners
    calculateTotals(); // Perform initial calculation
});

