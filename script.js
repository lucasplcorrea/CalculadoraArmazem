let vmCounter = 0;
const globalUnitPrices = {}; // Store global unit prices like Link, IPv4

// Ensure jsPDF is loaded before using it
const { jsPDF } = window.jspdf;

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

    vmContainer.appendChild(newVm);
    attachVmEventListeners(vmBlock); // Attach listeners to the new VM
    calculateTotals(); // Recalculate after adding
}

function removeVm(button) {
    const vmBlock = button.closest('.vm-block');
    if (vmBlock) {
        // Only allow removal if more than one VM exists
        if (document.querySelectorAll('#vmContainer .vm-block').length > 1) {
            vmBlock.remove();
            calculateTotals(); // Recalculate after removing
        } else {
            alert("É necessário manter pelo menos uma VM.");
        }
    }
}

// --- Calculation Logic --- 

function calculateTotals() {
    let totalVmsCost = 0;
    let totalLicencasCost = 0;
    let totalBackupCost = 0;
    let totalConectividadeCost = 0;
    let totalServicosCost = 0;
    let totalImplementacaoCost = 0;

    const vmBlocks = document.querySelectorAll('#vmContainer .vm-block');
    const isAmbienteNovo = document.getElementById('ambienteNovo').checked;
    const isClienteExistente = document.getElementById('ambienteExistente').checked;

    // 1. Calculate costs for each VM
    vmBlocks.forEach(vmBlock => {
        let vmBaseTotal = 0;
        let vmLicencaTotal = 0;
        let vmBackupTotal = 0;

        const vcpuInput = vmBlock.querySelector('.qty-vcpu');
        const memoriaInput = vmBlock.querySelector('.item.qty[data-name="Memória"]');
        const discoInput = vmBlock.querySelector('.qty-disco');
        const osSelect = vmBlock.querySelector('.osSelect');
        const veeamCheckbox = vmBlock.querySelector('.qty-veeam');

        const vcpuQty = parseInt(vcpuInput.value) || 0;
        const memoriaQty = parseInt(memoriaInput.value) || 0;
        const discoQty = parseFloat(discoInput.value) || 0;
        const isWindows = osSelect.value === 'windows';

        // --- Apply VM-specific rules before calculating item costs ---
        const vmwareQtyInput = vmBlock.querySelector('.qty-vmware');
        const windowsQtyInput = vmBlock.querySelector('.qty-windows');
        const backupAreaQtyInput = vmBlock.querySelector('.qty-backup-area');

        if (vmwareQtyInput) vmwareQtyInput.value = vcpuQty; // Rule: VMware Lic = vCPU
        if (windowsQtyInput) windowsQtyInput.value = isWindows ? vcpuQty : 0; // Rule: Win Lic = vCPU if Windows
        if (backupAreaQtyInput) backupAreaQtyInput.value = (discoQty * 1.5).toFixed(2); // Rule: Backup Area = 1.5 * Disk

        // --- Calculate individual item costs within the VM ---
        const items = vmBlock.querySelectorAll('.item, .qty-vcpu, .qty-disco, .qty-veeam, .qty-vmware, .qty-windows, .qty-backup-area');
        items.forEach(item => {
            const name = item.dataset.name;
            const priceInput = vmBlock.querySelector(`.item-price[data-name="${name}"]`);
            const totalElement = vmBlock.querySelector(`.total[data-name="${name}"]`); // May not exist for hidden fields
            let qty = 0;
            let unitPrice = 0;

            if (priceInput) {
                unitPrice = parseFloat(priceInput.value) || 0;
            }

            // Determine quantity based on item type
            if (item.classList.contains('qty-veeam')) {
                qty = item.checked ? 1 : 0;
            } else {
                qty = parseFloat(item.value) || 0;
            }

            let itemTotal = unitPrice * qty;
            let customBackupCost = 0;

            // Add custom backup costs (calculated based on Disk cost)
            if (name === 'Disco') {
                 const retencaoCheck = vmBlock.querySelector('.backup-retencao');
                 const frequenciaCheck = vmBlock.querySelector('.backup-frequencia');
                 const diskCost = itemTotal; // Base disk cost before adding custom backup
                 let customBackupMultiplier = 0;

                 if (retencaoCheck && retencaoCheck.checked) {
                     customBackupMultiplier += parseFloat(retencaoCheck.dataset.costMultiplier) || 0;
                 }
                 if (frequenciaCheck && frequenciaCheck.checked) {
                     customBackupMultiplier += parseFloat(frequenciaCheck.dataset.costMultiplier) || 0;
                 }
                 customBackupCost = diskCost * customBackupMultiplier;
                 // Don't add customBackupCost to itemTotal here, add it to vmBackupTotal later
            }

            if (totalElement) {
                totalElement.textContent = "Total: " + formatCurrency(itemTotal);
            }

            // Categorize costs for summary
            if (name === 'vCPU' || name === 'Memória' || name === 'Disco') {
                vmBaseTotal += itemTotal;
            }
            if (name === 'Licença VMware por vCPU' || name === 'Licença Windows por vCPU') {
                vmLicencaTotal += itemTotal;
            }
            if (name === 'Area de backup cloud' || name === 'Licença Veeam backup por VM') {
                vmBackupTotal += itemTotal;
            }
            // Add custom backup cost to the backup category
            vmBackupTotal += customBackupCost;

        });

        totalVmsCost += vmBaseTotal;
        totalLicencasCost += vmLicencaTotal;
        totalBackupCost += vmBackupTotal;
    });

    // 2. Calculate Global Costs (Link, IPv4, Implementação)
    const linkPrice = parseFloat(globalUnitPrices['MBps link de internet'] || 0);
    const ipv4Price = parseFloat(globalUnitPrices['Alocação de IPv4'] || 0);
    const implementacaoPriceInput = document.getElementById('custoImplementacao');
    const implementacaoPrice = parseFloat(implementacaoPriceInput.value) || 0;

    // Rule: No Link/IPv4 cost for existing clients
    // Assuming 1 unit each for Link and IPv4 for simplicity for new clients
    if (!isClienteExistente) {
        totalConectividadeCost += linkPrice * 1; 
        totalConectividadeCost += ipv4Price * 1; 
    }

    // Rule: Implementation cost only for new environments
    const implementacaoContainer = document.getElementById('custoImplementacaoContainer');
    if (isAmbienteNovo) {
        totalImplementacaoCost = implementacaoPrice;
        if (implementacaoContainer) implementacaoContainer.classList.remove('hidden');
    } else {
        if (implementacaoContainer) implementacaoContainer.classList.add('hidden');
    }

    // 3. Calculate Additional Services Costs
    document.querySelectorAll('.servico-adicional:checked').forEach(checkbox => {
        totalServicosCost += parseFloat(checkbox.value) || 0;
    });

    // 4. Update Summary Display
    document.getElementById('custoTotalVms').textContent = formatCurrency(totalVmsCost);
    document.getElementById('custoTotalLicencas').textContent = formatCurrency(totalLicencasCost);
    document.getElementById('custoTotalBackup').textContent = formatCurrency(totalBackupCost);
    document.getElementById('custoTotalConectividade').textContent = formatCurrency(totalConectividadeCost);
    document.getElementById('custoTotalServicos').textContent = formatCurrency(totalServicosCost);
    document.getElementById('custoTotalImplementacao').textContent = formatCurrency(totalImplementacaoCost);

    // 5. Calculate and Display Grand Total
    const grandTotal = totalVmsCost + totalLicencasCost + totalBackupCost + totalConectividadeCost + totalServicosCost + totalImplementacaoCost;
    document.getElementById('grandTotal').textContent = formatCurrency(grandTotal);
}

