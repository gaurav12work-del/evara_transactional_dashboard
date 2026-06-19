import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const HomePage = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
};

export default HomePage;
