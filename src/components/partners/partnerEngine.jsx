import { db } from '@/api/db';

/**
 * Count active AutoOrder (recompra) clients for a contact,
 * only counting Premier Kits products.
 */
function countAutoOrderClients(contactId, allSales, allProducts) {
  return allSales.filter(s => {
    if (s.contact_id !== contactId) return false;
    if (s.status !== 'active') return false;
    if (s.sale_type !== 'recompra') return false;
    const product = allProducts.find(p => p.id === s.product_id);
    return product?.category === 'Premier Kits';
  }).length;
}

/**
 * Recalculates Fast Start progress for ALL partners.
 * Call after any sale or partner change.
 */
export async function recalculateAllPartners(allSales, allPartners, allProducts) {
  const todayStr = new Date().toISOString().split('T')[0];

  for (const partner of allPartners) {
    const myClientCount = countAutoOrderClients(partner.contact_id, allSales, allProducts);

    // Step 1: Q-Team
    const qteam_completed = myClientCount >= 4;

    // Step 2: FS Level 1 — need 2 OTHER active partners
    const otherActivePartners = allPartners.filter(p =>
      p.id !== partner.id && p.fast_start_status !== 'vencido'
    );
    const fs_level1_completed = otherActivePartners.length >= 2;

    // fase_actual
    const fase_actual = (qteam_completed && fs_level1_completed) ? 2 : 1;

    // Step 3: FS Level 2 — only if fase 2; each of 2 partners needs 4+ clients
    let fs_level2_completed = false;
    if (fase_actual === 2) {
      const top2 = otherActivePartners.slice(0, 2);
      fs_level2_completed = top2.length >= 2 &&
        top2.every(p => countAutoOrderClients(p.contact_id, allSales, allProducts) >= 4);
    }

    // Step 4: X-Team
    const xteam_completed = myClientCount >= 10;

    // Status
    let fast_start_status;
    if (qteam_completed && fs_level1_completed && fs_level2_completed && xteam_completed) {
      fast_start_status = 'completado';
    } else if (partner.fast_start_deadline < todayStr) {
      fast_start_status = 'vencido';
    } else {
      fast_start_status = 'activo';
    }

    // Only update changed fields
    const updates = {};
    if (partner.qteam_completed !== qteam_completed) updates.qteam_completed = qteam_completed;
    if (partner.fs_level1_completed !== fs_level1_completed) updates.fs_level1_completed = fs_level1_completed;
    if (partner.fs_level2_completed !== fs_level2_completed) updates.fs_level2_completed = fs_level2_completed;
    if (partner.xteam_completed !== xteam_completed) updates.xteam_completed = xteam_completed;
    if (partner.fase_actual !== fase_actual) updates.fase_actual = fase_actual;
    if (partner.fast_start_status !== fast_start_status) updates.fast_start_status = fast_start_status;

    if (Object.keys(updates).length > 0) {
      await db.Partner.update(partner.id, updates);
    }
  }
}