function formatCurrency(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function calculateTotals() {
  const itemNames = document.querySelectorAll('.item');
  const priceInputs = document.querySelectorAll('.item-price');
  const totalElements = document.querySelectorAll('.total');
  const qtyVMwareInput = document.querySelector('.qty-vmware');
  const vcpuQtyInput = document.querySelector('.qty-vcpu');

  let grandTotal = 0;

  priceInputs.forEach(priceInput => {
    const name = priceInput.dataset.name;
    const qtyInput = document.querySelector(`.item.qty[data-name="${name}"], .item.qty-vmware[data-name="${name}"], .item.qty-vcpu[data-name="${name}"]`);
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

function updateVMwareQty() {
  const vcpuQty = parseInt(document.querySelector('.qty-vcpu').value) || 0;
  document.querySelector('.qty-vmware').value = vcpuQty;
  calculateTotals();
}

document.querySelectorAll('.item, .item-price').forEach(input => {
  input.addEventListener('input', () => {
    if (input.classList.contains('qty-vcpu')) {
      updateVMwareQty();
    } else {
      calculateTotals();
    }
  });
});