// --- Generate Content for Export --- 

function generateWhatsAppMessage() {
    let message = "Olá! Gostaria de um orçamento para a seguinte configuração de VM(s) no Armazém Cloud:\n\n";
    const ambiente = document.getElementById('ambienteNovo').checked ? 'Novo' : 'Existente';
    message += `*Ambiente:* ${ambiente}\n`;

    const vmBlocks = document.querySelectorAll('#vmContainer .vm-block');
    vmBlocks.forEach((vmBlock, index) => {
        const vmId = index + 1;
        const vcpu = vmBlock.querySelector('.qty-vcpu').value || 0;
        const memoria = vmBlock.querySelector('.item.qty[data-name="Memória"]').value || 0;
        const disco = vmBlock.querySelector('.qty-disco').value || 0;
        const os = vmBlock.querySelector('.osSelect').value;
        const veeam = vmBlock.querySelector('.qty-veeam').checked ? 'Sim' : 'Não';
        message += `\n--- VM ${vmId} ---\n`;
        message += `*SO:* ${os.charAt(0).toUpperCase() + os.slice(1)}\n`;
        message += `*vCPU:* ${vcpu}\n`;
        message += `*Memória:* ${memoria} GB\n`;
        message += `*Disco:* ${disco} GB\n`;
        message += `*Lic. Veeam:* ${veeam}\n`;
        // Add backup custom flags if needed
    });

    message += "\n--- Serviços Adicionais ---\n";
    const servicos = document.querySelectorAll('.servico-adicional:checked');
    if (servicos.length > 0) {
        servicos.forEach(s => {
            message += `- ${s.dataset.name}\n`;
        });
    } else {
        message += `Nenhum\n`;
    }

    const custoTotal = document.getElementById('grandTotal').textContent;
    message += `\n*Custo Total Mensal Estimado:* ${custoTotal}`;
    if (ambiente === 'Novo') {
        const custoImp = document.getElementById('custoTotalImplementacao').textContent;
        message += `\n*Custo Implementação:* ${custoImp}`;
    }

    return encodeURIComponent(message);
}

