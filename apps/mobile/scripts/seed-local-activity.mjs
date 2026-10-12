import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const cli = resolve(root, "node_modules/supabase/dist/supabase.js");
const status = JSON.parse(execFileSync(process.execPath, [cli, "status", "--output", "json"], {
  cwd: root,
  encoding: "utf8",
}));
const api = new URL(status.API_URL);
if (!(["127.0.0.1", "localhost"].includes(api.hostname) && api.port === "54321")) {
  throw new Error("Ce jeu de données est réservé au Supabase local du projet.");
}
if (!process.env.SEED_DEMO_PASSWORD) throw new Error("Définissez SEED_DEMO_PASSWORD pour vérifier le compte membre local.");
const db = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const publicClient = createClient(status.API_URL, status.ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const rpc = async (name, args) => {
  const result = await db.rpc(name, args);
  if (result.error) throw new Error(`${name}: ${result.error.message}`);
  return result.data;
};
const get = async (query, context) => {
  const result = await query;
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data;
};

const organization = await get(db.from("organizations")
  .select("id,name,membership_fee_amount,monthly_contribution_amount,monthly_contribution_due_day,monthly_payment_max_installments,contact_phone,contact_email,address")
  .eq("name", "Association Démo GestionAss").single(), "association de démonstration");
const authUsers = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (authUsers.error) throw authUsers.error;
const adminAuth = authUsers.data.users.find((user) => user.phone?.replace(/^\+/, "") === "2250701020304");
if (!adminAuth) throw new Error("L'administrateur de démonstration doit être créé avant les données financières.");
const adminId = adminAuth.id;

if (Number(organization.membership_fee_amount) !== 1000 ||
    Number(organization.monthly_contribution_amount) !== 5000 ||
    organization.monthly_contribution_due_day !== 1 ||
    organization.monthly_payment_max_installments !== 2) {
  await rpc("update_admin_contribution_settings", {
    admin_id: adminId, membership_fee_amount: 1000,
    monthly_amount: 5000, due_day: 1, max_payments: 2,
  });
}
if (!organization.contact_phone && !organization.contact_email && !organization.address) {
  await get(db.from("organizations").update({
    address: "Abidjan, Côte d'Ivoire (démonstration)",
    contact_phone: "+2250701020304",
    contact_email: "demo@gestionass.test",
  }).eq("id", organization.id), "coordonnées de démonstration");
}

const members = await get(db.from("members")
  .select("id,member_number,phone,joining_date")
  .eq("organization_id", organization.id).order("member_number"), "membres");
const demoMembers = Array.from({ length: 10 }, (_, index) => {
  const phone = `+22507010203${String(index + 11).padStart(2, "0")}`;
  const member = members.find((candidate) => candidate.phone === phone);
  if (!member) throw new Error(`Membre de démonstration absent : ${phone}`);
  return member;
});
for (const [index, member] of demoMembers.entries()) {
  const joiningDate = `2026-01-${String(index + 1).padStart(2, "0")}`;
  if (member.joining_date !== joiningDate) {
    await get(db.from("members").update({ joining_date: joiningDate }).eq("id", member.id), "date d'adhésion");
  }
}

let generated = 0;
for (let month = 1; month <= 10; month++) {
  generated += await rpc("generate_monthly_contribution_dues", {
    admin_id: adminId,
    month_value: `2026-${String(month).padStart(2, "0")}-01`,
  });
}

const memberIds = demoMembers.map((member) => member.id);
const monthlyDues = await get(db.from("monthly_contribution_dues")
  .select("id,member_id,contribution_month,remaining_amount")
  .in("member_id", memberIds)
  .gte("contribution_month", "2026-01-01")
  .lte("contribution_month", "2026-10-01").limit(200), "échéances mensuelles");
const membershipFees = await get(db.from("membership_fees")
  .select("id,member_id,remaining_amount").in("member_id", memberIds), "adhésions");
const existingPayments = await get(db.from("contribution_payments")
  .select("payment_reference").like("payment_reference", "DEMO26-%").limit(1000), "paiements existants");
const references = new Set(existingPayments.map((payment) => payment.payment_reference));
let paymentsCreated = 0;
async function pay(kind, due, amount, date, reference, source = "manual") {
  if (references.has(reference) || Number(due.remaining_amount) === 0) return;
  if (Number(due.remaining_amount) < amount) return;
  await rpc("record_contribution_payment", {
    admin_id: adminId, due_kind: kind, due_id: due.id,
    payment_amount: amount, payment_date: date,
    payment_reference_value: reference, payment_source_value: source,
  });
  references.add(reference);
  due.remaining_amount = Number(due.remaining_amount) - amount;
  paymentsCreated++;
}

for (const [index, member] of demoMembers.entries()) {
  const fee = membershipFees.find((due) => due.member_id === member.id);
  if (!fee) throw new Error(`Adhésion absente : ${member.phone}`);
  const amount = index < 6 ? 1000 : index < 9 ? 500 : 0;
  if (amount) await pay("membership", fee, amount, "2026-01-12", `DEMO26-ADH-${member.member_number}`);
}

const mariamPlan = [
  [1250, 3750], [5000], [5000], [5000], [2500],
  [5000], [], [1250], [5000], [],
];
function monthlyPlan(index, month) {
  if (index === 0) return mariamPlan[month - 1];
  if (month <= 3) return index < 8 ? [5000] : index === 8 ? [2500] : [];
  if (month <= 6) return index < 6 ? [5000] : index < 9 ? [2500] : [];
  if (month <= 9) return index < 3 ? [5000] : index < 7 ? [1250] : [];
  return index === 1 ? [5000] : index === 2 ? [2500] : [];
}
for (const [index, member] of demoMembers.entries()) {
  for (let month = 1; month <= 10; month++) {
    const monthText = String(month).padStart(2, "0");
    const due = monthlyDues.find((row) => row.member_id === member.id && row.contribution_month === `2026-${monthText}-01`);
    if (!due) throw new Error(`Échéance absente : ${member.phone}, ${monthText}`);
    const amounts = monthlyPlan(index, month);
    for (const [partIndex, amount] of amounts.entries()) {
      const day = month === 10 ? "02" : partIndex === 0 ? "08" : "18";
      await pay("monthly", due, amount, `2026-${monthText}-${day}`,
        `DEMO26-M${monthText}-${member.member_number}-${partIndex + 1}`,
        index % 4 === 2 ? "wave" : "manual");
    }
  }
}

const exceptionalPlans = [
  { label: "Fonds de solidarité", amount: 2000, dueDate: "2026-03-15", selected: [], payment: (index) => index < 7 ? 2000 : index < 9 ? 1000 : 0 },
  { label: "Aide médicale collective", amount: 3500, dueDate: "2026-06-20", selected: demoMembers.slice(0, 6).map((member) => member.id), payment: (index) => index === 0 ? 1750 : index < 3 ? 3500 : index === 3 ? 1750 : 0 },
  { label: "Projet communautaire", amount: 1500, dueDate: "2026-09-15", selected: [], payment: (index) => index > 0 && index < 5 ? 1500 : index < 8 && index > 0 ? 750 : 0 },
];
const exceptionalContributions = [];
for (const [planIndex, plan] of exceptionalPlans.entries()) {
  let contribution = await get(db.from("exceptional_contributions")
    .select("id").eq("organization_id", organization.id).eq("label", plan.label)
    .eq("due_date", plan.dueDate).maybeSingle(), "cotisation exceptionnelle");
  if (!contribution) {
    const id = await rpc("create_exceptional_contribution", {
      admin_id: adminId, contribution_label: plan.label,
      contribution_amount: plan.amount, contribution_due_date: plan.dueDate,
      selected_member_ids: plan.selected,
    });
    contribution = { id };
  }
  exceptionalContributions.push(contribution);
  const dues = await get(db.from("exceptional_contribution_dues")
    .select("id,member_id,remaining_amount").eq("exceptional_contribution_id", contribution.id).limit(100), "échéances exceptionnelles");
  for (const [index, member] of demoMembers.entries()) {
    const due = dues.find((row) => row.member_id === member.id);
    const amount = plan.payment(index);
    if (!due || !amount) continue;
    await pay("exceptional", due, amount, plan.dueDate,
      `DEMO26-E${planIndex + 1}-${member.member_number}`);
  }
}

const expenses = [
  { label: "Location salle de réunion", amount: 12000, date: "2026-04-02", type: "general_expense", memberId: null, contributionId: null, justification: "Réunion annuelle de démonstration" },
  { label: "Aide scolaire", amount: 7500, date: "2026-07-08", type: "member_aid", memberId: demoMembers[0].id, contributionId: null, justification: "Soutien scolaire de démonstration" },
  { label: "Achat de fournitures", amount: 4500, date: "2026-09-10", type: "general_expense", memberId: null, contributionId: null, justification: "Fournitures administratives de démonstration" },
  { label: "Soutien médical collectif", amount: 10000, date: "2026-06-25", type: "exceptional_contribution_payment", memberId: null, contributionId: exceptionalContributions[1].id, justification: "Utilisation de la cotisation médicale de démonstration" },
];
let expensesCreated = 0;
for (const expense of expenses) {
  const existing = await get(db.from("disbursements").select("id")
    .eq("organization_id", organization.id).eq("label", expense.label)
    .eq("disbursed_on", expense.date).maybeSingle(), "dépense existante");
  if (existing) continue;
  await rpc("create_disbursement", {
    admin_id: adminId, disbursement_label: expense.label,
    disbursement_amount: expense.amount, disbursement_date: expense.date,
    disbursement_type_value: expense.type,
    target_member_id: expense.memberId,
    target_contribution_id: expense.contributionId,
    disbursement_justification: expense.justification,
  });
  expensesCreated++;
}

const login = await publicClient.auth.signInWithPassword({
  phone: demoMembers[0].phone, password: process.env.SEED_DEMO_PASSWORD,
});
if (login.error || !login.data.session) throw login.error ?? new Error("Connexion membre impossible.");
const memberDashboard = await get(publicClient.rpc("get_my_member_dashboard", { selected_year: 2026 }), "tableau de bord membre");
const transactions = await get(publicClient.rpc("get_my_member_transactions", { page_limit: 30, page_offset: 0 }), "transactions membre");
const adminDashboard = await rpc("get_admin_dashboard_summary", { admin_id: adminId });
if (Number(memberDashboard.monthlyRate) !== 5000 || memberDashboard.monthlyDues.length !== 10 ||
    memberDashboard.exceptionalDues.length !== 3 || transactions.total < 1 ||
    !adminDashboard.contributionChart?.some((month) => Number(month.collected) > 0)) {
  throw new Error("Les données de démonstration ne sont pas visibles sur les tableaux de bord.");
}

console.log(`Données 2026 prêtes : ${generated} échéances mensuelles ajoutées, ${paymentsCreated} paiements et ${expensesCreated} dépenses.`);
console.log("Mensualité : 5 000 F CFA de janvier à octobre ; 3 cotisations exceptionnelles.");
