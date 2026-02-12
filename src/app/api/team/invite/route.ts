import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json(
        { error: "Ej inloggad." },
        { status: 401 },
      );
    }

    // Get current user's profile and verify admin role
    const { data: currentUser } = await supabase
      .from("users")
      .select("tenant_id, role")
      .eq("id", authUser.id)
      .single();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Användarprofil saknas." },
        { status: 400 },
      );
    }

    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Endast administratörer kan bjuda in medlemmar." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { email, fullName, role } = body as {
      email: string;
      fullName: string;
      role: "admin" | "agent";
    };

    if (!email || !fullName) {
      return NextResponse.json(
        { error: "E-post och namn krävs." },
        { status: 400 },
      );
    }

    if (role !== "admin" && role !== "agent") {
      return NextResponse.json(
        { error: "Ogiltig roll." },
        { status: 400 },
      );
    }

    // Check if user already exists in this tenant
    const { data: existingMember } = await supabase
      .from("users")
      .select("id")
      .eq("tenant_id", currentUser.tenant_id)
      .eq("email", email)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: "Användaren är redan medlem i organisationen." },
        { status: 409 },
      );
    }

    // Use admin client to create user (invite via email)
    const adminClient = createAdminClient();
    const tempPassword = crypto.randomUUID();

    const { data: newAuthUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          invited_to_tenant: currentUser.tenant_id,
        },
      });

    if (createError) {
      // If user already exists in auth, get them and link to tenant
      if (createError.message.includes("already been registered")) {
        const { data: existingUsers } =
          await adminClient.auth.admin.listUsers();
        const existingAuthUser = existingUsers?.users.find(
          (u) => u.email === email,
        );

        if (existingAuthUser) {
          // Check if they already have a profile in another tenant
          const { data: existingProfile } = await adminClient
            .from("users")
            .select("id, tenant_id")
            .eq("id", existingAuthUser.id)
            .single();

          if (existingProfile) {
            return NextResponse.json(
              {
                error:
                  "Användaren tillhör redan en annan organisation.",
              },
              { status: 409 },
            );
          }

          // Create user profile linked to this tenant
          const { error: insertError } = await adminClient
            .from("users")
            .insert({
              id: existingAuthUser.id,
              tenant_id: currentUser.tenant_id,
              role,
              full_name: fullName,
              email,
            });

          if (insertError) {
            return NextResponse.json(
              { error: "Kunde inte koppla användaren: " + insertError.message },
              { status: 500 },
            );
          }

          // Audit log
          await adminClient.from("audit_logs").insert({
            tenant_id: currentUser.tenant_id,
            actor_user_id: authUser.id,
            action: "user.invited",
            entity_type: "user",
            entity_id: existingAuthUser.id,
            metadata_json: { email, role, full_name: fullName },
          });

          return NextResponse.json({
            success: true,
            message: "Användaren har kopplats till organisationen.",
          });
        }
      }

      return NextResponse.json(
        { error: "Kunde inte skapa användare: " + createError.message },
        { status: 500 },
      );
    }

    if (!newAuthUser.user) {
      return NextResponse.json(
        { error: "Kunde inte skapa användare." },
        { status: 500 },
      );
    }

    // Create user profile linked to tenant
    const { error: insertError } = await adminClient.from("users").insert({
      id: newAuthUser.user.id,
      tenant_id: currentUser.tenant_id,
      role,
      full_name: fullName,
      email,
    });

    if (insertError) {
      // Clean up auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(newAuthUser.user.id);
      return NextResponse.json(
        { error: "Kunde inte skapa profil: " + insertError.message },
        { status: 500 },
      );
    }

    // Send password reset email so the invited user can set their own password
    await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    // Audit log
    await adminClient.from("audit_logs").insert({
      tenant_id: currentUser.tenant_id,
      actor_user_id: authUser.id,
      action: "user.invited",
      entity_type: "user",
      entity_id: newAuthUser.user.id,
      metadata_json: { email, role, full_name: fullName },
    });

    return NextResponse.json({
      success: true,
      message: "Inbjudan har skickats.",
    });
  } catch (err) {
    console.error("Team invite error:", err);
    return NextResponse.json(
      { error: "Ett oväntat fel uppstod." },
      { status: 500 },
    );
  }
}