// Function to generate PDF using jsPDF
function generatePdfWithJsPDF() {
    const doc = new jsPDF();
    let y = 15; // Initial Y position
    const lineHeight = 7;
    const indent = 10;
    const pageHeight = doc.internal.pageSize.height;

    function checkPageBreak(lines = 1) {
        if (y + (lines * lineHeight) > pageHeight - 20) { // Check if content exceeds page height (with margin)
            doc.addPage();
            y = 15; // Reset Y for new page
        }
    }

    doc.setFontSize(18);
    doc.text("Orçamento Estimado - Armazém Cloud", doc.internal.pageSize.width / 2, y, { align: 'center' });
    y += lineHeight * 2;

    doc.setFontSize(14);
    doc.text("Configurações Gerais", indent, y);
    y += lineHeight;
    doc.setFontSize(10);
    const ambiente = document.getElementById('ambienteNovo').checked ? 'Novo' : 'Existente';
    doc.text(`- Tipo de Ambiente: ${ambiente}`, indent + 5, y);
    y += lineHeight * 2;

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
        const veeam = vmBlock.querySelector('.qty-veeam').checked ? 'Sim' : 'Não';
        const retencao = vmBlock.querySelector('.backup-retencao').checked ? 'Sim' : 'Não';
        const frequencia = vmBlock.querySelector('.backup-frequencia').checked ? 'Sim' : 'Não';

        doc.setFontSize(12);
        doc.text(`Máquina Virtual ${vmId}`, indent + 5, y);
        y += lineHeight;
        doc.setFontSize(10);
        doc.text(`- Sistema Operacional: ${os.charAt(0).toUpperCase() + os.slice(1)}`, indent + 10, y); y += lineHeight;
        doc.text(`- vCPU: ${vcpu}`, indent + 10, y); y += lineHeight;
        doc.text(`- Memória: ${memoria} GB`, indent + 10, y); y += lineHeight;
        doc.text(`- Disco: ${disco} GB`, indent + 10, y); y += lineHeight;
        doc.text(`- Licença Veeam: ${veeam}`, indent + 10, y); y += lineHeight;
        doc.text(`- Backup Custom: Retenção>15d (${retencao}), Frequência<12h (${frequencia})`, indent + 10, y); y += lineHeight * 1.5;
    });

    checkPageBreak(3 + document.querySelectorAll('.servico-adicional:checked').length);
    doc.setFontSize(14);
    doc.text("Serviços Adicionais", indent, y);
    y += lineHeight;
    doc.setFontSize(10);
    const servicos = document.querySelectorAll('.servico-adicional:checked');
    if (servicos.length > 0) {
        servicos.forEach(s => {
            checkPageBreak();
            doc.text(`- ${s.dataset.name} (${formatCurrency(s.value)})`, indent + 5, y); y += lineHeight;
        });
    } else {
        doc.text("- Nenhum serviço adicional selecionado.", indent + 5, y); y += lineHeight;
    }
    y += lineHeight;

    checkPageBreak(8); // Estimate lines for summary
    doc.setFontSize(14);
    doc.text("Resumo de Custos Mensais", indent, y);
    y += lineHeight;
    doc.setFontSize(10);
    doc.text(`- Custo Total VMs (Base): ${document.getElementById('custoTotalVms').textContent}`, indent + 5, y); y += lineHeight;
    doc.text(`- Custo Licenças (VMware/Windows): ${document.getElementById('custoTotalLicencas').textContent}`, indent + 5, y); y += lineHeight;
    doc.text(`- Custo Backup (Área + Veeam + Custom): ${document.getElementById('custoTotalBackup').textContent}`, indent + 5, y); y += lineHeight;
    doc.text(`- Custo Conectividade (Link + IP): ${document.getElementById('custoTotalConectividade').textContent}`, indent + 5, y); y += lineHeight;
    doc.text(`- Custo Serviços Adicionais: ${document.getElementById('custoTotalServicos').textContent}`, indent + 5, y); y += lineHeight;
    if (document.getElementById('ambienteNovo').checked) {
        checkPageBreak();
        doc.text(`- Custo Implementação (Pagamento Único): ${document.getElementById('custoTotalImplementacao').textContent}`, indent + 5, y); y += lineHeight;
    }
    y += lineHeight * 0.5;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Custo Total Mensal Estimado: ${document.getElementById('grandTotal').textContent}`, indent + 5, y);
    doc.setFont(undefined, 'normal');

    doc.save('orcamento-armazem-cloud.pdf');
}


// --- Event Listeners --- 

function attachVmEventListeners(vmBlock) {
    const inputsToWatch = vmBlock.querySelectorAll('.item, .qty-vcpu, .qty-disco, .osSelect, .qty-veeam, .backup-custom');
    inputsToWatch.forEach(input => {
        const eventType = (input.type === 'text' || input.type === 'number') ? 'input' : 'change';
        input.addEventListener(eventType, calculateTotals);
        if (input.type === 'number') {
            input.addEventListener('change', calculateTotals);
        }
    });
    const removeBtn = vmBlock.querySelector('.remove-vm-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => removeVm(removeBtn));
    }
}

function attachGlobalEventListeners() {
    document.querySelectorAll('input[name="ambienteTipo"], #custoImplementacao, .servico-adicional').forEach(input => {
        const eventType = (input.type === 'radio' || input.type === 'checkbox') ? 'change' : 'input';
        input.addEventListener(eventType, calculateTotals);
         if (input.type === 'number') {
            input.addEventListener('change', calculateTotals);
        }
    });

    const addVmBtn = document.getElementById('addVmBtn');
    if (addVmBtn) {
        addVmBtn.addEventListener('click', addVm);
    }

    const whatsappBtn = document.getElementById('whatsappBtn');
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', () => {
            const phoneNumber = "554774008146";
            const message = generateWhatsAppMessage(); // Updated function
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
            window.open(whatsappUrl, '_blank');
        });
    }

    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) {
        // Changed to call the jsPDF function directly
        exportPdfBtn.addEventListener('click', generatePdfWithJsPDF);
    }
}

// --- Initialization --- 

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.item-price-global').forEach(input => {
        globalUnitPrices[input.dataset.name] = input.value;
    });
    addVm();
    attachGlobalEventListeners();
});

