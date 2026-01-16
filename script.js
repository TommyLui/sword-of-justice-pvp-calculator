document.getElementById('calculate-btn').addEventListener('click', function() {
    // Get attacking items' attack values
    const atk1Attack = parseInt(document.getElementById('atk1-attack').value) || 0;
    const atk2Attack = parseInt(document.getElementById('atk2-attack').value) || 0;
    const totalAttack = atk1Attack + atk2Attack;

    // Get defending items' defense values
    const def1Defense = parseInt(document.getElementById('def1-defense').value) || 0;
    const def2Defense = parseInt(document.getElementById('def2-defense').value) || 0;
    const totalDefense = def1Defense + def2Defense;

    // Calculate damage
    const damage = Math.max(0, totalAttack - totalDefense);

    // Update results
    document.getElementById('total-attack').textContent = totalAttack;
    document.getElementById('total-defense').textContent = totalDefense;
    document.getElementById('damage').textContent = damage;
});