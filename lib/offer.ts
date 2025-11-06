import { getServerClient } from "@/lib/supabase/server";

/**
 * Retorna orgId da oferta, validado pela RLS.
 * ÚNICA fonte para org_id nas Server Actions.
 */
export async function getOfferOrgId(offerId: string): Promise<string> {
  if (!offerId) {
    console.error("[GET_OFFER_ORGID_MISSING]", { offerId });
    throw new Error("offerId ausente.");
  }

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema("offers")
    .from("offers")
    .select("org_id")
    .eq("id", offerId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[GET_OFFER_ORGID_ERROR]", { offerId, error });
    throw new Error(error.message);
  }

  if (!data?.org_id) {
    console.error("[GET_OFFER_ORGID_NOT_FOUND]", { offerId });
    throw new Error("Oferta não encontrada ou sem org_id.");
  }

  return data.org_id;
}

/**
 * Retorna userId autenticado.
 * Para logs e validação nas Server Actions.
 */
export async function getAuthUserId(): Promise<string> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error("[GET_USER_ERROR]", error);
    throw new Error(error.message);
  }
  
  if (!data?.user) {
    console.error("[GET_USER_NOT_FOUND]");
    throw new Error("Usuário não autenticado.");
  }
  
  return data.user.id;
}

