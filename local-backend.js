"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // src/browser/crypto-shim.js
  var require_crypto_shim = __commonJS({
    "src/browser/crypto-shim.js"(exports, module) {
      "use strict";
      var hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      function randomBytes(n) {
        const bytes = new Uint8Array(n);
        globalThis.crypto.getRandomValues(bytes);
        bytes.toString = (enc) => enc === "hex" ? hex(bytes) : String.fromCharCode(...bytes);
        return bytes;
      }
      var K = new Uint32Array([
        1116352408,
        1899447441,
        3049323471,
        3921009573,
        961987163,
        1508970993,
        2453635748,
        2870763221,
        3624381080,
        310598401,
        607225278,
        1426881987,
        1925078388,
        2162078206,
        2614888103,
        3248222580,
        3835390401,
        4022224774,
        264347078,
        604807628,
        770255983,
        1249150122,
        1555081692,
        1996064986,
        2554220882,
        2821834349,
        2952996808,
        3210313671,
        3336571891,
        3584528711,
        113926993,
        338241895,
        666307205,
        773529912,
        1294757372,
        1396182291,
        1695183700,
        1986661051,
        2177026350,
        2456956037,
        2730485921,
        2820302411,
        3259730800,
        3345764771,
        3516065817,
        3600352804,
        4094571909,
        275423344,
        430227734,
        506948616,
        659060556,
        883997877,
        958139571,
        1322822218,
        1537002063,
        1747873779,
        1955562222,
        2024104815,
        2227730452,
        2361852424,
        2428436474,
        2756734187,
        3204031479,
        3329325298
      ]);
      function sha256(msg) {
        const data = new TextEncoder().encode(msg);
        const len = data.length;
        const padded = new Uint8Array(len + 9 + 63 >> 6 << 6);
        padded.set(data);
        padded[len] = 128;
        const view = new DataView(padded.buffer);
        view.setUint32(padded.length - 4, len * 8);
        view.setUint32(padded.length - 8, Math.floor(len * 8 / 2 ** 32));
        const h = new Uint32Array([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]);
        const w = new Uint32Array(64);
        const rotr = (x, n) => x >>> n | x << 32 - n;
        for (let off = 0; off < padded.length; off += 64) {
          for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
          for (let i = 16; i < 64; i++) {
            const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ w[i - 15] >>> 3;
            const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ w[i - 2] >>> 10;
            w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
          }
          let [a, b, c, d, e, f, g, hh] = h;
          for (let i = 0; i < 64; i++) {
            const t1 = hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + (e & f ^ ~e & g) + K[i] + w[i] >>> 0;
            const t2 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + (a & b ^ a & c ^ b & c) >>> 0;
            hh = g;
            g = f;
            f = e;
            e = d + t1 >>> 0;
            d = c;
            c = b;
            b = a;
            a = t1 + t2 >>> 0;
          }
          h[0] += a;
          h[1] += b;
          h[2] += c;
          h[3] += d;
          h[4] += e;
          h[5] += f;
          h[6] += g;
          h[7] += hh;
        }
        return Array.from(h, (x) => x.toString(16).padStart(8, "0")).join("");
      }
      function createHash() {
        let data = "";
        return {
          update(s) {
            data += s;
            return this;
          },
          digest() {
            return sha256(data);
          }
        };
      }
      function pbkdf2Sync() {
        throw new Error("Passwords are not used in the on-device version.");
      }
      function timingSafeEqual(a, b) {
        if (a.length !== b.length) return false;
        let diff = 0;
        for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
        return diff === 0;
      }
      module.exports = { randomBytes, createHash, pbkdf2Sync, timingSafeEqual, _sha256: sha256 };
    }
  });

  // src/browser/buffer-shim.js
  var require_buffer_shim = __commonJS({
    "src/browser/buffer-shim.js"(exports, module) {
      "use strict";
      function from(value, encoding) {
        if (encoding === "base64") {
          const bin = atob(String(value));
          const out = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
          return out;
        }
        if (encoding === "hex") {
          const s = String(value);
          const out = new Uint8Array(s.length >> 1);
          for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
          return out;
        }
        return new TextEncoder().encode(String(value));
      }
      module.exports = { Buffer: { from } };
    }
  });

  // src/accounting.js
  var require_accounting = __commonJS({
    "src/accounting.js"(exports, module) {
      "use strict";
      var DEFAULT_ACCOUNTS = [
        ["1010", "Cash on Hand", "asset", { cash: 1 }],
        ["1020", "Bank Account", "asset", { cash: 1 }],
        ["1100", "Receivables from Unit Buyers", "asset", { partner: 1 }],
        ["1200", "Advances to Contractors", "asset", { partner: 1 }],
        ["1300", "Land", "asset", { cost: 1 }],
        ["1310", "Land Registration & Transfer Fees", "asset", { cost: 1 }],
        ["1400", "Design & Engineering", "asset", { cost: 1 }],
        ["1410", "Permits & Licenses", "asset", { cost: 1 }],
        ["1420", "Site Preparation & Excavation", "asset", { cost: 1 }],
        ["1430", "Construction Materials", "asset", { cost: 1 }],
        ["1440", "Labor & Subcontractors", "asset", { cost: 1 }],
        ["1450", "Infrastructure - Roads & Paving", "asset", { cost: 1 }],
        ["1451", "Infrastructure - Water & Sewage", "asset", { cost: 1 }],
        ["1452", "Infrastructure - Electricity", "asset", { cost: 1 }],
        ["1453", "Infrastructure - Telecom & Internet", "asset", { cost: 1 }],
        ["1460", "Finishing Works", "asset", { cost: 1 }],
        ["1470", "Landscaping & Common Areas", "asset", { cost: 1 }],
        ["1480", "Fences, Gates & Security", "asset", { cost: 1 }],
        ["1490", "Site Supervision & Project Management", "asset", { cost: 1 }],
        ["1500", "Equipment & Vehicles", "asset", { cost: 1 }],
        ["2000", "Accounts Payable (Suppliers)", "liability", { partner: 1 }],
        ["2100", "Retention Payable (Contractors)", "liability", { partner: 1 }],
        ["2200", "Buyer Deposits & Advances", "liability", { partner: 1 }],
        ["2300", "Loans Payable", "liability", { partner: 1 }],
        ["2400", "Accrued Expenses", "liability"],
        ["2500", "Taxes Payable", "liability"],
        ["3900", "Retained Earnings", "equity"],
        ["4000", "Unit Sales Revenue", "revenue"],
        ["4100", "Rental Income", "revenue"],
        ["4900", "Other Income", "revenue"],
        ["5000", "Cost of Units Sold", "expense"],
        ["6000", "Office & Administration", "expense", { cost: 1 }],
        ["6100", "Legal & Professional Fees", "expense", { cost: 1 }],
        ["6200", "Insurance", "expense", { cost: 1 }],
        ["6300", "Bank Charges", "expense", { cost: 1 }],
        ["6400", "Marketing & Sales", "expense", { cost: 1 }],
        ["6500", "Utilities", "expense", { cost: 1 }],
        ["6600", "Government Fees & Taxes", "expense", { cost: 1 }],
        ["6700", "Interest Expense", "expense", { cost: 1 }],
        ["6900", "Miscellaneous Expenses", "expense", { cost: 1 }]
      ];
      var VOUCHER_TYPES = {
        JV: "Journal Voucher",
        PV: "Payment Voucher",
        RV: "Receipt Voucher",
        CC: "Capital Contribution"
      };
      var DEBIT_NATURE = /* @__PURE__ */ new Set(["asset", "expense"]);
      function seedAccounts(db, projectId) {
        const ins = db.prepare(
          "INSERT INTO accounts (project_id, code, name, type, is_cash, is_cost, is_partner) VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        for (const [code, name, type, flags = {}] of DEFAULT_ACCOUNTS) {
          ins.run(projectId, code, name, type, flags.cash || 0, flags.cost || 0, flags.partner || 0);
        }
      }
      function nextCapitalCode(db, projectId) {
        const row = db.prepare(
          "SELECT MAX(CAST(code AS INTEGER)) AS m FROM accounts WHERE project_id = ? AND type = 'equity' AND CAST(code AS INTEGER) BETWEEN 3000 AND 3899"
        ).get(projectId);
        return String(row.m ? row.m + 10 : 3010);
      }
      function validateLines(db, projectId, lines) {
        if (!Array.isArray(lines) || lines.length < 2) throw new Error("A voucher needs at least two lines.");
        const accountOk = db.prepare("SELECT id, active FROM accounts WHERE id = ? AND project_id = ?");
        const ownerOk = db.prepare("SELECT id FROM owners WHERE id = ? AND project_id = ?");
        const buildingOk = db.prepare("SELECT id FROM buildings WHERE id = ? AND project_id = ?");
        let debit = 0;
        let credit = 0;
        const out = lines.map((l, i) => {
          const n = i + 1;
          const accountId = Number(l.account_id);
          const acc = accountId && accountOk.get(accountId, projectId);
          if (!acc) throw new Error(`Line ${n}: choose an account.`);
          if (!acc.active) throw new Error(`Line ${n}: account is inactive.`);
          const d = Math.round(Number(l.debit) || 0);
          const c = Math.round(Number(l.credit) || 0);
          if (d < 0 || c < 0) throw new Error(`Line ${n}: amounts cannot be negative.`);
          if (d > 0 === c > 0) throw new Error(`Line ${n}: enter either a debit or a credit (not both, not neither).`);
          const ownerId = l.owner_id ? Number(l.owner_id) : null;
          if (ownerId && !ownerOk.get(ownerId, projectId)) throw new Error(`Line ${n}: unknown owner.`);
          const buildingId = l.building_id ? Number(l.building_id) : null;
          if (buildingId && !buildingOk.get(buildingId, projectId)) throw new Error(`Line ${n}: unknown building.`);
          debit += d;
          credit += c;
          return {
            account_id: accountId,
            debit: d,
            credit: c,
            memo: l.memo ? String(l.memo).trim().slice(0, 500) : null,
            owner_id: ownerId,
            building_id: buildingId
          };
        });
        if (debit !== credit) {
          throw new Error(`Debits (${(debit / 100).toFixed(2)}) must equal credits (${(credit / 100).toFixed(2)}).`);
        }
        if (debit === 0) throw new Error("Voucher total cannot be zero.");
        return { lines: out, total: debit };
      }
      function checkLock(db, projectId, date) {
        const p = db.prepare("SELECT lock_date FROM projects WHERE id = ?").get(projectId);
        if (p && p.lock_date && date <= p.lock_date) {
          throw new Error(`The books are locked up to ${p.lock_date}. Choose a later date or ask an admin to change the lock date.`);
        }
      }
      var POSTED = "v.status IN ('posted','reversed')";
      function accountBalances(db, projectId, { from, to, buildingId } = {}) {
        const cond = [POSTED];
        const params = [];
        if (from) {
          cond.push("v.date >= ?");
          params.push(from);
        }
        if (to) {
          cond.push("v.date <= ?");
          params.push(to);
        }
        if (buildingId) {
          cond.push("l.building_id = ?");
          params.push(buildingId);
        }
        const rows = db.prepare(
          `SELECT a.id, a.code, a.name, a.type, a.is_cash, a.is_cost, a.active,
              COALESCE(t.debit, 0) AS debit, COALESCE(t.credit, 0) AS credit
       FROM accounts a
       LEFT JOIN (
         SELECT l.account_id, SUM(l.debit) AS debit, SUM(l.credit) AS credit
         FROM voucher_lines l JOIN vouchers v ON v.id = l.voucher_id
         WHERE v.project_id = ? AND ${cond.join(" AND ")}
         GROUP BY l.account_id
       ) t ON t.account_id = a.id
       WHERE a.project_id = ?
       ORDER BY a.code`
        ).all(projectId, ...params, projectId);
        for (const r of rows) {
          r.balance = DEBIT_NATURE.has(r.type) ? r.debit - r.credit : r.credit - r.debit;
        }
        return rows;
      }
      function trialBalance(db, projectId, opts) {
        const rows = accountBalances(db, projectId, opts).filter((r) => r.debit || r.credit);
        let debit = 0;
        let credit = 0;
        for (const r of rows) {
          const net = r.debit - r.credit;
          r.tb_debit = net > 0 ? net : 0;
          r.tb_credit = net < 0 ? -net : 0;
          debit += r.tb_debit;
          credit += r.tb_credit;
        }
        return { rows, debit, credit, balanced: debit === credit };
      }
      function sumBy(rows, type) {
        return rows.filter((r) => r.type === type).reduce((s, r) => s + r.balance, 0);
      }
      function balanceSheet(db, projectId, { to } = {}) {
        const rows = accountBalances(db, projectId, { to }).filter((r) => r.debit || r.credit);
        const earnings = sumBy(rows, "revenue") - sumBy(rows, "expense");
        const assets = rows.filter((r) => r.type === "asset");
        const liabilities = rows.filter((r) => r.type === "liability");
        const equity = rows.filter((r) => r.type === "equity");
        const totalAssets = sumBy(rows, "asset");
        const totalLiabilities = sumBy(rows, "liability");
        const totalEquity = sumBy(rows, "equity") + earnings;
        return {
          assets,
          liabilities,
          equity,
          earnings,
          totalAssets,
          totalLiabilities,
          totalEquity,
          balanced: totalAssets === totalLiabilities + totalEquity
        };
      }
      function incomeStatement(db, projectId, opts) {
        const rows = accountBalances(db, projectId, opts).filter((r) => r.debit || r.credit);
        const revenue = rows.filter((r) => r.type === "revenue");
        const expenses = rows.filter((r) => r.type === "expense");
        const totalRevenue = sumBy(rows, "revenue");
        const totalExpenses = sumBy(rows, "expense");
        return { revenue, expenses, totalRevenue, totalExpenses, net: totalRevenue - totalExpenses };
      }
      function ledger(db, projectId, accountId, { from, to } = {}) {
        const account = db.prepare("SELECT * FROM accounts WHERE id = ? AND project_id = ?").get(accountId, projectId);
        if (!account) return null;
        const sign = DEBIT_NATURE.has(account.type) ? 1 : -1;
        let opening = 0;
        if (from) {
          const o = db.prepare(
            `SELECT COALESCE(SUM(l.debit - l.credit), 0) AS net FROM voucher_lines l JOIN vouchers v ON v.id = l.voucher_id
         WHERE l.account_id = ? AND ${POSTED} AND v.date < ?`
          ).get(accountId, from);
          opening = o.net * sign;
        }
        const cond = ["l.account_id = ?", POSTED];
        const params = [accountId];
        if (from) {
          cond.push("v.date >= ?");
          params.push(from);
        }
        if (to) {
          cond.push("v.date <= ?");
          params.push(to);
        }
        const rows = db.prepare(
          `SELECT l.id, l.debit, l.credit, l.memo, v.id AS voucher_id, v.type, v.number, v.date, v.description, v.reference,
              o.name AS owner_name, b.name AS building_name, c.name AS contact_name
       FROM voucher_lines l JOIN vouchers v ON v.id = l.voucher_id
       LEFT JOIN owners o ON o.id = l.owner_id
       LEFT JOIN buildings b ON b.id = l.building_id
       LEFT JOIN contacts c ON c.id = v.contact_id
       WHERE ${cond.join(" AND ")}
       ORDER BY v.date, v.id, l.line_no`
        ).all(...params);
        let running = opening;
        for (const r of rows) {
          running += (r.debit - r.credit) * sign;
          r.running = running;
        }
        return { account, opening, closing: running, rows };
      }
      function ownerStatement(db, projectId, { to } = {}) {
        const owners = db.prepare("SELECT * FROM owners WHERE project_id = ? ORDER BY id").all(projectId);
        const balances = accountBalances(db, projectId, { to });
        const byId = new Map(balances.map((b) => [b.id, b]));
        const totalCost = balances.filter((b) => b.is_cost).reduce((s, b) => s + b.balance, 0);
        const capitalPerAccount = db.prepare(
          `SELECT v.date, v.type, v.number, v.id AS voucher_id, v.description, l.debit, l.credit
     FROM voucher_lines l JOIN vouchers v ON v.id = l.voucher_id
     WHERE l.account_id = ? AND ${POSTED} ${to ? "AND v.date <= ?" : ""}
     ORDER BY v.date, v.id`
        );
        const totalShare = owners.filter((o) => o.active).reduce((s, o) => s + o.share_pct, 0);
        let totalContributed = 0;
        const rows = owners.map((o) => {
          const acc = o.capital_account_id ? byId.get(o.capital_account_id) : null;
          const contributed = acc ? acc.balance : 0;
          const shareOfCost = o.active && totalShare ? Math.round(totalCost * o.share_pct / totalShare) : 0;
          totalContributed += contributed;
          const history = o.capital_account_id ? capitalPerAccount.all(...[o.capital_account_id, ...to ? [to] : []]) : [];
          return {
            ...o,
            contributed,
            share_of_cost: shareOfCost,
            difference: contributed - shareOfCost,
            remaining_commitment: o.committed_capital - contributed,
            history
          };
        });
        return { owners: rows, totalCost, totalContributed, totalShare };
      }
      function budgetVsActual(db, projectId) {
        const budgets = db.prepare(
          `SELECT bu.*, a.code, a.name AS account_name, a.type, b.name AS building_name
       FROM budgets bu JOIN accounts a ON a.id = bu.account_id
       LEFT JOIN buildings b ON b.id = bu.building_id
       WHERE bu.project_id = ? ORDER BY a.code`
        ).all(projectId);
        const actualQ = db.prepare(
          `SELECT COALESCE(SUM(l.debit - l.credit), 0) AS net FROM voucher_lines l JOIN vouchers v ON v.id = l.voucher_id
     WHERE l.account_id = ? AND ${POSTED}`
        );
        const actualBuildingQ = db.prepare(
          `SELECT COALESCE(SUM(l.debit - l.credit), 0) AS net FROM voucher_lines l JOIN vouchers v ON v.id = l.voucher_id
     WHERE l.account_id = ? AND l.building_id = ? AND ${POSTED}`
        );
        let totalBudget = 0;
        let totalActual = 0;
        for (const b of budgets) {
          const net = b.building_id ? actualBuildingQ.get(b.account_id, b.building_id).net : actualQ.get(b.account_id).net;
          b.actual = DEBIT_NATURE.has(b.type) ? net : -net;
          b.variance = b.amount - b.actual;
          b.used_pct = b.amount ? Math.round(b.actual / b.amount * 1e3) / 10 : null;
          totalBudget += b.amount;
          totalActual += b.actual;
        }
        return { rows: budgets, totalBudget, totalActual, variance: totalBudget - totalActual };
      }
      function dashboard(db, projectId) {
        const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
        const balances = accountBalances(db, projectId);
        const cash = balances.filter((b) => b.is_cash).reduce((s, b) => s + b.balance, 0);
        const totalCost = balances.filter((b) => b.is_cost).reduce((s, b) => s + b.balance, 0);
        const payables = balances.filter((b) => b.type === "liability").reduce((s, b) => s + b.balance, 0);
        const revenue = balances.filter((b) => b.type === "revenue").reduce((s, b) => s + b.balance, 0);
        const owners = ownerStatement(db, projectId);
        const costByCategory = balances.filter((b) => b.is_cost && b.balance).map((b) => ({ code: b.code, name: b.name, amount: b.balance })).sort((a, b) => b.amount - a.amount);
        const costByBuilding = db.prepare(
          `SELECT b.id, b.name, b.budget, b.progress_pct, b.status,
              COALESCE((SELECT SUM(l.debit - l.credit) FROM voucher_lines l
                        JOIN vouchers v ON v.id = l.voucher_id
                        JOIN accounts a ON a.id = l.account_id
                        WHERE l.building_id = b.id AND a.is_cost = 1 AND ${POSTED}), 0) AS spent
       FROM buildings b WHERE b.project_id = ? ORDER BY b.id`
        ).all(projectId);
        const monthly = db.prepare(
          `SELECT substr(v.date, 1, 7) AS month, SUM(l.debit - l.credit) AS amount
       FROM voucher_lines l JOIN vouchers v ON v.id = l.voucher_id JOIN accounts a ON a.id = l.account_id
       WHERE v.project_id = ? AND a.is_cost = 1 AND ${POSTED} AND v.date >= date('now', '-11 months', 'start of month')
       GROUP BY month ORDER BY month`
        ).all(projectId);
        const units = db.prepare("SELECT status, COUNT(*) AS n, SUM(list_price) AS list_total, SUM(sale_price) AS sale_total FROM units WHERE project_id = ? GROUP BY status").all(projectId);
        const drafts = db.prepare("SELECT COUNT(*) AS n FROM vouchers WHERE project_id = ? AND status = 'draft'").get(projectId).n;
        const recent = db.prepare(
          `SELECT v.id, v.type, v.number, v.date, v.description, v.status,
              (SELECT SUM(debit) FROM voucher_lines WHERE voucher_id = v.id) AS total
       FROM vouchers v WHERE v.project_id = ? ORDER BY v.id DESC LIMIT 8`
        ).all(projectId);
        const upcoming = db.prepare(
          `SELECT m.*, b.name AS building_name FROM milestones m LEFT JOIN buildings b ON b.id = m.building_id
       WHERE m.project_id = ? AND m.status != 'done' ORDER BY m.due_date IS NULL, m.due_date LIMIT 6`
        ).all(projectId);
        return {
          project,
          cash,
          totalCost,
          payables,
          revenue,
          budget: project.total_budget,
          owners: owners.owners.map(({ history, ...o }) => o),
          totalContributed: owners.totalContributed,
          costByCategory,
          costByBuilding,
          monthly,
          units,
          drafts,
          recent,
          upcoming
        };
      }
      function statementOfAccount(db, projectId, { contactId, ownerId, from, to } = {}) {
        let party;
        let rows = [];
        if (ownerId) {
          party = db.prepare("SELECT * FROM owners WHERE id = ? AND project_id = ?").get(ownerId, projectId);
          if (!party) return null;
          party = { kind: "owner", name: party.name, phone: party.phone, email: party.email, account_id: party.capital_account_id };
          rows = db.prepare(
            `SELECT v.id AS voucher_id, v.type, v.number, v.date, v.description, v.reference, a.name AS account, l.debit, l.credit, l.memo
       FROM voucher_lines l JOIN vouchers v ON v.id = l.voucher_id JOIN accounts a ON a.id = l.account_id
       WHERE l.account_id = ? AND ${POSTED} ORDER BY v.date, v.id, l.line_no`
          ).all(party.account_id);
        } else {
          const c = db.prepare("SELECT * FROM contacts WHERE id = ? AND project_id = ?").get(contactId, projectId);
          if (!c) return null;
          party = { kind: "contact", name: c.name, type: c.kind, phone: c.phone, email: c.email, tax_id: c.tax_id, address: c.address };
          const vouchers = db.prepare(`SELECT * FROM vouchers v WHERE v.contact_id = ? AND ${POSTED} ORDER BY v.date, v.id`).all(c.id);
          const linesQ = db.prepare(
            `SELECT l.*, a.name AS account, a.is_cash, a.is_partner FROM voucher_lines l
       JOIN accounts a ON a.id = l.account_id WHERE l.voucher_id = ? ORDER BY l.line_no`
          );
          for (const v of vouchers) {
            const lines = linesQ.all(v.id);
            const base = { voucher_id: v.id, type: v.type, number: v.number, date: v.date, description: v.description, reference: v.reference };
            const partner = lines.filter((l) => l.is_partner);
            if (partner.length) {
              for (const l of partner) rows.push({ ...base, account: l.account, memo: l.memo, debit: l.debit, credit: l.credit });
              continue;
            }
            const paid = lines.filter((l) => l.is_cash).reduce((t, l) => t + l.credit - l.debit, 0);
            if (paid > 0) {
              rows.push({ ...base, account: "Invoice / purchase", debit: 0, credit: paid });
              rows.push({ ...base, account: "Paid to them", debit: paid, credit: 0 });
            } else if (paid < 0) {
              rows.push({ ...base, account: "Sale / charge", debit: -paid, credit: 0 });
              rows.push({ ...base, account: "Received from them", debit: 0, credit: -paid });
            }
          }
        }
        let opening = 0;
        if (from) {
          for (const r of rows.filter((x) => x.date < from)) opening += r.debit - r.credit;
          rows = rows.filter((x) => x.date >= from);
        }
        if (to) rows = rows.filter((x) => x.date <= to);
        let balance = opening;
        let debit = 0;
        let credit = 0;
        for (const r of rows) {
          balance += r.debit - r.credit;
          r.balance = balance;
          debit += r.debit;
          credit += r.credit;
        }
        return { party, opening, rows, debit, credit, closing: balance };
      }
      module.exports = {
        VOUCHER_TYPES,
        seedAccounts,
        nextCapitalCode,
        validateLines,
        checkLock,
        accountBalances,
        trialBalance,
        balanceSheet,
        incomeStatement,
        ledger,
        ownerStatement,
        budgetVsActual,
        dashboard,
        statementOfAccount
      };
    }
  });

  // src/demo.js
  var require_demo = __commonJS({
    "src/demo.js"(exports, module) {
      "use strict";
      var acc = require_accounting();
      function seedDemo(db, userId2) {
        const day = (monthsAgo, d = 10) => {
          const t = /* @__PURE__ */ new Date();
          t.setUTCDate(1);
          t.setUTCMonth(t.getUTCMonth() - monthsAgo);
          t.setUTCDate(d);
          return t.toISOString().slice(0, 10);
        };
        const insert = (table, data) => {
          const keys = Object.keys(data);
          return db.prepare(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`).run(...keys.map((k) => data[k])).lastInsertRowid;
        };
        const $ = (n) => Math.round(n * 100);
        return db.transaction(() => {
          const pid = insert("projects", {
            name: "Demo Compound (sample)",
            code: "DEMO",
            location: "Sample location",
            currency: "USD",
            status: "construction",
            total_budget: $(25e5),
            start_date: day(10, 1),
            target_completion: day(-14, 1),
            land_area_sqm: 12e3,
            is_demo: 1,
            description: "Example project with sample data. Feel free to try anything here."
          });
          acc.seedAccounts(db, pid);
          const A = Object.fromEntries(
            db.prepare("SELECT id, code FROM accounts WHERE project_id = ?").all(pid).map((a) => [a.code, a.id])
          );
          const owners = ["Owner One", "Owner Two", "Owner Three"].map((name) => {
            const capital = insert("accounts", {
              project_id: pid,
              code: acc.nextCapitalCode(db, pid),
              name: `Owner Capital - ${name}`,
              type: "equity"
            });
            const id = insert("owners", {
              project_id: pid,
              name,
              share_pct: 33.3333,
              committed_capital: $(8e5),
              capital_account_id: capital
            });
            return { id, capital, name };
          });
          const bA = insert("buildings", { project_id: pid, name: "Building A", kind: "residential", floors: 6, area_sqm: 3200, status: "structure", progress_pct: 45, budget: $(9e5), start_date: day(7, 1) });
          const bB = insert("buildings", { project_id: pid, name: "Building B", kind: "residential", floors: 6, area_sqm: 3200, status: "excavation", progress_pct: 10, budget: $(9e5), start_date: day(3, 1) });
          const infra = insert("buildings", { project_id: pid, name: "Roads & utilities", kind: "infrastructure", status: "structure", progress_pct: 30, budget: $(25e4) });
          const supplier = insert("contacts", { project_id: pid, name: "Sample Steel Co.", kind: "supplier", phone: "+000 000 000" });
          const contractor = insert("contacts", { project_id: pid, name: "Sample Builders Ltd.", kind: "contractor" });
          const buyer = insert("contacts", { project_id: pid, name: "Sample Buyer", kind: "buyer" });
          const nums = {};
          const voucher = (type, date, description, lines, contact = null) => {
            nums[type] = (nums[type] || 0) + 1;
            const vid = insert("vouchers", {
              project_id: pid,
              type,
              number: nums[type],
              date,
              description,
              contact_id: contact,
              status: "posted",
              created_by: userId2,
              posted_by: userId2,
              posted_at: (/* @__PURE__ */ new Date()).toISOString()
            });
            lines.forEach(
              ([account, debit, credit, extra = {}], i) => insert("voucher_lines", {
                voucher_id: vid,
                line_no: i + 1,
                account_id: account,
                debit: $(debit),
                credit: $(credit),
                owner_id: extra.owner || null,
                building_id: extra.building || null
              })
            );
          };
          owners.forEach((o, i) => voucher("CC", day(10, 5), `Capital contribution - ${o.name}`, [[A["1020"], 4e5, 0], [o.capital, 0, 4e5, { owner: o.id }]]));
          voucher("PV", day(10, 12), "Purchase of the land", [[A["1300"], 6e5, 0], [A["1020"], 0, 6e5]]);
          voucher("PV", day(9, 3), "Land registration fees", [[A["1310"], 18e3, 0], [A["1020"], 0, 18e3]]);
          voucher("PV", day(8, 15), "Architectural & structural design", [[A["1400"], 45e3, 0], [A["1020"], 0, 45e3]]);
          voucher("PV", day(7, 20), "Building permits", [[A["1410"], 22e3, 0], [A["1020"], 0, 22e3]]);
          voucher("PV", day(6, 8), "Excavation Building A", [[A["1420"], 38e3, 0, { building: bA }], [A["1020"], 0, 38e3]], contractor);
          voucher("PV", day(5, 14), "Steel rebar - Building A", [[A["1430"], 52e3, 0, { building: bA }], [A["1020"], 0, 52e3]], supplier);
          voucher("PV", day(4, 2), "Concrete works - Building A (paid by Owner Two)", [[A["1440"], 3e4, 0, { building: bA }], [owners[1].capital, 0, 3e4, { owner: owners[1].id }]], contractor);
          owners.forEach((o) => voucher("CC", day(3, 5), `Capital contribution - ${o.name}`, [[A["1020"], 15e4, 0], [o.capital, 0, 15e4, { owner: o.id }]]));
          voucher("PV", day(3, 18), "Main road paving", [[A["1450"], 41e3, 0, { building: infra }], [A["1020"], 0, 41e3]], contractor);
          voucher("JV", day(2, 25), "Labor invoice - Building A (unpaid)", [[A["1440"], 27500, 0, { building: bA }], [A["2000"], 0, 27500]], contractor);
          voucher("PV", day(2, 10), "Excavation Building B", [[A["1420"], 36e3, 0, { building: bB }], [A["1020"], 0, 36e3]], contractor);
          voucher("RV", day(1, 7), "Down payment - Apartment A-301", [[A["1020"], 25e3, 0], [A["2200"], 0, 25e3]], buyer);
          voucher("PV", day(0, 2), "Water & sewage network", [[A["1451"], 24e3, 0, { building: infra }], [A["1020"], 0, 24e3]], contractor);
          for (const [no, floor, status, price] of [["A-101", "1", "sold", 21e4], ["A-201", "2", "available", 215e3], ["A-301", "3", "reserved", 22e4], ["A-401", "4", "available", 225e3]]) {
            insert("units", {
              project_id: pid,
              building_id: bA,
              unit_no: no,
              kind: "apartment",
              floor,
              area_sqm: 140,
              bedrooms: 3,
              list_price: $(price),
              status,
              sale_price: status === "sold" ? $(price - 5e3) : 0,
              buyer_contact_id: status === "available" ? null : buyer
            });
          }
          insert("milestones", { project_id: pid, building_id: bA, title: "Roof slab poured", status: "in_progress", due_date: day(-1, 15) });
          insert("milestones", { project_id: pid, building_id: bB, title: "Foundation complete", status: "pending", due_date: day(-2, 1) });
          insert("milestones", { project_id: pid, title: "Building permit approved", status: "done", due_date: day(7, 15), done_date: day(7, 20) });
          for (const [code, amount] of [["1300", 6e5], ["1430", 4e5], ["1440", 45e4], ["1450", 12e4]]) {
            insert("budgets", { project_id: pid, account_id: A[code], amount: $(amount) });
          }
          return pid;
        });
      }
      module.exports = { seedDemo };
    }
  });

  // src/export.js
  var require_export = __commonJS({
    "src/export.js"(exports, module) {
      "use strict";
      var acc = require_accounting();
      var POSTED = "v.status IN ('posted','reversed')";
      var vno = (type, number) => `${type}-${String(number).padStart(4, "0")}`;
      var sheet = (name, columns, rows) => ({
        name,
        columns: columns.map(([label, type = "text"]) => ({ label, type })),
        rows
      });
      function buildExport(db, projects) {
        const all = {
          summary: [],
          projects: [],
          owners: [],
          accounts: [],
          vouchers: [],
          lines: [],
          trial: [],
          buildings: [],
          units: [],
          contacts: [],
          budget: [],
          milestones: [],
          documents: [],
          activity: []
        };
        for (const p of projects) {
          const P = p.name;
          const cur = p.currency;
          const balances = acc.accountBalances(db, p.id);
          const totalCost = balances.filter((b) => b.is_cost).reduce((s, b) => s + b.balance, 0);
          const cash = balances.filter((b) => b.is_cash).reduce((s, b) => s + b.balance, 0);
          const owed = balances.filter((b) => b.type === "liability").reduce((s, b) => s + b.balance, 0);
          const income = balances.filter((b) => b.type === "revenue").reduce((s, b) => s + b.balance, 0);
          const st = acc.ownerStatement(db, p.id);
          const tb = acc.trialBalance(db, p.id);
          all.summary.push([
            P,
            cur,
            p.status,
            p.total_budget,
            totalCost,
            p.total_budget ? totalCost / p.total_budget * 100 : null,
            cash,
            st.totalContributed,
            owed,
            income,
            tb.balanced ? "Yes" : "NO"
          ]);
          all.projects.push([
            P,
            p.code,
            p.location,
            p.plot_number,
            p.land_area_sqm,
            cur,
            p.status,
            p.start_date,
            p.target_completion,
            p.total_budget,
            p.lock_date,
            p.description,
            p.archived ? "Yes" : "No"
          ]);
          for (const o of st.owners) {
            all.owners.push([
              P,
              o.name,
              o.share_pct,
              o.committed_capital,
              o.contributed,
              o.remaining_commitment,
              o.share_of_cost,
              o.phone,
              o.email,
              o.national_id,
              o.address,
              o.joined_date,
              o.active ? "Yes" : "No",
              o.notes
            ]);
          }
          for (const a of balances) {
            all.accounts.push([P, a.code, a.name, a.type, a.is_cash ? "Yes" : "", a.is_cost ? "Yes" : "", a.debit, a.credit, a.balance, a.active ? "Yes" : "No"]);
          }
          for (const r of tb.rows) all.trial.push([P, r.code, r.name, r.type, r.tb_debit, r.tb_credit]);
          all.trial.push([P, "", "TOTAL", "", tb.debit, tb.credit]);
          const vouchers = db.prepare(
            `SELECT v.*, c.name AS contact_name, un.unit_no, cu.name AS created_by_name, pu.name AS posted_by_name,
              (SELECT SUM(debit) FROM voucher_lines WHERE voucher_id = v.id) AS total,
              (SELECT COUNT(*) FROM attachments WHERE voucher_id = v.id AND deleted_at IS NULL) AS files
       FROM vouchers v LEFT JOIN contacts c ON c.id = v.contact_id LEFT JOIN units un ON un.id = v.unit_id
       LEFT JOIN users cu ON cu.id = v.created_by LEFT JOIN users pu ON pu.id = v.posted_by
       WHERE v.project_id = ? ORDER BY v.date, v.id`
          ).all(p.id);
          const byId = new Map(vouchers.map((v) => [v.id, v]));
          for (const v of vouchers) {
            all.vouchers.push([
              P,
              vno(v.type, v.number),
              v.type,
              v.date,
              v.description,
              v.reference,
              v.contact_name,
              v.unit_no,
              v.total,
              v.status,
              v.reversal_of && byId.get(v.reversal_of) ? vno(byId.get(v.reversal_of).type, byId.get(v.reversal_of).number) : "",
              v.created_by_name,
              v.created_at,
              v.posted_by_name,
              v.posted_at,
              v.files
            ]);
          }
          const lines = db.prepare(
            `SELECT l.*, v.type, v.number, v.date, v.status, v.description, a.code, a.name AS account_name,
              o.name AS owner_name, b.name AS building_name
       FROM voucher_lines l JOIN vouchers v ON v.id = l.voucher_id JOIN accounts a ON a.id = l.account_id
       LEFT JOIN owners o ON o.id = l.owner_id LEFT JOIN buildings b ON b.id = l.building_id
       WHERE v.project_id = ? ORDER BY v.date, v.id, l.line_no`
          ).all(p.id);
          for (const l of lines) {
            all.lines.push([
              P,
              vno(l.type, l.number),
              l.date,
              l.status,
              l.line_no,
              l.code,
              l.account_name,
              l.debit,
              l.credit,
              l.memo || l.description,
              l.owner_name,
              l.building_name
            ]);
          }
          const spent = new Map(db.prepare(
            `SELECT l.building_id AS id, SUM(l.debit - l.credit) AS spent FROM voucher_lines l
       JOIN vouchers v ON v.id = l.voucher_id JOIN accounts a ON a.id = l.account_id
       WHERE v.project_id = ? AND a.is_cost = 1 AND l.building_id IS NOT NULL AND ${POSTED} GROUP BY l.building_id`
          ).all(p.id).map((r) => [r.id, r.spent]));
          const buildings = db.prepare("SELECT * FROM buildings WHERE project_id = ? ORDER BY id").all(p.id);
          const bName = new Map(buildings.map((b) => [b.id, b.name]));
          for (const b of buildings) {
            all.buildings.push([
              P,
              b.name,
              b.kind,
              b.status,
              b.progress_pct,
              b.floors,
              b.area_sqm,
              b.budget,
              spent.get(b.id) || 0,
              b.budget - (spent.get(b.id) || 0),
              b.start_date,
              b.end_date,
              b.notes
            ]);
          }
          const contacts = db.prepare(
            `SELECT t.*,
         COALESCE((SELECT SUM(l.credit - l.debit) FROM vouchers v JOIN voucher_lines l ON l.voucher_id = v.id
           JOIN accounts a ON a.id = l.account_id WHERE v.contact_id = t.id AND a.is_cash = 1 AND ${POSTED}), 0) AS net_paid,
         COALESCE((SELECT SUM(l.credit - l.debit) FROM vouchers v JOIN voucher_lines l ON l.voucher_id = v.id
           JOIN accounts a ON a.id = l.account_id WHERE v.contact_id = t.id AND a.type = 'liability' AND ${POSTED}), 0) AS owed
       FROM contacts t WHERE t.project_id = ? ORDER BY t.name`
          ).all(p.id);
          const cName = new Map(contacts.map((c) => [c.id, c.name]));
          for (const c of contacts) {
            all.contacts.push([
              P,
              c.name,
              c.kind,
              c.phone,
              c.email,
              c.tax_id,
              c.address,
              Math.max(0, c.net_paid),
              Math.max(0, -c.net_paid),
              c.owed,
              c.active ? "Yes" : "No",
              c.notes
            ]);
          }
          const units = db.prepare(
            `SELECT t.*, COALESCE((SELECT SUM(l.debit - l.credit) FROM vouchers v JOIN voucher_lines l ON l.voucher_id = v.id
         JOIN accounts a ON a.id = l.account_id WHERE v.unit_id = t.id AND a.is_cash = 1 AND ${POSTED}), 0) AS collected
       FROM units t WHERE t.project_id = ? ORDER BY t.unit_no`
          ).all(p.id);
          for (const u of units) {
            all.units.push([
              P,
              u.unit_no,
              bName.get(u.building_id),
              u.kind,
              u.floor,
              u.area_sqm,
              u.bedrooms,
              u.list_price,
              u.sale_price,
              u.collected,
              u.sale_price ? u.sale_price - u.collected : 0,
              u.status,
              cName.get(u.buyer_contact_id),
              u.sale_date,
              u.notes
            ]);
          }
          const budget = acc.budgetVsActual(db, p.id);
          for (const b of budget.rows) {
            all.budget.push([P, b.code, b.account_name, b.building_name || "All", b.amount, b.actual, b.variance, b.used_pct, b.notes]);
          }
          for (const m of db.prepare("SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date IS NULL, due_date").all(p.id)) {
            all.milestones.push([P, m.title, bName.get(m.building_id) || "Whole compound", m.status, m.due_date, m.done_date, m.notes]);
          }
          const docs = db.prepare(
            `SELECT a.*, v.type, v.number, u.name AS uploaded_by_name FROM attachments a
       LEFT JOIN vouchers v ON v.id = a.voucher_id LEFT JOIN users u ON u.id = a.uploaded_by
       WHERE a.project_id = ? AND a.deleted_at IS NULL ORDER BY a.id`
          ).all(p.id);
          for (const d of docs) {
            all.documents.push([
              P,
              d.filename,
              d.category,
              d.voucher_id ? vno(d.type, d.number) : "",
              Math.ceil(d.size / 1024),
              d.uploaded_by_name,
              d.uploaded_at,
              d.note
            ]);
          }
          for (const a of db.prepare("SELECT * FROM audit_log WHERE project_id = ? ORDER BY id").all(p.id)) {
            all.activity.push([P, a.at, a.user_name, a.action, a.entity, a.entity_id, a.details]);
          }
        }
        return [
          sheet("Summary", [
            ["Project"],
            ["Currency"],
            ["Status"],
            ["Budget", "money"],
            ["Total spent", "money"],
            ["% of budget", "pct"],
            ["Cash available", "money"],
            ["Owner capital paid in", "money"],
            ["Owed (liabilities)", "money"],
            ["Income", "money"],
            ["Books balanced"]
          ], all.summary),
          sheet("Projects", [
            ["Project"],
            ["Code"],
            ["Location"],
            ["Plot no."],
            ["Land area m2", "number"],
            ["Currency"],
            ["Status"],
            ["Start date", "date"],
            ["Target completion", "date"],
            ["Total budget", "money"],
            ["Books locked until", "date"],
            ["Description"],
            ["Archived"]
          ], all.projects),
          sheet("Owners", [
            ["Project"],
            ["Owner"],
            ["Share %", "number"],
            ["Committed capital", "money"],
            ["Paid in", "money"],
            ["Remaining commitment", "money"],
            ["Share of project cost", "money"],
            ["Phone"],
            ["Email"],
            ["ID / passport"],
            ["Address"],
            ["Joined", "date"],
            ["Active"],
            ["Notes"]
          ], all.owners),
          sheet("Chart of Accounts", [
            ["Project"],
            ["Account no."],
            ["Account"],
            ["Type"],
            ["Cash account"],
            ["Project cost"],
            ["Total debit", "money"],
            ["Total credit", "money"],
            ["Balance", "money"],
            ["Active"]
          ], all.accounts),
          sheet("Journal Vouchers", [
            ["Project"],
            ["Voucher no."],
            ["Type"],
            ["Date", "date"],
            ["Description"],
            ["Reference"],
            ["Contact"],
            ["Unit"],
            ["Amount", "money"],
            ["Status"],
            ["Reverses"],
            ["Prepared by"],
            ["Prepared at"],
            ["Posted by"],
            ["Posted at"],
            ["Attachments", "number"]
          ], all.vouchers),
          sheet("Debit & Credit Lines", [
            ["Project"],
            ["Voucher no."],
            ["Date", "date"],
            ["Voucher status"],
            ["Line", "number"],
            ["Account no."],
            ["Account"],
            ["Debit", "money"],
            ["Credit", "money"],
            ["Memo"],
            ["Owner"],
            ["Building"]
          ], all.lines),
          sheet("Trial Balance", [["Project"], ["Account no."], ["Account"], ["Type"], ["Debit", "money"], ["Credit", "money"]], all.trial),
          sheet("Buildings", [
            ["Project"],
            ["Building"],
            ["Type"],
            ["Status"],
            ["Progress %", "number"],
            ["Floors", "number"],
            ["Area m2", "number"],
            ["Budget", "money"],
            ["Spent", "money"],
            ["Remaining", "money"],
            ["Start", "date"],
            ["Completion", "date"],
            ["Notes"]
          ], all.buildings),
          sheet("Units & Sales", [
            ["Project"],
            ["Unit"],
            ["Building"],
            ["Type"],
            ["Floor"],
            ["Area m2", "number"],
            ["Bedrooms", "number"],
            ["Asking price", "money"],
            ["Sale price", "money"],
            ["Collected", "money"],
            ["Balance due", "money"],
            ["Status"],
            ["Buyer"],
            ["Sale date", "date"],
            ["Notes"]
          ], all.units),
          sheet("Suppliers & Contacts", [
            ["Project"],
            ["Name"],
            ["Type"],
            ["Phone"],
            ["Email"],
            ["Tax no."],
            ["Address"],
            ["Paid to them", "money"],
            ["Received from them", "money"],
            ["We owe / hold", "money"],
            ["Active"],
            ["Notes"]
          ], all.contacts),
          sheet("Budget vs Actual", [
            ["Project"],
            ["Account no."],
            ["Category"],
            ["Building"],
            ["Budget", "money"],
            ["Actual", "money"],
            ["Remaining", "money"],
            ["Used %", "number"],
            ["Notes"]
          ], all.budget),
          sheet("Timeline", [["Project"], ["Milestone"], ["Building"], ["Status"], ["Due", "date"], ["Completed", "date"], ["Notes"]], all.milestones),
          sheet("Documents & Receipts", [
            ["Project"],
            ["File"],
            ["Category"],
            ["Voucher no."],
            ["Size KB", "number"],
            ["Uploaded by"],
            ["Uploaded at"],
            ["Note"]
          ], all.documents),
          sheet("Activity Log", [["Project"], ["When (UTC)"], ["Who"], ["Action"], ["Record"], ["Record id", "number"], ["Details"]], all.activity)
        ];
      }
      module.exports = { buildExport };
    }
  });

  // src/api.js
  var require_api = __commonJS({
    "src/api.js"(exports, module) {
      "use strict";
      var crypto = require_crypto_shim();
      var { Buffer: Buffer2 } = require_buffer_shim();
      var acc = require_accounting();
      var { seedDemo } = require_demo();
      var { buildExport } = require_export();
      var HttpError = class extends Error {
        constructor(status, message) {
          super(message);
          this.status = status;
        }
      };
      var ROLE_LEVEL = { viewer: 1, accountant: 2, admin: 3 };
      var SESSION_MS = 30 * 24 * 3600 * 1e3;
      var MAX_BODY = 30 * 1024 * 1024;
      var MAX_UPLOAD = 20 * 1024 * 1024;
      var CHUNK = 1024 * 1024;
      var PBKDF2_ITERATIONS = 1e5;
      var INLINE_MIME = /* @__PURE__ */ new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"]);
      var ENTITIES = {
        owners: {
          name: "str!",
          email: "str",
          phone: "str",
          national_id: "str",
          address: "str",
          share_pct: "num0",
          committed_capital: "money",
          joined_date: "date",
          notes: "str",
          active: "bool"
        },
        contacts: {
          name: "str!",
          kind: "enum:supplier|contractor|consultant|buyer|bank|government|other",
          phone: "str",
          email: "str",
          tax_id: "str",
          address: "str",
          notes: "str",
          active: "bool"
        },
        buildings: {
          name: "str!",
          kind: "enum:residential|villa|commercial|mixed|amenity|infrastructure|other",
          floors: "int",
          area_sqm: "num",
          status: "enum:planned|design|permits|excavation|structure|finishing|completed|on_hold",
          progress_pct: "num0",
          budget: "money",
          start_date: "date",
          end_date: "date",
          notes: "str"
        },
        units: {
          building_id: "ref:buildings",
          unit_no: "str!",
          kind: "enum:apartment|villa|townhouse|shop|office|parking|storage|other",
          floor: "str",
          area_sqm: "num",
          bedrooms: "int",
          list_price: "money",
          sale_price: "money",
          status: "enum:available|reserved|sold|owner_retained|not_for_sale",
          buyer_contact_id: "ref:contacts",
          sale_date: "date",
          notes: "str"
        },
        budgets: { account_id: "ref:accounts!", building_id: "ref:buildings", amount: "money", notes: "str" },
        milestones: {
          building_id: "ref:buildings",
          title: "str!",
          due_date: "date",
          done_date: "date",
          status: "enum:pending|in_progress|done|delayed",
          notes: "str"
        },
        accounts: {
          code: "str!",
          name: "str!",
          type: "enum:asset|liability|equity|revenue|expense!",
          description: "str",
          is_cash: "bool",
          is_cost: "bool",
          is_partner: "bool",
          active: "bool"
        }
      };
      var PROJECT_FIELDS = {
        name: "str!",
        code: "str",
        location: "str",
        plot_number: "str",
        land_area_sqm: "num",
        description: "str",
        currency: "str",
        status: "enum:planning|design|permits|construction|sales|completed|on_hold",
        start_date: "date",
        target_completion: "date",
        total_budget: "money",
        archived: "bool",
        lbp_rate: "num"
      };
      var LIST_ORDER = {
        owners: "id",
        contacts: "name COLLATE NOCASE",
        buildings: "id",
        units: "unit_no",
        budgets: "id",
        milestones: "due_date IS NULL, due_date",
        accounts: "code"
      };
      function label(k) {
        return k.replace(/_id$/, "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
      }
      function cleanFields(db, projectId, spec, input, partial) {
        const out = {};
        for (const [key, rawType] of Object.entries(spec)) {
          const required = rawType.endsWith("!");
          const type = rawType.replace("!", "");
          if (!(key in input)) {
            if (!partial && required) throw new HttpError(400, `${label(key)} is required.`);
            continue;
          }
          let v = input[key];
          const empty = v === null || v === void 0 || v === "";
          if (empty && required) throw new HttpError(400, `${label(key)} is required.`);
          if (type === "str") {
            v = empty ? null : String(v).trim().slice(0, 5e3);
            if (required && !v) throw new HttpError(400, `${label(key)} is required.`);
          } else if (type === "num" || type === "num0" || type === "int" || type === "money") {
            if (empty) v = type === "money" || type === "num0" ? 0 : null;
            else {
              v = Number(v);
              if (!Number.isFinite(v)) throw new HttpError(400, `${label(key)} must be a number.`);
              if (type === "int" || type === "money") v = Math.round(v);
            }
          } else if (type === "date") {
            if (empty) v = null;
            else if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new HttpError(400, `${label(key)} must be a date (YYYY-MM-DD).`);
          } else if (type === "bool") {
            v = v ? 1 : 0;
          } else if (type.startsWith("enum:")) {
            const options = type.slice(5).split("|");
            if (empty) continue;
            if (!options.includes(v)) throw new HttpError(400, `${label(key)} is not valid.`);
          } else if (type.startsWith("ref:")) {
            const table = type.slice(4);
            if (empty) v = null;
            else {
              v = Number(v);
              const row = db.prepare(`SELECT id FROM ${table} WHERE id = ? AND project_id = ?`).get(v, projectId);
              if (!row) throw new HttpError(400, `${label(key)} not found in this project.`);
            }
          }
          out[key] = v;
        }
        return out;
      }
      function hashPassword(pw) {
        const salt = crypto.randomBytes(16);
        const hash = crypto.pbkdf2Sync(pw, salt, PBKDF2_ITERATIONS, 32, "sha256");
        return `pbkdf2$${PBKDF2_ITERATIONS}$${salt.toString("hex")}$${hash.toString("hex")}`;
      }
      function verifyPassword(pw, stored) {
        const [scheme, iterations, salt, hash] = String(stored).split("$");
        if (scheme !== "pbkdf2" || !salt || !hash) return false;
        const calc = crypto.pbkdf2Sync(pw, Buffer2.from(salt, "hex"), Number(iterations), 32, "sha256");
        const expected = Buffer2.from(hash, "hex");
        return expected.length === calc.length && crypto.timingSafeEqual(calc, expected);
      }
      function checkPasswordStrength(pw) {
        if (typeof pw !== "string" || pw.length < 8) throw new HttpError(400, "Password must be at least 8 characters.");
      }
      function sha256(s) {
        return crypto.createHash("sha256").update(s).digest("hex");
      }
      function parseCookies(header) {
        const out = {};
        for (const part of String(header || "").split(";")) {
          const i = part.indexOf("=");
          if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
        }
        return out;
      }
      function createApi2({ db }) {
        const routes = [];
        const loginAttempts = /* @__PURE__ */ new Map();
        function route(method, pattern, minRole, handler) {
          const keys = [];
          const re = new RegExp(
            "^" + pattern.replace(/:(\w+)(?:\(([^)]*)\))?/g, (_, k, alt) => {
              keys.push(k);
              return alt ? `(${alt})` : k === "pid" || k === "id" ? "(\\d+)" : "([^/]+)";
            }) + "$"
          );
          routes.push({ method, re, keys, minRole, handler });
        }
        function audit(ctx, projectId, action, entity, entityId, details) {
          db.prepare(
            "INSERT INTO audit_log (user_id, user_name, project_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)"
          ).run(
            ctx.user ? ctx.user.id : null,
            ctx.user ? ctx.user.name : null,
            projectId || null,
            action,
            entity,
            entityId || null,
            details ? JSON.stringify(details) : null
          );
        }
        function project(id) {
          const p = db.prepare("SELECT * FROM projects WHERE id = ?").get(Number(id));
          if (!p) throw new HttpError(404, "Project not found.");
          return p;
        }
        function diff(before, after) {
          const changes = {};
          for (const k of Object.keys(after)) {
            if (before[k] !== after[k]) changes[k] = [before[k], after[k]];
          }
          return changes;
        }
        function insert(table, data) {
          const keys = Object.keys(data);
          const r = db.prepare(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`).run(...keys.map((k) => data[k]));
          return Number(r.lastInsertRowid);
        }
        function update(table, id, data) {
          const keys = Object.keys(data);
          if (!keys.length) return;
          db.prepare(`UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`).run(
            ...keys.map((k) => data[k]),
            id
          );
        }
        function startSession(ctx, userId2, ms = SESSION_MS) {
          const token = crypto.randomBytes(32).toString("hex");
          db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(
            sha256(token),
            userId2,
            Date.now() + ms
          );
          db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
          ctx.setCookie = `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(ms / 1e3)}${ctx.secure ? "; Secure" : ""}`;
        }
        function publicUser(u) {
          return {
            id: u.id,
            username: u.username,
            name: u.name,
            email: u.email,
            role: u.role,
            active: u.active,
            is_guest: u.is_guest,
            must_change_password: u.must_change_password
          };
        }
        function getSetting(key, fallback) {
          const row = db.prepare("SELECT value FROM _meta WHERE key = ?").get(key);
          return row ? row.value : fallback;
        }
        const guestEnabled = () => getSetting("guest_enabled", "1") === "1";
        const realUserCount = () => db.prepare("SELECT COUNT(*) AS n FROM users WHERE is_guest = 0").get().n;
        route("GET", "/api/setup", null, () => ({
          needsSetup: realUserCount() === 0,
          guestEnabled: guestEnabled()
        }));
        route("POST", "/api/guest", null, (ctx) => {
          if (!guestEnabled()) throw new HttpError(403, "Guest access is turned off.");
          let guest = db.prepare("SELECT * FROM users WHERE is_guest = 1").get();
          if (!guest) {
            const id = insert("users", {
              username: "__guest__",
              name: "Guest",
              role: "accountant",
              is_guest: 1,
              password_hash: "!"
            });
            guest = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
          }
          if (!db.prepare("SELECT id FROM projects WHERE is_demo = 1").get()) seedDemo(db, guest.id);
          startSession(ctx, guest.id);
          ctx.user = guest;
          audit(ctx, null, "login", "user", guest.id, { guest: true });
          return publicUser(guest);
        });
        route("POST", "/api/demo/reset", "admin", (ctx) => {
          const demo = db.prepare("SELECT id FROM projects WHERE is_demo = 1").get();
          if (demo) {
            const pid = demo.id;
            db.transaction(() => {
              db.prepare("DELETE FROM attachment_chunks WHERE attachment_id IN (SELECT id FROM attachments WHERE project_id = ?)").run(pid);
              db.prepare("DELETE FROM attachments WHERE project_id = ?").run(pid);
              db.prepare("DELETE FROM voucher_lines WHERE voucher_id IN (SELECT id FROM vouchers WHERE project_id = ?)").run(pid);
              db.prepare("UPDATE vouchers SET reversal_of = NULL, reversed_by = NULL WHERE project_id = ?").run(pid);
              for (const t of ["vouchers", "budgets", "units", "milestones", "owners", "contacts", "buildings", "accounts", "audit_log", "projects"]) {
                db.prepare(`DELETE FROM ${t} WHERE ${t === "projects" ? "id" : "project_id"} = ?`).run(pid);
              }
            });
          }
          seedDemo(db, ctx.user.id);
          audit(ctx, null, "reset", "demo", null);
          return { ok: true };
        });
        route("PUT", "/api/settings", "admin", (ctx) => {
          if ("guest_enabled" in ctx.body) {
            const v = ctx.body.guest_enabled ? "1" : "0";
            db.prepare("INSERT OR REPLACE INTO _meta (key, value) VALUES ('guest_enabled', ?)").run(v);
            if (v === "0") db.prepare("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE is_guest = 1)").run();
            audit(ctx, null, "update", "settings", null, { guest_enabled: v === "1" });
          }
          return { guestEnabled: guestEnabled() };
        });
        const INVITE_MS = 14 * 24 * 3600 * 1e3;
        const findInvite = (token) => {
          const inv = db.prepare("SELECT * FROM invites WHERE token_hash = ?").get(sha256(String(token || "")));
          if (!inv || inv.used_at || inv.expires_at < Date.now()) throw new HttpError(404, "This invite link is invalid, already used or expired. Ask for a new one.");
          return inv;
        };
        route("POST", "/api/invites", "admin", (ctx) => {
          const role = ctx.body.role || "accountant";
          if (!ROLE_LEVEL[role]) throw new HttpError(400, "Choose a role.");
          const token = crypto.randomBytes(24).toString("hex");
          const id = insert("invites", { token_hash: sha256(token), role, created_by: ctx.user.id, expires_at: Date.now() + INVITE_MS });
          audit(ctx, null, "create", "invite", id, { role });
          return { token, role, expires_in_days: 14 };
        });
        route("GET", "/api/invites/:token", null, (ctx) => {
          const inv = findInvite(ctx.params.token);
          const by = db.prepare("SELECT name FROM users WHERE id = ?").get(inv.created_by);
          return { role: inv.role, invited_by: by ? by.name : null };
        });
        route("POST", "/api/invites/:token/accept", null, (ctx) => {
          const inv = findInvite(ctx.params.token);
          const name = String(ctx.body.name || "").trim();
          const username = String(ctx.body.username || "").trim();
          if (!name || !username) throw new HttpError(400, "Name and username are required.");
          checkPasswordStrength(ctx.body.password);
          if (db.prepare("SELECT id FROM users WHERE username = ?").get(username)) throw new HttpError(400, "That username is taken.");
          const id = db.transaction(() => {
            const uid = insert("users", {
              name,
              username,
              email: ctx.body.email ? String(ctx.body.email).trim() : null,
              role: inv.role,
              password_hash: hashPassword(ctx.body.password)
            });
            db.prepare("UPDATE invites SET used_by = ?, used_at = datetime('now') WHERE id = ?").run(uid, inv.id);
            return uid;
          });
          ctx.user = { id, name };
          audit(ctx, null, "create", "user", id, { username, role: inv.role, via: "invite link" });
          startSession(ctx, id);
          return { ok: true };
        });
        const LINK_SESSION_MS = 365 * 24 * 3600 * 1e3;
        route(
          "GET",
          "/api/access-links",
          "admin",
          () => db.prepare(
            `SELECT l.id, l.created_at, l.revoked_at, u.name, u.role FROM access_links l JOIN users u ON u.id = l.user_id ORDER BY l.id DESC`
          ).all()
        );
        route("POST", "/api/access-links", "admin", (ctx) => {
          const name = String(ctx.body.name || "").trim();
          const role = ctx.body.role || "accountant";
          if (!name) throw new HttpError(400, "Enter who this link is for.");
          if (!ROLE_LEVEL[role]) throw new HttpError(400, "Choose a role.");
          const token = crypto.randomBytes(24).toString("hex");
          const id = db.transaction(() => {
            const uid = insert("users", {
              name,
              username: `link-${crypto.randomBytes(6).toString("hex")}`,
              role,
              password_hash: "!"
            });
            return insert("access_links", { token_hash: sha256(token), user_id: uid, created_by: ctx.user.id });
          });
          audit(ctx, null, "create", "access_link", id, { name, role });
          return { id, token };
        });
        route("DELETE", "/api/access-links/:id", "admin", (ctx) => {
          const l = db.prepare("SELECT * FROM access_links WHERE id = ?").get(Number(ctx.params.id));
          if (!l) throw new HttpError(404, "Link not found.");
          if (l.user_id === ctx.user.id) throw new HttpError(400, "You cannot turn off the link you are using right now.");
          db.transaction(() => {
            db.prepare("UPDATE access_links SET revoked_at = datetime('now') WHERE id = ?").run(l.id);
            db.prepare("UPDATE users SET active = 0 WHERE id = ?").run(l.user_id);
            db.prepare("DELETE FROM sessions WHERE user_id = ?").run(l.user_id);
          });
          audit(ctx, null, "revoke", "access_link", l.id);
          return { ok: true };
        });
        route("POST", "/api/access/:token", null, (ctx) => {
          const l = db.prepare("SELECT * FROM access_links WHERE token_hash = ? AND revoked_at IS NULL").get(sha256(ctx.params.token));
          const u = l && db.prepare("SELECT * FROM users WHERE id = ? AND active = 1").get(l.user_id);
          if (!u) throw new HttpError(404, "This link no longer works. Ask the admin for a new one.");
          startSession(ctx, u.id, LINK_SESSION_MS);
          ctx.user = u;
          audit(ctx, null, "login", "user", u.id, { via: "access link" });
          return publicUser(u);
        });
        route("POST", "/api/setup", null, (ctx) => {
          if (realUserCount() > 0) throw new HttpError(400, "Setup already done.");
          const { name, username, password } = ctx.body;
          if (!name || !username) throw new HttpError(400, "Name and username are required.");
          checkPasswordStrength(password);
          const id = insert("users", {
            name: String(name).trim(),
            username: String(username).trim(),
            role: "admin",
            password_hash: hashPassword(password)
          });
          ctx.user = { id, name };
          audit(ctx, null, "create", "user", id, { username, role: "admin", note: "initial setup" });
          startSession(ctx, id);
          return { ok: true };
        });
        route("POST", "/api/login", null, (ctx) => {
          const ip = ctx.ip || "unknown";
          const rec = loginAttempts.get(ip) || { n: 0, until: 0 };
          if (rec.until > Date.now()) throw new HttpError(429, "Too many attempts. Try again in a few minutes.");
          const { username, password } = ctx.body;
          const u = db.prepare("SELECT * FROM users WHERE username = ? AND is_guest = 0").get(String(username || "").trim());
          if (!u || !u.active || !verifyPassword(String(password || ""), u.password_hash)) {
            rec.n += 1;
            if (rec.n >= 8) {
              rec.until = Date.now() + 10 * 60 * 1e3;
              rec.n = 0;
            }
            loginAttempts.set(ip, rec);
            throw new HttpError(401, "Wrong username or password.");
          }
          loginAttempts.delete(ip);
          startSession(ctx, u.id);
          ctx.user = u;
          audit(ctx, null, "login", "user", u.id);
          return publicUser(u);
        });
        route("POST", "/api/logout", "viewer", (ctx) => {
          db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(ctx.tokenHash);
          ctx.setCookie = "sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";
          return { ok: true };
        });
        route("GET", "/api/me", "viewer", (ctx) => publicUser(ctx.user));
        route("PUT", "/api/me", "viewer", (ctx) => {
          if (ctx.user.is_guest) throw new HttpError(403, "Guests cannot change their name.");
          const name = String(ctx.body.name || "").trim();
          if (!name) throw new HttpError(400, "Enter your name.");
          db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name.slice(0, 100), ctx.user.id);
          audit(ctx, null, "update", "user", ctx.user.id, { name });
          return { ok: true };
        });
        route("GET", "/api/export", "viewer", (ctx) => {
          const projects = db.prepare("SELECT * FROM projects WHERE (? = 0 OR is_demo = 1) ORDER BY is_demo, id").all(ctx.user.is_guest ? 1 : 0);
          const sheets = buildExport(db, projects);
          if (!ctx.user.is_guest) {
            const activity = sheets.find((x) => x.name === "Activity Log");
            for (const a of db.prepare("SELECT * FROM audit_log WHERE project_id IS NULL ORDER BY id").all()) {
              activity.rows.push(["(all projects)", a.at, a.user_name, a.action, a.entity, a.entity_id, a.details]);
            }
          }
          if (!ctx.query.quiet) audit(ctx, null, "export", "excel", null, { projects: projects.length });
          return { generated_at: (/* @__PURE__ */ new Date()).toISOString(), sheets };
        });
        route("POST", "/api/me/password", "viewer", (ctx) => {
          const { current, password } = ctx.body;
          if (!verifyPassword(String(current || ""), ctx.user.password_hash)) throw new HttpError(400, "Current password is wrong.");
          checkPasswordStrength(password);
          db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?").run(hashPassword(password), ctx.user.id);
          db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").run(ctx.user.id, ctx.tokenHash);
          audit(ctx, null, "change_password", "user", ctx.user.id);
          return { ok: true };
        });
        route(
          "GET",
          "/api/users",
          "admin",
          () => db.prepare("SELECT * FROM users WHERE is_guest = 0 AND id NOT IN (SELECT user_id FROM access_links) ORDER BY id").all().map(publicUser)
        );
        route("POST", "/api/users", "admin", (ctx) => {
          const { name, username, email, role, password } = ctx.body;
          if (!name || !username) throw new HttpError(400, "Name and username are required.");
          if (!ROLE_LEVEL[role]) throw new HttpError(400, "Choose a role.");
          checkPasswordStrength(password);
          if (db.prepare("SELECT id FROM users WHERE username = ?").get(String(username).trim())) {
            throw new HttpError(400, "That username is taken.");
          }
          const id = insert("users", {
            name: String(name).trim(),
            username: String(username).trim(),
            email: email || null,
            role,
            password_hash: hashPassword(password),
            must_change_password: 1
          });
          audit(ctx, null, "create", "user", id, { username, role });
          return { id };
        });
        route("PUT", "/api/users/:id", "admin", (ctx) => {
          const id = Number(ctx.params.id);
          const u = db.prepare("SELECT * FROM users WHERE id = ? AND is_guest = 0").get(id);
          if (!u) throw new HttpError(404, "User not found.");
          const data = {};
          if (ctx.body.name) data.name = String(ctx.body.name).trim();
          if ("email" in ctx.body) data.email = ctx.body.email || null;
          if (ctx.body.role) {
            if (!ROLE_LEVEL[ctx.body.role]) throw new HttpError(400, "Invalid role.");
            data.role = ctx.body.role;
          }
          if ("active" in ctx.body) data.active = ctx.body.active ? 1 : 0;
          if (id === ctx.user.id && (data.role && data.role !== "admin" || data.active === 0)) {
            throw new HttpError(400, "You cannot demote or deactivate yourself.");
          }
          if (ctx.body.password) {
            checkPasswordStrength(ctx.body.password);
            data.password_hash = hashPassword(ctx.body.password);
            if (id !== ctx.user.id) data.must_change_password = 1;
          }
          update("users", id, data);
          if (data.active === 0 || data.password_hash) {
            db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").run(id, ctx.tokenHash);
          }
          const { password_hash, ...logged } = data;
          audit(ctx, null, "update", "user", id, { ...logged, ...password_hash ? { password: "reset" } : {} });
          return { ok: true };
        });
        route(
          "GET",
          "/api/projects",
          "viewer",
          (ctx) => db.prepare(
            `SELECT p.*, (SELECT COUNT(*) FROM owners o WHERE o.project_id = p.id AND o.active = 1) AS owner_count
       FROM projects p WHERE (? = 0 OR p.is_demo = 1) ORDER BY p.archived, p.is_demo, p.id`
          ).all(ctx.user.is_guest ? 1 : 0)
        );
        route("POST", "/api/projects", "admin", (ctx) => {
          const data = cleanFields(db, null, PROJECT_FIELDS, ctx.body, false);
          data.currency = (data.currency || "USD").toUpperCase().slice(0, 3);
          if (!(data.lbp_rate > 0)) delete data.lbp_rate;
          const id = db.transaction(() => {
            const pid = insert("projects", data);
            acc.seedAccounts(db, pid);
            return pid;
          });
          audit(ctx, id, "create", "project", id, data);
          return { id };
        });
        route("GET", "/api/projects/:pid", "viewer", (ctx) => project(ctx.params.pid));
        route("PUT", "/api/projects/:pid", "admin", (ctx) => {
          const p = project(ctx.params.pid);
          const data = cleanFields(db, p.id, PROJECT_FIELDS, ctx.body, true);
          if (data.currency) data.currency = data.currency.toUpperCase().slice(0, 3);
          if ("lbp_rate" in data && !(data.lbp_rate > 0)) delete data.lbp_rate;
          if ("lock_date" in ctx.body) {
            const v = ctx.body.lock_date || null;
            if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new HttpError(400, "Lock date must be YYYY-MM-DD.");
            data.lock_date = v;
          }
          update("projects", p.id, data);
          audit(ctx, p.id, "update", "project", p.id, diff(p, data));
          return { ok: true };
        });
        const entityNames = Object.keys(ENTITIES).join("|");
        const POSTED_V = "v.status IN ('posted','reversed')";
        const LIST_EXTRA = {
          units: `, COALESCE((SELECT SUM(l.debit - l.credit) FROM vouchers v JOIN voucher_lines l ON l.voucher_id = v.id
              JOIN accounts a ON a.id = l.account_id WHERE v.unit_id = t.id AND a.is_cash = 1 AND ${POSTED_V}), 0) AS collected`,
          contacts: `, COALESCE((SELECT SUM(l.credit - l.debit) FROM vouchers v JOIN voucher_lines l ON l.voucher_id = v.id
                 JOIN accounts a ON a.id = l.account_id WHERE v.contact_id = t.id AND a.is_cash = 1 AND ${POSTED_V}), 0) AS net_paid,
               COALESCE((SELECT SUM(l.credit - l.debit) FROM vouchers v JOIN voucher_lines l ON l.voucher_id = v.id
                 JOIN accounts a ON a.id = l.account_id WHERE v.contact_id = t.id AND a.type = 'liability' AND ${POSTED_V}), 0) AS owed`
        };
        route("GET", `/api/projects/:pid/:entity(${entityNames})`, "viewer", (ctx) => {
          const p = project(ctx.params.pid);
          const e = ctx.params.entity;
          return db.prepare(`SELECT t.*${LIST_EXTRA[e] || ""} FROM ${e} t WHERE t.project_id = ? ORDER BY ${LIST_ORDER[e].replace(/^(\w+)/, "t.$1")}`).all(p.id);
        });
        route("POST", `/api/projects/:pid/:entity(${entityNames})`, "accountant", (ctx) => {
          const p = project(ctx.params.pid);
          const entity = ctx.params.entity;
          const data = cleanFields(db, p.id, ENTITIES[entity], ctx.body, false);
          data.project_id = p.id;
          const id = db.transaction(() => {
            if (entity === "accounts" && db.prepare("SELECT id FROM accounts WHERE project_id = ? AND code = ?").get(p.id, data.code)) {
              throw new HttpError(400, `Account code ${data.code} already exists.`);
            }
            const newId = insert(entity, data);
            if (entity === "owners") {
              const accId = insert("accounts", {
                project_id: p.id,
                code: acc.nextCapitalCode(db, p.id),
                name: `Owner Capital - ${data.name}`,
                type: "equity"
              });
              update("owners", newId, { capital_account_id: accId });
            }
            return newId;
          });
          audit(ctx, p.id, "create", entity.replace(/s$/, ""), id, data);
          return { id };
        });
        route("PUT", `/api/projects/:pid/:entity(${entityNames})/:id`, "accountant", (ctx) => {
          const p = project(ctx.params.pid);
          const entity = ctx.params.entity;
          const id = Number(ctx.params.id);
          const before = db.prepare(`SELECT * FROM ${entity} WHERE id = ? AND project_id = ?`).get(id, p.id);
          if (!before) throw new HttpError(404, "Not found.");
          const data = cleanFields(db, p.id, ENTITIES[entity], ctx.body, true);
          db.transaction(() => {
            if (entity === "accounts" && data.code && data.code !== before.code && db.prepare("SELECT id FROM accounts WHERE project_id = ? AND code = ?").get(p.id, data.code)) {
              throw new HttpError(400, `Account code ${data.code} already exists.`);
            }
            update(entity, id, data);
            if (entity === "owners" && data.name && data.name !== before.name && before.capital_account_id) {
              update("accounts", before.capital_account_id, { name: `Owner Capital - ${data.name}` });
            }
          });
          audit(ctx, p.id, "update", entity.replace(/s$/, ""), id, diff(before, data));
          return { ok: true };
        });
        route("DELETE", `/api/projects/:pid/:entity(${entityNames})/:id`, "accountant", (ctx) => {
          const p = project(ctx.params.pid);
          const entity = ctx.params.entity;
          const id = Number(ctx.params.id);
          const before = db.prepare(`SELECT * FROM ${entity} WHERE id = ? AND project_id = ?`).get(id, p.id);
          if (!before) throw new HttpError(404, "Not found.");
          try {
            db.transaction(() => {
              db.prepare(`DELETE FROM ${entity} WHERE id = ?`).run(id);
              if (entity === "owners" && before.capital_account_id) {
                db.prepare("DELETE FROM accounts WHERE id = ?").run(before.capital_account_id);
              }
            });
          } catch (e) {
            if (/FOREIGN KEY/i.test(e.message)) {
              throw new HttpError(400, "This record is used by vouchers or other records, so it cannot be deleted. Mark it inactive instead.");
            }
            throw e;
          }
          audit(ctx, p.id, "delete", entity.replace(/s$/, ""), id, before);
          return { ok: true };
        });
        function loadVoucher(pid, id) {
          const v = db.prepare(
            `SELECT v.*, c.name AS contact_name, cu.name AS created_by_name, pu.name AS posted_by_name, un.unit_no
         FROM vouchers v LEFT JOIN contacts c ON c.id = v.contact_id LEFT JOIN units un ON un.id = v.unit_id
         LEFT JOIN users cu ON cu.id = v.created_by LEFT JOIN users pu ON pu.id = v.posted_by
         WHERE v.id = ? AND v.project_id = ?`
          ).get(Number(id), pid);
          if (!v) throw new HttpError(404, "Voucher not found.");
          return v;
        }
        function voucherBody(pid, body) {
          const type = body.type || "JV";
          if (!acc.VOUCHER_TYPES[type]) throw new HttpError(400, "Invalid voucher type.");
          if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || "")) throw new HttpError(400, "Choose a date.");
          const description = String(body.description || "").trim();
          if (!description) throw new HttpError(400, "Description is required.");
          const contactId = body.contact_id ? Number(body.contact_id) : null;
          if (contactId && !db.prepare("SELECT id FROM contacts WHERE id = ? AND project_id = ?").get(contactId, pid)) {
            throw new HttpError(400, "Contact not found.");
          }
          const unitId = body.unit_id ? Number(body.unit_id) : null;
          if (unitId && !db.prepare("SELECT id FROM units WHERE id = ? AND project_id = ?").get(unitId, pid)) {
            throw new HttpError(400, "Unit not found.");
          }
          let checked;
          try {
            checked = acc.validateLines(db, pid, body.lines);
          } catch (e) {
            throw new HttpError(400, e.message);
          }
          return {
            header: {
              type,
              date: body.date,
              description: description.slice(0, 1e3),
              reference: body.reference ? String(body.reference).trim().slice(0, 200) : null,
              contact_id: contactId,
              unit_id: unitId
            },
            lines: checked.lines,
            total: checked.total
          };
        }
        function writeLines(voucherId, lines) {
          db.prepare("DELETE FROM voucher_lines WHERE voucher_id = ?").run(voucherId);
          const ins = db.prepare(
            "INSERT INTO voucher_lines (voucher_id, line_no, account_id, debit, credit, memo, owner_id, building_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
          );
          lines.forEach((l, i) => ins.run(voucherId, i + 1, l.account_id, l.debit, l.credit, l.memo, l.owner_id, l.building_id));
        }
        function nextNumber(pid, type) {
          return db.prepare("SELECT COALESCE(MAX(number), 0) + 1 AS n FROM vouchers WHERE project_id = ? AND type = ?").get(pid, type).n;
        }
        function lockCheck(pid, date) {
          try {
            acc.checkLock(db, pid, date);
          } catch (e) {
            throw new HttpError(400, e.message);
          }
        }
        route("GET", "/api/projects/:pid/vouchers", "viewer", (ctx) => {
          const p = project(ctx.params.pid);
          const q = ctx.query;
          const cond = ["v.project_id = ?"];
          const params = [p.id];
          if (q.status) {
            cond.push("v.status = ?");
            params.push(q.status);
          }
          if (q.type) {
            cond.push("v.type = ?");
            params.push(q.type);
          }
          if (q.from) {
            cond.push("v.date >= ?");
            params.push(q.from);
          }
          if (q.to) {
            cond.push("v.date <= ?");
            params.push(q.to);
          }
          if (q.q) {
            cond.push("(v.description LIKE ? OR v.reference LIKE ? OR c.name LIKE ? OR (v.type || '-' || printf('%04d', v.number)) LIKE ?)");
            const like = `%${q.q}%`;
            params.push(like, like, like, like);
          }
          return db.prepare(
            `SELECT v.*, c.name AS contact_name,
                (SELECT SUM(debit) FROM voucher_lines WHERE voucher_id = v.id) AS total,
                (SELECT COUNT(*) FROM attachments WHERE voucher_id = v.id AND deleted_at IS NULL) AS attachment_count
         FROM vouchers v LEFT JOIN contacts c ON c.id = v.contact_id
         WHERE ${cond.join(" AND ")} ORDER BY v.date DESC, v.id DESC LIMIT 1000`
          ).all(...params);
        });
        route("GET", "/api/projects/:pid/vouchers/:id", "viewer", (ctx) => {
          const p = project(ctx.params.pid);
          const v = loadVoucher(p.id, ctx.params.id);
          v.lines = db.prepare(
            `SELECT l.*, a.code AS account_code, a.name AS account_name, o.name AS owner_name, b.name AS building_name
         FROM voucher_lines l JOIN accounts a ON a.id = l.account_id
         LEFT JOIN owners o ON o.id = l.owner_id LEFT JOIN buildings b ON b.id = l.building_id
         WHERE l.voucher_id = ? ORDER BY l.line_no`
          ).all(v.id);
          v.attachments = db.prepare("SELECT * FROM attachments WHERE voucher_id = ? AND deleted_at IS NULL ORDER BY id").all(v.id);
          v.history = db.prepare("SELECT * FROM audit_log WHERE entity = 'voucher' AND entity_id = ? ORDER BY id").all(v.id);
          return v;
        });
        route("POST", "/api/projects/:pid/vouchers", "accountant", (ctx) => {
          const p = project(ctx.params.pid);
          const { header, lines, total } = voucherBody(p.id, ctx.body);
          const post = !!ctx.body.post;
          if (post) lockCheck(p.id, header.date);
          const id = db.transaction(() => {
            const vid = insert("vouchers", {
              ...header,
              project_id: p.id,
              number: nextNumber(p.id, header.type),
              status: post ? "posted" : "draft",
              created_by: ctx.user.id,
              ...post ? { posted_by: ctx.user.id, posted_at: (/* @__PURE__ */ new Date()).toISOString() } : {}
            });
            writeLines(vid, lines);
            return vid;
          });
          audit(ctx, p.id, post ? "create_and_post" : "create", "voucher", id, { ...header, total, lines: lines.length });
          return { id };
        });
        route("PUT", "/api/projects/:pid/vouchers/:id", "accountant", (ctx) => {
          const p = project(ctx.params.pid);
          const v = loadVoucher(p.id, ctx.params.id);
          if (v.status !== "draft") throw new HttpError(400, "Posted vouchers cannot be edited. Reverse it and create a new one.");
          const { header, lines, total } = voucherBody(p.id, { unit_id: v.unit_id, ...ctx.body, type: v.type });
          db.transaction(() => {
            update("vouchers", v.id, header);
            writeLines(v.id, lines);
          });
          audit(ctx, p.id, "update", "voucher", v.id, { ...diff(v, header), total });
          return { ok: true };
        });
        route("POST", "/api/projects/:pid/vouchers/:id/post", "accountant", (ctx) => {
          const p = project(ctx.params.pid);
          const v = loadVoucher(p.id, ctx.params.id);
          if (v.status !== "draft") throw new HttpError(400, "Only drafts can be posted.");
          lockCheck(p.id, v.date);
          const lines = db.prepare("SELECT * FROM voucher_lines WHERE voucher_id = ?").all(v.id);
          try {
            acc.validateLines(db, p.id, lines);
          } catch (e) {
            throw new HttpError(400, e.message);
          }
          db.prepare("UPDATE vouchers SET status = 'posted', posted_by = ?, posted_at = ? WHERE id = ?").run(
            ctx.user.id,
            (/* @__PURE__ */ new Date()).toISOString(),
            v.id
          );
          audit(ctx, p.id, "post", "voucher", v.id);
          return { ok: true };
        });
        route("POST", "/api/projects/:pid/vouchers/:id/reverse", "accountant", (ctx) => {
          const p = project(ctx.params.pid);
          const v = loadVoucher(p.id, ctx.params.id);
          if (v.status !== "posted") throw new HttpError(400, "Only posted vouchers can be reversed.");
          if (v.reversal_of) throw new HttpError(400, "This voucher is itself a reversal.");
          const date = ctx.body.date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "Invalid date.");
          const reason = String(ctx.body.reason || "").trim();
          if (!reason) throw new HttpError(400, "Give a reason for the reversal.");
          lockCheck(p.id, date);
          const label2 = `${v.type}-${String(v.number).padStart(4, "0")}`;
          const id = db.transaction(() => {
            const rid = insert("vouchers", {
              project_id: p.id,
              type: "JV",
              number: nextNumber(p.id, "JV"),
              date,
              description: `Reversal of ${label2}: ${reason}`.slice(0, 1e3),
              reference: label2,
              contact_id: v.contact_id,
              unit_id: v.unit_id,
              status: "posted",
              reversal_of: v.id,
              created_by: ctx.user.id,
              posted_by: ctx.user.id,
              posted_at: (/* @__PURE__ */ new Date()).toISOString()
            });
            const lines = db.prepare("SELECT * FROM voucher_lines WHERE voucher_id = ? ORDER BY line_no").all(v.id);
            writeLines(rid, lines.map((l) => ({ ...l, debit: l.credit, credit: l.debit })));
            db.prepare("UPDATE vouchers SET status = 'reversed', reversed_by = ? WHERE id = ?").run(rid, v.id);
            return rid;
          });
          audit(ctx, p.id, "reverse", "voucher", v.id, { reason, reversal_voucher_id: id });
          audit(ctx, p.id, "create_and_post", "voucher", id, { reversal_of: label2 });
          return { id };
        });
        route("DELETE", "/api/projects/:pid/vouchers/:id", "accountant", (ctx) => {
          const p = project(ctx.params.pid);
          const v = loadVoucher(p.id, ctx.params.id);
          if (v.status !== "draft") throw new HttpError(400, "Posted vouchers cannot be deleted. Reverse it instead.");
          const atts = db.prepare("SELECT * FROM attachments WHERE voucher_id = ?").all(v.id);
          db.transaction(() => {
            db.prepare("UPDATE attachments SET voucher_id = NULL WHERE voucher_id = ?").run(v.id);
            db.prepare("DELETE FROM vouchers WHERE id = ?").run(v.id);
          });
          audit(ctx, p.id, "delete", "voucher", v.id, { type: v.type, number: v.number, description: v.description, kept_attachments: atts.length });
          return { ok: true };
        });
        route("GET", "/api/projects/:pid/attachments", "viewer", (ctx) => {
          const p = project(ctx.params.pid);
          return db.prepare(
            `SELECT a.*, v.type AS voucher_type, v.number AS voucher_number, u.name AS uploaded_by_name
         FROM attachments a LEFT JOIN vouchers v ON v.id = a.voucher_id LEFT JOIN users u ON u.id = a.uploaded_by
         WHERE a.project_id = ? AND a.deleted_at IS NULL ORDER BY a.id DESC`
          ).all(p.id);
        });
        route("POST", "/api/projects/:pid/attachments", "accountant", (ctx) => {
          const p = project(ctx.params.pid);
          const { filename, mime, data, voucher_id, category, note } = ctx.body;
          if (!filename || !data) throw new HttpError(400, "Choose a file.");
          const buf = Buffer2.from(String(data), "base64");
          if (!buf.length) throw new HttpError(400, "File is empty.");
          if (buf.length > MAX_UPLOAD) throw new HttpError(413, "File is larger than 20 MB.");
          const vid = voucher_id ? Number(voucher_id) : null;
          if (vid) loadVoucher(p.id, vid);
          const id = db.transaction(() => {
            const attId = insert("attachments", {
              project_id: p.id,
              voucher_id: vid,
              category: String(category || "receipt").slice(0, 40),
              filename: String(filename).split(/[\\/]/).pop().slice(0, 200),
              mime: String(mime || "application/octet-stream").slice(0, 100),
              size: buf.length,
              stored_name: "db",
              note: note ? String(note).slice(0, 1e3) : null,
              uploaded_by: ctx.user.id
            });
            const ins = db.prepare("INSERT INTO attachment_chunks (attachment_id, seq, data) VALUES (?, ?, ?)");
            for (let off = 0, seq = 0; off < buf.length; off += CHUNK, seq++) {
              ins.run(attId, seq, new Uint8Array(buf.subarray(off, off + CHUNK)));
            }
            return attId;
          });
          audit(ctx, p.id, "upload", "attachment", id, { filename, voucher_id: vid, category, size: buf.length });
          return { id };
        });
        route("GET", "/api/projects/:pid/attachments/:id/file", "viewer", (ctx) => {
          const p = project(ctx.params.pid);
          const a = db.prepare("SELECT * FROM attachments WHERE id = ? AND project_id = ? AND deleted_at IS NULL").get(Number(ctx.params.id), p.id);
          if (!a) throw new HttpError(404, "File not found.");
          const chunks = db.prepare("SELECT data FROM attachment_chunks WHERE attachment_id = ? ORDER BY seq").all(a.id);
          if (!chunks.length) throw new HttpError(404, "File is missing from storage.");
          const body = new Uint8Array(a.size);
          let off = 0;
          for (const c of chunks) {
            const part = new Uint8Array(c.data);
            body.set(part, off);
            off += part.length;
          }
          const inline = INLINE_MIME.has(a.mime) && ctx.query.download !== "1";
          return new Response(body, { status: 200, headers: {
            "Content-Type": inline ? a.mime : "application/octet-stream",
            "Content-Length": a.size,
            "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(a.filename)}`,
            "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; plugin-types application/pdf",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, max-age=3600"
          } });
        });
        route("DELETE", "/api/projects/:pid/attachments/:id", "accountant", (ctx) => {
          const p = project(ctx.params.pid);
          const a = db.prepare("SELECT * FROM attachments WHERE id = ? AND project_id = ? AND deleted_at IS NULL").get(Number(ctx.params.id), p.id);
          if (!a) throw new HttpError(404, "File not found.");
          if (a.voucher_id) {
            const v = db.prepare("SELECT status FROM vouchers WHERE id = ?").get(a.voucher_id);
            if (v && v.status !== "draft" && ctx.user.role !== "admin") {
              throw new HttpError(403, "Receipts on posted vouchers can only be removed by an admin.");
            }
          }
          db.prepare("UPDATE attachments SET deleted_at = datetime('now') WHERE id = ?").run(a.id);
          audit(ctx, p.id, "delete", "attachment", a.id, { filename: a.filename, voucher_id: a.voucher_id, stored_name: a.stored_name });
          return { ok: true };
        });
        route("GET", "/api/projects/:pid/reports/:name", "viewer", (ctx) => {
          const p = project(ctx.params.pid);
          const { from, to, account_id, building_id } = ctx.query;
          switch (ctx.params.name) {
            case "dashboard":
              return acc.dashboard(db, p.id);
            case "trial-balance":
              return acc.trialBalance(db, p.id, { from, to });
            case "balance-sheet":
              return acc.balanceSheet(db, p.id, { to });
            case "income-statement":
              return acc.incomeStatement(db, p.id, { from, to });
            case "balances":
              return acc.accountBalances(db, p.id, { from, to, buildingId: building_id ? Number(building_id) : null });
            case "owners":
              return acc.ownerStatement(db, p.id, { to });
            case "budget":
              return acc.budgetVsActual(db, p.id);
            case "soa": {
              const soa = acc.statementOfAccount(db, p.id, {
                contactId: Number(ctx.query.contact_id) || null,
                ownerId: Number(ctx.query.owner_id) || null,
                from,
                to
              });
              if (!soa) throw new HttpError(404, "Choose a supplier, buyer or owner.");
              return { ...soa, currency: p.currency, lbp_rate: p.lbp_rate };
            }
            case "ledger": {
              const l = acc.ledger(db, p.id, Number(account_id), { from, to });
              if (!l) throw new HttpError(404, "Account not found.");
              return l;
            }
            default:
              throw new HttpError(404, "Unknown report.");
          }
        });
        route("GET", "/api/projects/:pid/audit", "viewer", (ctx) => {
          const p = project(ctx.params.pid);
          return db.prepare("SELECT * FROM audit_log WHERE project_id = ? ORDER BY id DESC LIMIT 2000").all(p.id);
        });
        route(
          "GET",
          "/api/audit",
          "admin",
          () => db.prepare("SELECT * FROM audit_log WHERE project_id IS NULL ORDER BY id DESC LIMIT 1000").all()
        );
        route("GET", "/api/backup", "admin", (ctx) => {
          const tables = [
            "projects",
            "owners",
            "accounts",
            "contacts",
            "buildings",
            "units",
            "budgets",
            "milestones",
            "vouchers",
            "voucher_lines",
            "attachments",
            "audit_log"
          ];
          const data = { exported_at: (/* @__PURE__ */ new Date()).toISOString(), format: "biyada-backup-v1" };
          for (const t of tables) data[t] = db.prepare(`SELECT * FROM ${t} ORDER BY id`).all();
          data.users = db.prepare("SELECT * FROM users ORDER BY id").all().map(publicUser);
          audit(ctx, null, "backup", "database", null, { tables: tables.length });
          return new Response(JSON.stringify(data, null, 1), { status: 200, headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="biyada-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json"`,
            "Cache-Control": "no-store"
          } });
        });
        async function handle2(request, { ip, secure, localUserId } = {}) {
          const url = new URL(request.url);
          const ctx = { ip, secure, query: Object.fromEntries(url.searchParams), params: {}, body: {}, setCookie: null };
          let response;
          let text = "";
          try {
            if (request.method !== "GET" && request.method !== "HEAD") {
              if (Number(request.headers.get("content-length") || 0) > MAX_BODY) throw new HttpError(413, "Request too large.");
              text = await request.text();
              if (text.length > MAX_BODY) throw new HttpError(413, "Request too large.");
            }
            const pathname = url.pathname.replace(/\/+$/, "");
            let matched = null;
            for (const r of routes) {
              if (r.method !== request.method) continue;
              const m = r.re.exec(pathname);
              if (m) {
                matched = r;
                r.keys.forEach((k, i) => {
                  ctx.params[k] = decodeURIComponent(m[i + 1]);
                });
                break;
              }
            }
            if (!matched) throw new HttpError(404, "Not found.");
            if (request.method !== "GET") {
              if (!String(request.headers.get("content-type") || "").includes("application/json")) {
                throw new HttpError(415, "Expected JSON.");
              }
              try {
                ctx.body = text ? JSON.parse(text) : {};
              } catch {
                throw new HttpError(400, "Invalid JSON.");
              }
            }
            if (matched.minRole) {
              let row;
              if (localUserId) {
                row = db.prepare("SELECT * FROM users WHERE id = ?").get(localUserId);
              } else {
                const token = parseCookies(request.headers.get("cookie")).sid;
                if (!token) throw new HttpError(401, "Please sign in.");
                ctx.tokenHash = sha256(token);
                row = db.prepare("SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?").get(ctx.tokenHash);
                if (!row || row.expires_at < Date.now() || !row.active) throw new HttpError(401, "Please sign in.");
              }
              ctx.user = row;
              if (ROLE_LEVEL[row.role] < ROLE_LEVEL[matched.minRole]) {
                throw new HttpError(403, "You do not have permission to do that.");
              }
              if (row.must_change_password && !["/api/me", "/api/me/password", "/api/logout"].includes(pathname)) {
                throw new HttpError(403, "Please set your own password first.");
              }
              if (row.is_guest) {
                if (!guestEnabled()) throw new HttpError(401, "Guest access is turned off.");
                if (pathname === "/api/me/password") throw new HttpError(403, "Guests cannot change passwords.");
                const pm = /^\/api\/projects\/(\d+)/.exec(pathname);
                if (pm && !db.prepare("SELECT is_demo FROM projects WHERE id = ?").get(Number(pm[1]))?.is_demo) {
                  throw new HttpError(403, "Guests can only use the demo project.");
                }
              }
            }
            const result = await matched.handler(ctx);
            response = result instanceof Response ? result : json(200, result);
          } catch (err) {
            const status = err.status || 500;
            if (status === 500) console.error(err);
            response = json(status, { error: status === 500 ? "Something went wrong on the server." : err.message });
          }
          response.headers.set("X-Content-Type-Options", "nosniff");
          if (ctx.setCookie) response.headers.append("Set-Cookie", ctx.setCookie);
          return response;
        }
        return { handle: handle2 };
      }
      function json(status, body) {
        return new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
        });
      }
      module.exports = { createApi: createApi2 };
    }
  });

  // src/schema.js
  var require_schema = __commonJS({
    "src/schema.js"(exports, module) {
      "use strict";
      var MIGRATIONS = [
        `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer','accountant','admin')),
    password_hash TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE projects (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    location TEXT,
    plot_number TEXT,
    land_area_sqm REAL,
    description TEXT,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'planning',
    start_date TEXT,
    target_completion TEXT,
    total_budget INTEGER NOT NULL DEFAULT 0,
    lock_date TEXT,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE accounts (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('asset','liability','equity','revenue','expense')),
    description TEXT,
    is_cash INTEGER NOT NULL DEFAULT 0,
    is_cost INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    UNIQUE (project_id, code)
  );
  CREATE TABLE owners (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    national_id TEXT,
    address TEXT,
    share_pct REAL NOT NULL DEFAULT 0,
    committed_capital INTEGER NOT NULL DEFAULT 0,
    capital_account_id INTEGER REFERENCES accounts(id),
    joined_date TEXT,
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE contacts (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'supplier',
    phone TEXT,
    email TEXT,
    tax_id TEXT,
    address TEXT,
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE buildings (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'residential',
    floors INTEGER,
    area_sqm REAL,
    status TEXT NOT NULL DEFAULT 'planned',
    progress_pct REAL NOT NULL DEFAULT 0,
    budget INTEGER NOT NULL DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    notes TEXT
  );
  CREATE TABLE units (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    building_id INTEGER REFERENCES buildings(id),
    unit_no TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'apartment',
    floor TEXT,
    area_sqm REAL,
    bedrooms INTEGER,
    list_price INTEGER NOT NULL DEFAULT 0,
    sale_price INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'available',
    buyer_contact_id INTEGER REFERENCES contacts(id),
    sale_date TEXT,
    notes TEXT
  );
  CREATE TABLE budgets (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    building_id INTEGER REFERENCES buildings(id),
    amount INTEGER NOT NULL DEFAULT 0,
    notes TEXT
  );
  CREATE TABLE milestones (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    building_id INTEGER REFERENCES buildings(id),
    title TEXT NOT NULL,
    due_date TEXT,
    done_date TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT
  );
  CREATE TABLE vouchers (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    type TEXT NOT NULL,
    number INTEGER NOT NULL,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    reference TEXT,
    contact_id INTEGER REFERENCES contacts(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','reversed')),
    reversal_of INTEGER REFERENCES vouchers(id),
    reversed_by INTEGER REFERENCES vouchers(id),
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    posted_by INTEGER REFERENCES users(id),
    posted_at TEXT,
    UNIQUE (project_id, type, number)
  );
  CREATE TABLE voucher_lines (
    id INTEGER PRIMARY KEY,
    voucher_id INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    line_no INTEGER NOT NULL,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    debit INTEGER NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit INTEGER NOT NULL DEFAULT 0 CHECK (credit >= 0),
    memo TEXT,
    owner_id INTEGER REFERENCES owners(id),
    building_id INTEGER REFERENCES buildings(id)
  );
  CREATE INDEX idx_lines_voucher ON voucher_lines(voucher_id);
  CREATE INDEX idx_lines_account ON voucher_lines(account_id);
  CREATE INDEX idx_vouchers_project ON vouchers(project_id, date);
  CREATE TABLE attachments (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    voucher_id INTEGER REFERENCES vouchers(id),
    category TEXT NOT NULL DEFAULT 'receipt',
    filename TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    stored_name TEXT NOT NULL,
    note TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY,
    at TEXT NOT NULL DEFAULT (datetime('now')),
    user_id INTEGER,
    user_name TEXT,
    project_id INTEGER,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT
  );
  CREATE INDEX idx_audit_project ON audit_log(project_id, id);
  `,
        `
  CREATE TABLE attachment_chunks (
    attachment_id INTEGER NOT NULL REFERENCES attachments(id),
    seq INTEGER NOT NULL,
    data BLOB NOT NULL,
    PRIMARY KEY (attachment_id, seq)
  );
  `,
        `
  ALTER TABLE projects ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE users ADD COLUMN is_guest INTEGER NOT NULL DEFAULT 0;
  `,
        `
  ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE vouchers ADD COLUMN unit_id INTEGER REFERENCES units(id);
  `,
        `
  ALTER TABLE attachments ADD COLUMN deleted_at TEXT;
  `,
        `
  CREATE TABLE invites (
    id INTEGER PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at INTEGER NOT NULL,
    used_by INTEGER REFERENCES users(id),
    used_at TEXT
  );
  `,
        `
  CREATE TABLE access_links (
    id INTEGER PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    revoked_at TEXT
  );
  `,
        `
  ALTER TABLE projects ADD COLUMN lbp_rate REAL NOT NULL DEFAULT 89500;
  `,
        `
  ALTER TABLE accounts ADD COLUMN is_partner INTEGER NOT NULL DEFAULT 0;
  UPDATE accounts SET is_partner = 1 WHERE code IN ('1100', '1200', '2000', '2100', '2200', '2300');
  `
      ];
      function migrate2(db) {
        db.exec("CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT)");
        const row = db.prepare("SELECT value FROM _meta WHERE key = 'schema_version'").get();
        const current = row ? Number(row.value) : 0;
        for (let v = current; v < MIGRATIONS.length; v++) {
          db.transaction(() => {
            for (const stmt of MIGRATIONS[v].split(/;\s*\n/)) {
              if (stmt.trim()) db.exec(stmt);
            }
            db.prepare("INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', ?)").run(String(v + 1));
          });
        }
      }
      module.exports = { migrate: migrate2 };
    }
  });

  // src/browser/sqljs-adapter.js
  var require_sqljs_adapter = __commonJS({
    "src/browser/sqljs-adapter.js"(exports, module) {
      "use strict";
      var norm = (p) => p.map((v) => v === void 0 ? null : typeof v === "boolean" ? Number(v) : v);
      function adapter2(database) {
        return {
          prepare(sql) {
            const rows = (params) => {
              const st = database.prepare(sql);
              try {
                st.bind(norm(params));
                const out = [];
                while (st.step()) out.push(st.getAsObject());
                return out;
              } finally {
                st.free();
              }
            };
            return {
              get: (...p) => rows(p)[0],
              all: (...p) => rows(p),
              run: (...p) => {
                database.run(sql, norm(p));
                const changes = database.getRowsModified();
                const id = database.exec("SELECT last_insert_rowid()")[0].values[0][0];
                return { changes, lastInsertRowid: Number(id) };
              }
            };
          },
          exec: (sql) => {
            database.exec(sql);
          },
          transaction(fn) {
            database.exec("BEGIN IMMEDIATE");
            try {
              const result = fn();
              database.exec("COMMIT");
              return result;
            } catch (err) {
              database.exec("ROLLBACK");
              throw err;
            }
          }
        };
      }
      module.exports = { adapter: adapter2 };
    }
  });

  // src/browser/backend.js
  var { createApi } = require_api();
  var { migrate } = require_schema();
  var { adapter } = require_sqljs_adapter();
  var IDB_NAME = "biyada-estate";
  var IDB_STORE = "data";
  var IDB_KEY = "database";
  var SQLITE_HEADER = "SQLite format 3\0";
  function idb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbRun(mode, fn) {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const t = db.transaction(IDB_STORE, mode);
      const req = fn(t.objectStore(IDB_STORE));
      t.oncomplete = () => resolve(req && req.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error("Saving was interrupted."));
    });
  }
  var idbGet = (key) => idbRun("readonly", (s) => s.get(key));
  var idbPut = (key, value) => idbRun("readwrite", (s) => s.put(value, key));
  var SQL;
  var raw;
  var api;
  var userId;
  var saveTimer = null;
  var saving = Promise.resolve();
  var listeners = [];
  function load(bytes) {
    const database = bytes ? new SQL.Database(bytes) : new SQL.Database();
    database.exec("PRAGMA foreign_keys = ON");
    const db = adapter(database);
    migrate(db);
    let user = db.prepare("SELECT id FROM users WHERE is_guest = 0 AND role = 'admin' AND active = 1 ORDER BY id LIMIT 1").get();
    if (!user) {
      const id = db.prepare("INSERT INTO users (username, name, role, password_hash) VALUES ('me', 'Me', 'admin', '!')").run().lastInsertRowid;
      user = { id };
    }
    db.prepare("INSERT OR REPLACE INTO _meta (key, value) VALUES ('guest_enabled', '0')").run();
    return { database, db, userId: user.id };
  }
  function exportBytes() {
    const bytes = raw.export();
    raw.exec("PRAGMA foreign_keys = ON");
    return bytes;
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = null;
    const bytes = exportBytes();
    saving = saving.then(() => idbPut(IDB_KEY, bytes)).catch((err) => {
      console.error(err);
      listeners.forEach((fn) => fn({ type: "save-error", error: err }));
    });
    return saving;
  }
  function changed() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 300);
    listeners.forEach((fn) => fn({ type: "change" }));
  }
  async function handle(request) {
    const res = await api.handle(request, { ip: "this device", secure: false, localUserId: userId });
    if (request.method !== "GET" && res.ok) changed();
    return res;
  }
  async function restore(bytes) {
    const head = new TextDecoder().decode(bytes.slice(0, 16));
    if (head !== SQLITE_HEADER) throw new Error("This is not a Biyada Estate backup file.");
    let loaded;
    try {
      loaded = load(bytes);
      loaded.db.prepare("SELECT COUNT(*) AS n FROM projects").get();
    } catch (err) {
      throw new Error(`This backup file could not be opened (${err.message}).`);
    }
    if (raw) raw.close();
    ({ database: raw, userId } = loaded);
    api = createApi({ db: loaded.db });
    await save();
  }
  async function storageInfo() {
    const out = { persisted: null, usage: null, quota: null };
    if (navigator.storage) {
      if (navigator.storage.persisted) out.persisted = await navigator.storage.persisted();
      if (navigator.storage.estimate) Object.assign(out, await navigator.storage.estimate());
    }
    return out;
  }
  var ready = (async () => {
    if (typeof initSqlJs !== "function") throw new Error("The database engine did not load.");
    SQL = await initSqlJs({ locateFile: (f) => new URL(f, document.baseURI).href });
    const bytes = await idbGet(IDB_KEY);
    const loaded = load(bytes ? new Uint8Array(bytes) : null);
    ({ database: raw, userId } = loaded);
    api = createApi({ db: loaded.db });
    if (!bytes) await save();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {
    });
  })();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && saveTimer) save();
  });
  window.addEventListener("pagehide", () => {
    if (saveTimer) save();
  });
  window.LocalBackend = {
    ready,
    handle,
    backupBytes: () => exportBytes(),
    restore,
    flush: () => saveTimer ? save() : saving,
    onChange: (fn) => listeners.push(fn),
    // Small key/value store for device settings (e.g. the linked Excel file).
    getSetting: (key) => idbGet(`setting:${key}`),
    setSetting: (key, value) => idbPut(`setting:${key}`, value),
    storageInfo
  };
})();
