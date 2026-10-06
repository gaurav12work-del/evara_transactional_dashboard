// One-off: move the client's login to a new email address.
// Every row is linked to the account's user id, not its email, so all data stays attached.
//
//   node scripts/change-login-email.mjs <current-email> <new-email>           dry run, changes nothing
//   node scripts/change-login-email.mjs <current-email> <new-email> --apply   makes the change
//
// Reads the project URL from .env and SUPABASE_SECRET_KEY (+ optional NEW_PASSWORD) from .env.migration.
import { createClient } from "@supabase/supabase-js";

const TABLES = [
  "properties",
  "transactions",
  "investments",
  "monthly_balances",
  "income_categories",
  "expense_categories",
  "investment_categories",
];

const fail = (message) => {
  throw new Error(message);
};

const sameEmail = (a, b) => a?.toLowerCase() === b.toLowerCase();

const main = async () => {
  process.loadEnvFile(".env");
  process.loadEnvFile(".env.migration");

  const [from, to] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const apply = process.argv.includes("--apply");
  if (!from || !to) fail("Usage: node scripts/change-login-email.mjs <current-email> <new-email> [--apply]");

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const countRows = async (userId) => {
    const counts = {};
    for (const table of TABLES) {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) fail(`Counting ${table} failed: ${error.message}`);
      counts[table] = count;
    }
    return counts;
  };

  // ponytail: reads one page of 1000 accounts; this project only has a handful.
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) fail(`Could not list accounts (is SUPABASE_SECRET_KEY the secret / service_role key?): ${error.message}`);

  const user = data.users.find((u) => sameEmail(u.email, from));
  if (!user) fail(`No account uses ${from}. Accounts in this project: ${data.users.map((u) => u.email).join(", ")}`);
  if (data.users.some((u) => sameEmail(u.email, to))) {
    fail(`${to} already has its own account, so it can't be renamed onto. Nothing was changed.`);
  }

  console.log(`Account ${user.id}: ${user.email} -> ${to}`);
  console.table(await countRows(user.id));

  if (!apply) return console.log("Dry run: nothing changed. Re-run with --apply to switch the email.");

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    email: to,
    email_confirm: true,
    ...(process.env.NEW_PASSWORD && { password: process.env.NEW_PASSWORD }),
  });
  if (updateError) fail(`Update failed, nothing was changed: ${updateError.message}`);

  const { data: after, error: fetchError } = await supabase.auth.admin.getUserById(user.id);
  if (fetchError) fail(`Updated, but re-reading the account failed: ${fetchError.message}`);
  if (!sameEmail(after.user.email, to)) fail(`Account still shows ${after.user.email}. Check the Supabase dashboard.`);

  console.log(
    `Done. Login is now ${after.user.email}` +
      (process.env.NEW_PASSWORD ? " with the new password." : " (password unchanged).")
  );
  console.table(await countRows(user.id));
};

// No process.exit(): on Windows it can crash Node while fetch sockets are still closing.
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
