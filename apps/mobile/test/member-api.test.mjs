import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import Module from "node:module";

const apiUrl = new URL("../src/features/members/api.ts", import.meta.url);
const apiPath = apiUrl.pathname;

function loadMemberApi(calls) {
  const source = fs.readFileSync(apiUrl, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const memberApi = new Module("gestionass-member-api-test");
  memberApi.filename = apiPath;
  memberApi.paths = Module._nodeModulePaths(process.cwd());
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "../../lib/supabase-client") {
      return {
        invokeRegistrationFunction: async (...args) => {
          calls.push(args);
          return { mocked: true };
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    memberApi._compile(compiled, apiPath);
  } finally {
    Module._load = originalLoad;
  }
  return memberApi.exports;
}

test("member business API exists outside the generic Supabase client", () => {
  assert.equal(fs.existsSync(apiUrl), true);
  const source = fs.readFileSync(apiUrl, "utf8");
  for (const name of ["AdminMember", "AdminMembersPage", "AdminMembersFilters", "AdminMemberDetail", "ContributionDue", "AdminMemberAction", "DisciplinaryCase", "DisciplinaryCaseInput"]) {
    assert.match(source, new RegExp(`(?:type|interface) ${name}\\b`));
  }
  assert.match(source, /AdminMemberAction\s*=\s*"update"\s*\|\s*"reactivate"/);
});

test("member API forwards exact list, creation, detail, and lifecycle payloads", async () => {
  const calls = [];
  const api = loadMemberApi(calls);
  const filters = { query: "awa", memberStatus: "active", paymentStatus: "all", role: "member", offset: 10, limit: 20 };
  const newMember = { firstName: "Awa", lastName: "Kone", phone: "+2250700000001", password: "Secret123!", passwordConfirmation: "Secret123!", role: "member" };
  await api.getAdminMembers(filters);
  await api.createAdminMember(newMember);
  await api.getAdminMemberDetail("member-1");
  await api.manageAdminMember({ memberId: "member-1", action: "update", firstName: "Awa", lastName: "Kone", phone: "+2250700000001" });
  await api.manageAdminMember({ memberId: "member-2", action: "reactivate" });
  assert.deepEqual(calls, [
    ["get-admin-members", { query: "awa", memberStatus: "active", paymentStatus: "all", role: "member", offset: 10, limit: 20 }],
    ["create-admin-member", newMember],
    ["get-admin-member-detail", { memberId: "member-1" }],
    ["manage-admin-member", { memberId: "member-1", action: "update", firstName: "Awa", lastName: "Kone", phone: "+2250700000001" }],
    ["manage-admin-member", { memberId: "member-2", action: "reactivate" }],
  ]);
});

test("member API sends the exact disciplinary list, opening, and decision payloads", async () => {
  const calls = [];
  const api = loadMemberApi(calls);
  const opening = {
    memberId: "member-1",
    reason: "Manquement au règlement",
    durationDays: 30,
    observations: "Note",
    evidence: "Pièce 1",
    contributionPolicy: "continue",
  };
  const decision = { caseId: "case-1", outcome: "confirmed", sanction: "suspension", observations: "Décision" };
  await api.listDisciplinaryCases("member-1");
  await api.openDisciplinaryCase(opening);
  await api.decideDisciplinaryCase(decision);
  assert.deepEqual(calls, [
    ["manage-member-disciplinary-case", { action: "list", memberId: "member-1" }],
    ["manage-member-disciplinary-case", { action: "open", ...opening }],
    ["manage-member-disciplinary-case", { action: "decide", ...decision }],
  ]);
});
